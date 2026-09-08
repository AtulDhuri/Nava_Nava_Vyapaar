const express = require("express");
const { createInvoice, getInvoices, getInvoiceById, updateReceived, updateInvoice, deleteInvoice } = require("../controllers/billingController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken);
router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.patch("/received", updateReceived);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);

module.exports = router;
