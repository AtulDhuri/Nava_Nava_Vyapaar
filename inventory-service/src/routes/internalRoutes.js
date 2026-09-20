const express = require("express");
const { deductStock, getInventoryByProduct } = require("../controllers/internalController");

const router = express.Router();

// NO JWT middleware — these endpoints are secured by network placement only
router.post("/deduct-stock", deductStock);
router.get("/inventory/:productId", getInventoryByProduct);

module.exports = router;
