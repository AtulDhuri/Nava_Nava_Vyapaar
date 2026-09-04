const express = require("express");
const { createInvoice, getInvoices, getInvoiceById, updateReceived, deleteInvoice } = require("../controllers/billingController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken);
router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.patch("/received", updateReceived);
router.delete("/:id", deleteInvoice);

module.exports = router;
