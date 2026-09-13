const service = require("../services/inventoryService");
const { errorResponse } = require("../utils/responseHandler");
const {
  missingBusinessId,
  invalidArray,
  missingId,
  notFound,
  invalidEntry,
  validateAddEntries,
} = require("../utils/validate");

// ---------------------------------------------------------------------------
// POST /api/inventory
// Always expects an array. Single item = [{...}], bulk = [{...}, {...}]
// ---------------------------------------------------------------------------
const addInventory = async (req, res) => {
  const entries = req.body;

  if (!Array.isArray(entries) || entries.length === 0)
    return res.status(400).json(invalidArray("inventory entries"));

  const invalid = validateAddEntries(entries);
  if (invalid) return res.status(400).json(invalidEntry(invalid.index, invalid.error));

  try {
    const isBulk = entries.length > 1;
    const saved = isBulk
      ? await service.addBulk(entries)
      : [await service.addSingle(entries[0])];

    return res.status(201).json({
      status: "success",
      statusMessage: "Inventory added successfully",
      displayMessage: `${saved.length} inventory record(s) added/updated successfully`,
      saved: saved.length,
      entries: saved,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to add inventory — no changes were saved");
  }
};

// ---------------------------------------------------------------------------
// GET /api/inventory?businessId=X
// ---------------------------------------------------------------------------
const getInventory = async (req, res) => {
  const { businessId } = req.query;
  if (!businessId) return res.status(400).json(missingBusinessId());

  try {
    const inventory = await service.getAll(businessId);
    return res.status(200).json({
      status: "success",
      statusMessage: "Inventory retrieved successfully",
      displayMessage: "Your inventory is ready to view",
      inventory,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to retrieve inventory");
  }
};

// ---------------------------------------------------------------------------
// GET /api/inventory/low-stock?businessId=X
// ---------------------------------------------------------------------------
const getLowStockItems = async (req, res) => {
  const { businessId } = req.query;
  if (!businessId) return res.status(400).json(missingBusinessId());

  try {
    const lowStockItems = await service.getLowStock(businessId);
    return res.status(200).json({
      status: "success",
      statusMessage: "Low stock items retrieved",
      displayMessage: `${lowStockItems.length} item(s) are running low on stock`,
      lowStockItems,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to retrieve low stock items");
  }
};

// ---------------------------------------------------------------------------
// GET /api/inventory/:productId?businessId=X
// ---------------------------------------------------------------------------
const getInventoryByProduct = async (req, res) => {
  const { businessId } = req.query;
  if (!businessId) return res.status(400).json(missingBusinessId());

  try {
    const inventory = await service.getByProduct(businessId, req.params.productId);
    if (!inventory) return res.status(404).json(notFound());
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
// PATCH /api/inventory/:productId/threshold?businessId=X
// ---------------------------------------------------------------------------
const updateThreshold = async (req, res) => {
  const { businessId } = req.query;
  if (!businessId) return res.status(400).json(missingBusinessId());

  const { lowStockThreshold } = req.body;
  if (lowStockThreshold != null && parseFloat(lowStockThreshold) < 0) {
    return res.status(400).json({
      status: "error",
      statusMessage: "lowStockThreshold cannot be negative",
      displayMessage: "Low stock threshold must be zero or a positive number",
    });
  }

  try {
    const inventory = await service.setThreshold(businessId, req.params.productId, lowStockThreshold);
    if (!inventory) return res.status(404).json(notFound());
    return res.status(200).json({
      status: "success",
      statusMessage: "Threshold updated successfully",
      displayMessage: "Low stock threshold updated successfully",
      inventory,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to update threshold");
  }
};

// ---------------------------------------------------------------------------
// PUT /api/inventory?businessId=X
// Always expects an array. Single item = [{...}]
// ---------------------------------------------------------------------------
const updateInventory = async (req, res) => {
  const { businessId } = req.query;
  if (!businessId) return res.status(400).json(missingBusinessId());

  const items = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json(invalidArray("inventory records to update"));

  for (const item of items) {
    if (!item.id) return res.status(400).json(missingId());
  }

  try {
    const result = await service.updateById(businessId, items);
    if (result.notFound !== undefined) return res.status(404).json(notFound(result.notFound));
    return res.status(200).json({
      status: "success",
      statusMessage: "Inventory updated successfully",
      displayMessage: `${result.updated.length} inventory record(s) updated successfully`,
      inventory: result.updated,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to update inventory");
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/inventory?businessId=X
// Always expects an array of { id } objects.
// ---------------------------------------------------------------------------
const deleteInventory = async (req, res) => {
  const { businessId } = req.query;
  if (!businessId) return res.status(400).json(missingBusinessId());

  const items = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json(invalidArray("inventory records to delete"));

  for (const item of items) {
    if (!item.id) return res.status(400).json(missingId());
  }

  try {
    const result = await service.deleteById(businessId, items);
    if (result.notFound !== undefined) return res.status(404).json(notFound(result.notFound));
    return res.status(200).json({
      status: "success",
      statusMessage: "Inventory deleted successfully",
      displayMessage: `${result.deletedIds.length} inventory record(s) deleted successfully`,
      deletedIds: result.deletedIds,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to delete inventory");
  }
};

module.exports = {
  addInventory,
  getInventory,
  getLowStockItems,
  getInventoryByProduct,
  updateThreshold,
  updateInventory,
  deleteInventory,
};
