const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * InventoryClient - Reusable HTTP(S) client with connection pooling and retry logic
 * 
 * This client maintains HTTP/HTTPS agent pools with keepAlive enabled for efficient
 * connection reuse across requests to the inventory service. It implements configurable
 * timeouts and exponential backoff retry logic for transient failures.
 * 
 * Exported as singleton to ensure agents are reused across all requests.
 */
class InventoryClient {
  /**
   * Initialize InventoryClient with connection pooling and retry configuration
   * 
   * @param {Object} options - Configuration options
   * @param {number} [options.maxRetries=2] - Maximum number of retries for transient failures
   */
  constructor(options = {}) {
    this.baseUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';
    this.timeout = parseInt(process.env.INTER_SERVICE_TIMEOUT_MS) || 10000;
    this.maxRetries = options.maxRetries || 2;

    /**
     * HTTP Agent with connection pooling (keepAlive enabled)
     * Maintains up to 50 concurrent connections with 10 free sockets
     */
    this.httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: this.timeout,
    });

    /**
     * HTTPS Agent with connection pooling (keepAlive enabled)
     * Maintains up to 50 concurrent connections with 10 free sockets
     */
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: this.timeout,
      // For production with self-signed or mismatched certs, adjust as needed
      // rejectUnauthorized: process.env.NODE_ENV !== 'production',
    });
  }

  /**
   * Deduct stock from the inventory service
   * 
   * This is the primary public method for deducting inventory items. It sends a POST
   * request to the inventory service with retry logic for transient failures.
   * 
   * @param {number} businessId - The business ID associated with the invoice
   * @param {string} billNo - The bill number from the invoice
   * @param {Array<Object>} items - Array of items to deduct
   * @param {string} items[].productId - The product ID to deduct
   * @param {number} items[].qty - The quantity to deduct
   * @returns {Promise<Object>} Response from the inventory service
   * @throws {Error} Throws error if all retries fail or permanent error occurs
   * 
   * @example
   * await inventoryClient.deductStock(123, 'INV-2024-01-01-12345', [
   *   { productId: 'prod-1', qty: 5 },
   *   { productId: 'prod-2', qty: 10 }
   * ]);
   */
  async deductStock(businessId, billNo, items) {
    return this._requestWithRetry(
      'POST',
      '/internal/deduct-stock',
      {
        businessId,
        billNo,
        items,
      },
      0
    );
  }

  /**
   * Internal method: Execute request with exponential backoff retry logic
   * 
   * Implements retry mechanism for transient failures with exponential backoff:
   * - First retry: 100ms delay (2^0 * 100)
   * - Second retry: 200ms delay (2^1 * 100)
   * 
   * @private
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param {string} endpoint - API endpoint path
   * @param {Object} data - Request payload
   * @param {number} attemptNum - Current attempt number (0 for initial, increments for retries)
   * @returns {Promise<Object>} Response data
   * @throws {Error} Throws error if all retries exhausted or permanent error
   */
  async _requestWithRetry(method, endpoint, data, attemptNum) {
    try {
      return await this._makeRequest(method, endpoint, data);
    } catch (err) {
      // Retry if we haven't exhausted retries and error is retryable
      if (attemptNum < this.maxRetries && this._isRetryable(err)) {
        const backoffMs = Math.pow(2, attemptNum) * 100; // 100ms, 200ms, etc.
        console.warn(
          `[InventoryClient] Retrying ${endpoint} (attempt ${attemptNum + 2}/${this.maxRetries + 1}) ` +
          `after ${backoffMs}ms due to: ${err.message}`
        );
        await this._delay(backoffMs);
        return this._requestWithRetry(method, endpoint, data, attemptNum + 1);
      }
      // Permanent error or retries exhausted - throw error
      throw err;
    }
  }

  /**
   * Internal method: Make actual HTTP request to inventory service
   * 
   * Handles the low-level HTTP(S) request mechanics including:
   * - Proper agent selection based on protocol
   * - Timeout handling
   * - Response parsing
   * - Error classification
   * 
   * @private
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint path
   * @param {Object} data - Request payload to send
   * @returns {Promise<Object>} Parsed JSON response
   * @throws {Error} Throws error with statusCode and isRetryable flag
   */
  async _makeRequest(method, endpoint, data) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;
      const agent = isHttps ? this.httpsAgent : this.httpAgent;

      const payload = JSON.stringify(data);

      const req = transport.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          agent,
          timeout: this.timeout,
        },
        (res) => {
          let responseData = '';

          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            // Success: 2xx status codes
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(responseData || '{}'));
              } catch (parseErr) {
                const err = new Error('Failed to parse inventory service response');
                err.statusCode = res.statusCode;
                err.isRetryable = false;
                reject(err);
              }
            } else {
              // Error: Non-2xx status codes
              const err = new Error(
                `Inventory service returned ${res.statusCode}: ${responseData}`
              );
              err.statusCode = res.statusCode;
              // 5xx errors are retryable; 4xx are permanent
              err.isRetryable = res.statusCode >= 500;
              reject(err);
            }
          });
        }
      );

      // Handle timeout errors
      req.on('timeout', () => {
        const err = new Error('Inventory service request timeout');
        err.code = 'ETIMEDOUT';
        err.isRetryable = true;
        req.destroy();
        reject(err);
      });

      // Handle network errors (connection refused, DNS failures, etc.)
      req.on('error', (err) => {
        // Network errors are retryable
        err.isRetryable = true;
        reject(err);
      });

      // Send request payload and end the request
      req.write(payload);
      req.end();
    });
  }

  /**
   * Internal method: Determine if an error is retryable
   * 
   * Classifies errors as retryable or permanent:
   * 
   * **Retryable errors:**
   * - Network errors: ECONNREFUSED (connection refused), ETIMEDOUT (timeout)
   * - Server errors: 5xx status codes
   * 
   * **Non-retryable errors:**
   * - Client errors: 4xx status codes
   * - Explicit isRetryable=false flag
   * 
   * @private
   * @param {Error} err - Error object to classify
   * @returns {boolean} True if error is retryable, false otherwise
   */
  _isRetryable(err) {
    // Check explicit isRetryable flag if set
    if (err.isRetryable !== undefined) {
      return err.isRetryable;
    }

    // Connection refused - retryable (service may be temporarily down)
    if (err.code === 'ECONNREFUSED') {
      return true;
    }

    // Timeout - retryable (service may be slow)
    if (err.code === 'ETIMEDOUT') {
      return true;
    }

    // 5xx errors are retryable (server error, not client error)
    if (err.statusCode >= 500) {
      return true;
    }

    // Default to non-retryable (client errors, unknown errors)
    return false;
  }

  /**
   * Internal method: Delay execution for exponential backoff
   * 
   * Utility function to pause execution for a specified duration.
   * Used between retry attempts to avoid overwhelming the service.
   * 
   * @private
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>} Promise that resolves after delay
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Export singleton instance
 * 
 * The InventoryClient is exported as a singleton to ensure HTTP/HTTPS agents
 * are reused across all requests. This improves performance through:
 * - Connection pooling (keepAlive)
 * - TCP connection reuse
 * - Reduced handshake overhead
 * 
 * @type {InventoryClient}
 */
module.exports = new InventoryClient();
