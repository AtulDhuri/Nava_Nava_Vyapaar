const http = require('http');
const https = require('https');
const { URL } = require('url');

const BUSINESS_SERVICE_URL = process.env.BUSINESS_SERVICE_URL || 'http://localhost:3002';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-secret-key-naya-nava-vyapaar';
const REQUEST_TIMEOUT_MS = parseInt(process.env.INTER_SERVICE_TIMEOUT_MS) || 5000;

/**
 * Resolve business-service product ids (numeric PK, e.g. 111) to their
 * productCode SKUs (e.g. "P001") in a SINGLE batch request.
 *
 * Inventory keys its records by productCode, but invoice items frequently carry
 * the numeric product id. Billing uses this to translate id -> code before
 * calling inventory to deduct stock.
 *
 * This is best-effort: on any failure (service down, timeout, bad response) it
 * resolves to an empty map so the caller can fall back gracefully instead of
 * blocking invoice creation.
 *
 * @param {number} businessId - The business ID
 * @param {Array<number|string>} productIds - Numeric product ids to resolve
 * @returns {Promise<Object>} Map of productId(string) -> productCode(string)
 */
const resolveProductCodes = (businessId, productIds) => new Promise((resolve) => {
  if (!productIds || productIds.length === 0) {
    return resolve({});
  }

  let url;
  try {
    url = new URL(`${BUSINESS_SERVICE_URL}/internal/products/resolve-codes`);
  } catch (err) {
    console.warn(`Invalid BUSINESS_SERVICE_URL, skipping code resolution: ${err.message}`);
    return resolve({});
  }

  const isHttps = url.protocol === 'https:';
  const transport = isHttps ? https : http;
  const payload = JSON.stringify({ businessId: parseInt(businessId), productIds });

  const req = transport.request(
    {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-api-key': INTERNAL_API_KEY,
      },
      timeout: REQUEST_TIMEOUT_MS,
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (
            res.statusCode >= 200 && res.statusCode < 300 &&
            parsed && parsed.status === 'success' && parsed.codes
          ) {
            resolve(parsed.codes);
          } else {
            console.warn(`Business code resolution returned unusable response (status ${res.statusCode})`);
            resolve({});
          }
        } catch (parseError) {
          console.warn(`Failed to parse business code resolution response: ${parseError.message}`);
          resolve({});
        }
      });
    }
  );

  req.on('timeout', () => {
    req.destroy();
    console.warn('Business code resolution request timed out');
    resolve({});
  });

  req.on('error', (err) => {
    console.warn(`Business code resolution request failed: ${err.message}`);
    resolve({});
  });

  req.write(payload);
  req.end();
});

module.exports = { resolveProductCodes };
