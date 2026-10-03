const billingService = require("../billingService");
const { errorResponse } = require("../../../utils/responseHandler");

const createInvoice = async (req, res) => {
  try {
    const { businessId, customerName, items } = req.body;

    if (!businessId) {
      return errorResponse(res, "businessId is required", "Please provide a business ID", 400);
    }
    if (!customerName || !items?.length) {
      return errorResponse(res, "customerName and items are required", "Please provide customer name and at least one item", 400);
    }

    const { invoice, inventoryDeducted, inventoryError } = await billingService.createInvoice(req.body);

    return res.status(201).json({
      status: "success",
      statusMessage: "Invoice created successfully",
      displayMessage: `Invoice ${invoice.billNo} created successfully`,
      invoice,
      inventoryDeducted,
      ...(inventoryError && { inventoryError }),
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to create invoice");
  }
};

const getInvoices = async (req, res) => {
  try {
    const { status, businessId } = req.query;
    if (!businessId) {
      return errorResponse(res, "businessId is required", "Please provide a business ID", 400);
    }

    const invoices = await billingService.getInvoices(businessId, status);

    const displayMessage = invoices.length === 0
      ? (status ? `No invoices found with status "${status}"` : "No invoices found. Create your first invoice to get started!")
      : (status ? `Found ${invoices.length} invoice(s) with status "${status}"` : "Your invoices are ready to view");

    return res.status(200).json({
      status: "success",
      statusMessage: "Invoices retrieved successfully",
      displayMessage,
      invoices,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to retrieve invoices");
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) {
      return errorResponse(res, "businessId is required", "Please provide a business ID", 400);
    }

    const invoice = await billingService.getInvoiceById(businessId, req.params.id);
    if (!invoice) {
      return errorResponse(res, "Invoice not found", "The requested invoice could not be found", 404);
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Invoice retrieved successfully",
      displayMessage: "Invoice details retrieved",
      invoice,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to retrieve invoice");
  }
};

const updateReceived = async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) return errorResponse(res, "businessId is required", "Please provide a business ID", 400);

    const items = Array.isArray(req.body) ? req.body : [req.body];
    for (const item of items) {
      if (!item.id) return errorResponse(res, "id is required for each item", "Please provide id for each invoice", 400);
    }

    const result = await billingService.updateReceived(businessId, items);
    if (result.notFound !== undefined) {
      return errorResponse(res, `Invoice ${result.notFound} not found`, "One or more invoices could not be found", 404);
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Payment(s) updated successfully",
      displayMessage: `${result.updated.length} payment(s) updated successfully`,
      invoices: result.updated,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to update payment");
  }
};

const updateInvoice = async (req, res) => {
  try {
    const businessId = req.query.businessId ?? req.body.businessId;
    if (!businessId) return errorResponse(res, "businessId is required", "Please provide a business ID", 400);

    const result = await billingService.updateInvoice(businessId, req.params.id, req.body);
    if (result.notFound) {
      return errorResponse(res, "Invoice not found", "The requested invoice could not be found", 404);
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Invoice updated successfully",
      displayMessage: `Invoice ${result.invoice.billNo} updated successfully`,
      invoice: result.invoice,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to update invoice");
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) return errorResponse(res, "businessId is required", "Please provide a business ID", 400);

    const result = await billingService.deleteInvoice(businessId, req.params.id);
    if (result.notFound) {
      return errorResponse(res, "Invoice not found", "The requested invoice could not be found", 404);
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Invoice deleted successfully",
      displayMessage: `Invoice ${result.billNo} deleted successfully`,
      deletedBillNo: result.billNo,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to delete invoice");
  }
};

module.exports = { createInvoice, getInvoices, getInvoiceById, updateReceived, updateInvoice, deleteInvoice };
