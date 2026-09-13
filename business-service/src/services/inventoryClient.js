const http = require('http');
const https = require('https');

const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-secret-key-naya-nava-vyapaar';

/**
 * Get inventory data for multiple products by their IDs
 * @param {number} businessId - The business ID
 * @param {number[]} productIds - Array of product IDs to fetch inventory for
 * @returns {Promise<Object>} Map of productId to inventory data
 */
const getInventoryByProducts = async (businessId, productIds) => {
  try {
    if (!productIds || productIds.length === 0) {
      return {};
    }

    // Create a map to store inventory data by productId
    const inventoryMap = {};

    // Fetch inventory data for each product
    for (const productId of productIds) {
      try {
        const result = await new Promise((resolve, reject) => {
          const url = new URL(`${INVENTORY_SERVICE_URL}/internal/inventory/${productId}?businessId=${businessId}`);
          const transport = url.protocol === 'https:' ? https : http;

          const req = transport.request({
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const parsedData = JSON.parse(data);
                resolve({ statusCode: res.statusCode, data: parsedData });
              } catch (parseError) {
                reject(parseError);
              }
            });
          });

          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });

          req.on('error', (err) => {
            reject(err);
          });

          req.end();
        });

        if (result.statusCode >= 200 && result.statusCode < 300 && 
            result.data && result.data.status === 'success' && result.data.inventory) {
          const inventory = result.data.inventory;
          inventoryMap[productId] = {
            currentStock: inventory.currentStock || 0,
            lowStock: inventory.isLowStock || false
          };
        } else {
          // No inventory record found or error response, set defaults
          inventoryMap[productId] = {
            currentStock: 0,
            lowStock: false
          };
        }
      } catch (productError) {
        // If individual product fails, set defaults
        console.warn(`Failed to fetch inventory for product ${productId}:`, productError.message);
        inventoryMap[productId] = {
          currentStock: 0,
          lowStock: false
        };
      }
    }

    return inventoryMap;
  } catch (error) {
    console.error('Error fetching inventory data:', error.message);
    // Return empty map on service failure - don't break product listing
    return {};
  }
};

module.exports = {
  getInventoryByProducts
};