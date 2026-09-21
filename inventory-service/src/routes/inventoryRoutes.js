const express = require("express");
const {
  addInventory,
  getInventory,
  getLowStockItems,
  getInventoryByProduct,
  updateThreshold,
  updateInventory,
  deleteInventory,
} = require("../controllers/inventoryController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// JWT middleware applied to ALL routes on this router
router.use(verifyToken);

router.post("/", addInventory);
router.get("/", getInventory);
router.get("/low-stock", getLowStockItems);
router.get("/:productId", getInventoryByProduct);
router.put("/", updateInventory);
router.delete("/", deleteInventory);
router.patch("/:productId/threshold", updateThreshold);

module.exports = router;
