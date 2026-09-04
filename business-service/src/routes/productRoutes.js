const express = require("express");
const { addProduct, getProducts, updateProduct, deleteProduct } = require("../controllers/productController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken);
router.post("/", addProduct);
router.get("/", getProducts);
router.put("/", updateProduct);
router.delete("/", deleteProduct);

module.exports = router;
