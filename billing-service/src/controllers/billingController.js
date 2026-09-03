const { AppDataSource } = require("../config/database");
const { Invoice } = require("../models/Invoice");
const { InvoiceItem } = require("../models/InvoiceItem");
const { successResponse, errorResponse, getResponse } = require("../utils/responseHandler");

const invoiceRepo = () => AppDataSource.getRepository(Invoice);

const generateBillNo = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `INV-${yyyy}-${mm}-${dd}-${now.getTime()}`;
};

const getStatus = (received, total) => {
  if (received <= 0) return "Unpaid";
  if (received >= total) return "Paid";
  return "Partially Paid";
};

const createInvoice = async (req, res) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const { customerName, customerMobile, customerAddress, items, discount, received } = req.body;

    if (!customerName || !items?.length) {
      return errorResponse(res, "customerName and items are required", "Please provide customer name and at least one item", 400);
    }

    let totalPrice = 0;

    const invoiceItems = items.map((item) => {
      const itemBase = parseFloat(item.price) * parseInt(item.qty);
      const itemDiscount = parseFloat(item.discount || 0);
      const gstAmount = (itemBase - itemDiscount) * (parseFloat(item.gstRate) / 100);
      const itemTotal = itemBase - itemDiscount + gstAmount;
      totalPrice += itemTotal;
      return {
        productId: item.productId || null,
        productName: item.productName,
        price: item.price,
        qty: item.qty,
        discount: item.discount || 0,
        gstRate: item.gstRate,
        total: itemTotal,
      };
    });

    const discountVal = parseFloat(discount || 0);
    const receivedVal = parseFloat(received || 0);
    const finalTotal = totalPrice - discountVal;
    const balance = finalTotal - receivedVal;

    const invoice = queryRunner.manager.create(Invoice, {
      billNo: generateBillNo(),
      customerName,
      customerMobile,
      customerAddress,
      totalPrice: finalTotal,
      discount: discountVal,
      received: receivedVal,
      balance,
      status: getStatus(receivedVal, finalTotal),
    });

    const savedInvoice = await queryRunner.manager.save(Invoice, invoice);

    const itemsWithInvoice = invoiceItems.map((i) => ({
      ...i,
      invoice: { id: savedInvoice.id },
    }));
    await queryRunner.manager.save(InvoiceItem, itemsWithInvoice);

    await queryRunner.commitTransaction();
    
    return res.status(201).json({
      status: "success",
      statusMessage: "Invoice created successfully",
      displayMessage: `Invoice ${savedInvoice.billNo} created successfully`,
      invoice: { ...savedInvoice, items: itemsWithInvoice }
    });
  } catch (err) {
    await queryRunner.rollbackTransaction();
    return errorResponse(res, err.message, "Failed to create invoice");
  } finally {
    await queryRunner.release();
  }
};

const getInvoices = async (req, res) => {
  try {
    const { status } = req.query;
    const query = invoiceRepo().createQueryBuilder("invoice");
    if (status) query.where("invoice.status = :status", { status });
    query.orderBy("invoice.date", "DESC");
    
    const invoices = await query.getMany();
    
    if (invoices.length === 0) {
      const noRecordsMessage = status 
        ? `No invoices found with status "${status}"` 
        : "No invoices found. Create your first invoice to get started!";
        
      return res.status(200).json({
        status: "success",
        statusMessage: "Invoices retrieved successfully",
        displayMessage: noRecordsMessage,
        invoices: []
      });
    } else {
      const withRecordsMessage = status 
        ? `Found ${invoices.length} invoice(s) with status "${status}"` 
        : "Your invoices are ready to view";
        
      return res.status(200).json({
        status: "success",
        statusMessage: "Invoices retrieved successfully", 
        displayMessage: withRecordsMessage,
        invoices: invoices
      });
    }
  } catch (err) {
    return errorResponse(res, err.message, "Failed to retrieve invoices");
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const invoice = await invoiceRepo().findOne({
      where: { id: parseInt(req.params.id) },
      relations: ["items"],
    });
    
    if (!invoice) {
      return errorResponse(res, "Invoice not found", "The requested invoice could not be found", 404);
    }
    
    return res.status(200).json({
      status: "success",
      statusMessage: "Invoice retrieved successfully",
      displayMessage: "Invoice details retrieved",
      invoice: invoice
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to retrieve invoice");
  }
};

const updateReceived = async (req, res) => {
  try {
    const invoice = await invoiceRepo().findOneBy({ id: parseInt(req.params.id) });
    if (!invoice) {
      return errorResponse(res, "Invoice not found", "The requested invoice could not be found", 404);
    }

    const received = parseFloat(req.body.received);
    invoice.received = received;
    invoice.balance = parseFloat(invoice.totalPrice) - received;
    invoice.status = getStatus(received, parseFloat(invoice.totalPrice));
    await invoiceRepo().save(invoice);
    
    return res.status(200).json({
      status: "success",
      statusMessage: "Payment updated successfully",
      displayMessage: `Payment of ₹${received} recorded successfully`,
      invoice: invoice
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to update payment");
  }
};

module.exports = { createInvoice, getInvoices, getInvoiceById, updateReceived };
