const express = require("express");
const { deductStock, getInventoryByProduct, getInventoryByProductsBatch } = require("../controllers/internalController");

const router = express.Router();

// NO JWT middleware — these endpoints are secured by network placement only
router.post("/deduct-stock", deductStock);
// Batch lookup for many products in one call. Registered before the :productId
// param route so "batch" isn't captured as a productId.
router.post("/inventory/batch", getInventoryByProductsBatch);
router.get("/inventory/:productId", getInventoryByProduct);

module.exports = router;
