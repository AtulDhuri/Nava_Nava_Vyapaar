const http = require('http');
const https = require('https');
const { URL } = require('url');

const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-secret-key-naya-nava-vyapaar';

// One request for the whole product list, so a page of 100+ products no longer
// fans out into 100+ HTTP calls. Generous timeout since it's a single request.
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Get inventory data for multiple products in a SINGLE batch request.
 *
 * Calls inventory-service POST /internal/inventory/batch once with all product
 * IDs and receives a map back. Inventory is an enrichment, never a hard
 * dependency: on any failure (service down, timeout, bad response) this resolves
 * to an empty map so the caller can apply zero defaults and still return the
 * full product list.
 *
 * @param {number} businessId - The business ID
 * @param {Array<number|string>} productIds - Product IDs to fetch inventory for
 * @returns {Promise<Object>} Map of productId -> { currentStock, lowStockThreshold, lowStock }
 */
const getInventoryByProducts = (businessId, productIds) => new Promise((resolve) => {
  if (!productIds || productIds.length === 0) {
    return resolve({});
  }

  let url;
  try {
    url = new URL(`${INVENTORY_SERVICE_URL}/internal/inventory/batch`);
  } catch (err) {
    console.warn(`Invalid INVENTORY_SERVICE_URL, skipping inventory enrichment: ${err.message}`);
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
            parsed && parsed.status === 'success' && parsed.inventory
          ) {
            // Normalize the service's map into the shape the controller expects.
            const map = {};
            for (const [productId, inv] of Object.entries(parsed.inventory)) {
              map[productId] = {
                // Coerce to Number: the inventory service may serialize these
                // from numeric/decimal DB columns as strings. Consumers expect
                // numbers, so normalize here. Number(undefined/null) -> NaN, so
                // guard with || 0.
                currentStock: Number(inv.currentStock) || 0,
                lowStockThreshold: Number(inv.lowStockThreshold) || 0,
                lowStock: inv.isLowStock || false,
              };
            }
            resolve(map);
          } else {
            // Reached inventory but response wasn't usable — no enrichment.
            resolve({});
          }
        } catch (parseError) {
          console.warn(`Failed to parse inventory batch response: ${parseError.message}`);
          resolve({});
        }
      });
    }
  );

  req.on('timeout', () => {
    req.destroy();
    console.warn('Inventory batch request timed out — returning products without live stock');
    resolve({});
  });

  req.on('error', (err) => {
    console.warn(`Inventory batch request failed: ${err.message} — returning products without live stock`);
    resolve({});
  });

  req.write(payload);
  req.end();
});

module.exports = {
  getInventoryByProducts
};
