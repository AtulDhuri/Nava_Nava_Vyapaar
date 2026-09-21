# Design: Fix inventoryDeducted False in Production

## Architecture Decision

Instead of inline HTTP request handling in the billing controller, create a reusable **InventoryServiceClient** utility that:
1. Maintains HTTP/HTTPS Agent pools with keepAlive enabled
2. Implements configurable timeouts and retry logic
3. Provides consistent error handling and logging
4. Can be reused by other services (business-service already has manual HTTPS calls)

## Implementation Plan

### 1. Create `inventoryClient.js` (Billing Service)

**Location**: `billing-service/src/services/inventoryClient.js`

```javascript
// Reusable HTTP(S) client with connection pooling and retry logic
class InventoryClient {
  constructor(options = {}) {
    this.baseUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';
    this.timeout = parseInt(process.env.INTER_SERVICE_TIMEOUT_MS) || 10000;
    this.maxRetries = options.maxRetries || 2;
    
    // Initialize HTTP/HTTPS agents with connection pooling
    this.httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: this.timeout,
    });
    
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: this.timeout,
      // For Onrender/production: allow self-signed or mismatched certs if needed
      // rejectUnauthorized: process.env.NODE_ENV !== 'production',
    });
  }

  // Core method: deductStock with retry logic
  async deductStock(businessId, billNo, items) {
    return this._requestWithRetry('POST', '/internal/deduct-stock', {
      businessId,
      billNo,
      items,
    }, 0);
  }

  // Private: retry wrapper with exponential backoff
  async _requestWithRetry(method, endpoint, data, attemptNum) {
    try {
      return await this._makeRequest(method, endpoint, data);
    } catch (err) {
      if (attemptNum < this.maxRetries && this._isRetryable(err)) {
        const backoffMs = Math.pow(2, attemptNum) * 100; // 100ms, 200ms, etc.
        console.warn(
          `[InventoryClient] Retrying ${endpoint} (attempt ${attemptNum + 2}/${this.maxRetries + 1}) ` +
          `after ${backoffMs}ms due to: ${err.message}`
        );
        await this._delay(backoffMs);
        return this._requestWithRetry(method, endpoint, data, attemptNum + 1);
      }
      throw err;
    }
  }

  // Private: make actual HTTP request
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
          res.on('data', (chunk) => (responseData += chunk));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(responseData || '{}'));
            } else {
              const err = new Error(
                `Inventory service returned ${res.statusCode}: ${responseData}`
              );
              err.statusCode = res.statusCode;
              err.isRetryable = res.statusCode >= 500; // Retry only 5xx errors
              reject(err);
            }
          });
        }
      );

      req.on('timeout', () => {
        const err = new Error('Inventory service request timeout');
        err.isRetryable = true;
        req.destroy();
        reject(err);
      });

      req.on('error', (err) => {
        err.isRetryable = true; // Network errors are retryable
        reject(err);
      });

      req.write(payload);
      req.end();
    });
  }

  // Private: check if error is retryable
  _isRetryable(err) {
    if (err.isRetryable !== undefined) return err.isRetryable;
    if (err.code === 'ECONNREFUSED') return true;
    if (err.code === 'ETIMEDOUT') return true;
    if (err.statusCode >= 500) return true; // 5xx errors are retryable
    return false;
  }

  // Private: utility delay
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new InventoryClient();
```

### 2. Update `billingController.js`

Replace the inline HTTP request code with call to the client:

```javascript
// At top of file
const inventoryClient = require('../services/inventoryClient');

// Inside createInvoice, replace lines 90-149 with:
// Soft-failure inventory deduction — billing must never be blocked
let inventoryDeducted = false;
let inventoryError = null;

try {
  const inventoryItems = items
    .filter((item) => item.productId)
    .map((item) => ({ productId: item.productId, qty: parseInt(item.qty) }));

  if (process.env.INVENTORY_SERVICE_URL && inventoryItems.length > 0) {
    await inventoryClient.deductStock(parseInt(businessId), savedInvoice.billNo, inventoryItems);
    inventoryDeducted = true;
  }
} catch (invErr) {
  inventoryError = invErr.message || 'Inventory service unavailable — stock not deducted';
  console.error('[Billing] Inventory deduction failed:', {
    billNo: savedInvoice.billNo,
    businessId,
    error: invErr.message,
    stack: invErr.stack,
  });
}

return res.status(201).json({
  status: 'success',
  statusMessage: 'Invoice created successfully',
  displayMessage: `Invoice ${savedInvoice.billNo} created successfully`,
  invoice: { ...savedInvoice, items: itemsWithInvoice },
  inventoryDeducted,
  ...(inventoryError && { inventoryError }),
});
```

### 3. Update `.env.prod`

```env
# Existing config...
INTER_SERVICE_TIMEOUT_MS=10000
```

### 4. Update `business-service/src/services/inventoryClient.js`

Refactor to use same connection pooling pattern (if business-service also needs this fix).

## Testing Strategy

### Unit Tests
- Test retry logic with simulated failures
- Test backoff timing
- Test non-retryable error handling (4xx errors)

### Integration Tests  
- Create mock inventory service with configurable delays
- Simulate 5-10s latency to verify timeout handling
- Simulate transient failures (first call fails, second succeeds)

### Production Validation
- Monitor logs for retry counts and latency metrics
- Compare `inventoryDeducted: true` rate before/after fix
- Check connection pool usage via Node.js metrics

## Rollout Plan

1. ✅ Deploy updated billing-service with new inventoryClient
2. ✅ Monitor logs and inventory deduction success rate
3. ✅ If successful, apply same pattern to business-service
4. ✅ Document the pattern for future inter-service calls

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Increased memory from connection pools | Monitor with reasonable pool limits (maxSockets: 50) |
| Retry loop causes cascading failures | Only retry transient errors; fail fast on 4xx |
| Production timeout still too short | Make configurable; start with 10s, adjust based on metrics |
| SSL certificate issues | Test thoroughly in staging first |
