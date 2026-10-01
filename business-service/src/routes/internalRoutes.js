const express = require("express");
const { resolveProductCodes } = require("../controllers/internalController");

const router = express.Router();

// NO JWT middleware — these endpoints are secured by network placement only,
// mirroring the inventory-service /internal convention.
router.post("/products/resolve-codes", resolveProductCodes);

module.exports = router;
