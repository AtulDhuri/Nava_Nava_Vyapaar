const { deductStock: deductStockService, getByProduct, getByProducts } = require("../services/inventoryService");
const { errorResponse } = require("../utils/responseHandler");

// ---------------------------------------------------------------------------
// POST /internal/deduct-stock
// Called by billing-service after committing a new invoice.
// No JWT — secured by network placement only.
// ---------------------------------------------------------------------------
const deductStock = async (req, res) => {
  const { businessId, billNo, items } = req.body;

  if (!businessId || !Number.isInteger(Number(businessId)) || Number(businessId) <= 0) {
    return res.status(400).json({
      status: "error",
      statusMessage: "businessId must be a positive integer",
      displayMessage: "Please provide a valid business ID",
    });
  }

  if (!billNo || typeof billNo !== "string" || billNo.trim() === "") {
    return res.status(400).json({
      status: "error",
      statusMessage: "billNo must be a non-empty string",
      displayMessage: "Please provide a valid bill number",
    });
  }

  if (!Array.isArray(items)) {
    return res.status(400).json({
      status: "error",
      statusMessage: "items must be an array",
      displayMessage: "Please provide an items array",
    });
  }

  if (items.length === 0) {
    return res.status(200).json({ deducted: [], skipped: [] });
  }

  try {
    const { deducted, skipped } = await deductStockService(businessId, billNo, items);
    return res.status(200).json({
      status: "success",
      statusMessage: "Stock deducted successfully",
      displayMessage: `Stock updated for ${deducted.length} product(s)`,
      deducted,
      skipped,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to deduct stock", err.status || 500);
  }
};

// ---------------------------------------------------------------------------
// GET /internal/inventory/:productId?businessId=X
// Called by other services to get inventory data for products
// No JWT — secured by network placement only.
// ---------------------------------------------------------------------------
const getInventoryByProduct = async (req, res) => {
  const { businessId } = req.query;
  const { productId } = req.params;

  if (!businessId || !Number.isInteger(Number(businessId)) || Number(businessId) <= 0) {
    return res.status(400).json({
      status: "error",
      statusMessage: "businessId must be a positive integer",
      displayMessage: "Please provide a valid business ID",
    });
  }

  if (!productId || !Number.isInteger(Number(productId)) || Number(productId) <= 0) {
    return res.status(400).json({
      status: "error",
      statusMessage: "productId must be a positive integer",
      displayMessage: "Please provide a valid product ID",
    });
  }

  try {
    const inventory = await getByProduct(businessId, productId);
    if (!inventory) {
      return res.status(200).json({
        status: "success",
        statusMessage: "No inventory record found",
        displayMessage: "No inventory record found for this product",
        inventory: null
      });
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Inventory retrieved successfully",
      displayMessage: "Inventory record retrieved",
      inventory,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to retrieve inventory record");
  }
};

// ---------------------------------------------------------------------------
// POST /internal/inventory/batch
// Body: { businessId, productIds: [ ... ] }
// Returns inventory for many products in ONE call, so callers (e.g.
// business-service) don't fire one request per product.
// No JWT — secured by network placement only.
// ---------------------------------------------------------------------------
const getInventoryByProductsBatch = async (req, res) => {
  const { businessId, productIds } = req.body;

  if (!businessId || !Number.isInteger(Number(businessId)) || Number(businessId) <= 0) {
    return res.status(400).json({
      status: "error",
      statusMessage: "businessId must be a positive integer",
      displayMessage: "Please provide a valid business ID",
    });
  }

  if (!Array.isArray(productIds)) {
    return res.status(400).json({
      status: "error",
      statusMessage: "productIds must be an array",
      displayMessage: "Please provide an array of product IDs",
    });
  }

  // Empty list is a valid no-op — return an empty map, not an error.
  if (productIds.length === 0) {
    return res.status(200).json({
      status: "success",
      statusMessage: "No product IDs provided",
      displayMessage: "No inventory to retrieve",
      inventory: {},
    });
  }

  try {
    const inventory = await getByProducts(businessId, productIds);
    return res.status(200).json({
      status: "success",
      statusMessage: "Inventory retrieved successfully",
      displayMessage: "Inventory records retrieved",
      inventory, // map: { [productId]: { currentStock, lowStockThreshold, uom, isLowStock } }
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to retrieve inventory records");
  }
};

module.exports = { deductStock, getInventoryByProduct, getInventoryByProductsBatch };
