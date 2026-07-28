const express = require("express");
const { createInvoice, getInvoices, getInvoiceById, updateReceived } = require("../controllers/billingController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken);
router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.patch("/:id/received", updateReceived);

module.exports = router;
