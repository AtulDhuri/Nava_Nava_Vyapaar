const { AppDataSource } = require("../config/database");
const { Invoice } = require("../models/Invoice");
const { InvoiceItem } = require("../models/InvoiceItem");
const { successResponse, errorResponse, getResponse } = require("../utils/responseHandler");

const invoiceRepo = () => AppDataSource.getRepository(Invoice);

const round2 = (val) => Math.round(parseFloat(val) * 100) / 100;

const generateBillNo = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `INV-${yyyy}-${mm}-${dd}-${now.getTime()}`;
};

const getStatus = (received, total) => {
  if (round2(received) <= 0) return "Unpaid";
  if (round2(received) >= round2(total)) return "Paid";
  return "Partially Paid";
};

const createInvoice = async (req, res) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const { businessId, customerName, customerMobile, customerAddress, items, discount, received } = req.body;

    if (!businessId) {
      return errorResponse(res, "businessId is required", "Please provide a business ID", 400);
    }

    if (!customerName || !items?.length) {
      return errorResponse(res, "customerName and items are required", "Please provide customer name and at least one item", 400);
    }

    let totalPrice = 0;

    const invoiceItems = items.map((item) => {
      const itemTotal = item.total != null ? parseFloat(item.total) : (() => {
        const itemBase = parseFloat(item.price) * parseInt(item.qty);
        const itemDiscountAmt = itemBase * (parseFloat(item.discount || 0) / 100);
        const gstAmount = (itemBase - itemDiscountAmt) * (parseFloat(item.gstRate) / 100);
        return itemBase - itemDiscountAmt + gstAmount;
      })();
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

    const discountVal = round2(discount || 0);
    const receivedVal = round2(received || 0);
    const finalTotal = round2(totalPrice - discountVal);
    const balance = round2(finalTotal - receivedVal);

    const invoice = queryRunner.manager.create(Invoice, {
      businessId: parseInt(businessId),
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
    const { status, businessId } = req.query;

    if (!businessId) {
      return errorResponse(res, "businessId is required", "Please provide a business ID", 400);
    }

    const query = invoiceRepo().createQueryBuilder("invoice")
      .where("invoice.businessId = :businessId", { businessId: parseInt(businessId) });

    if (status) query.andWhere("invoice.status = :status", { status });
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
    const { businessId } = req.query;

    if (!businessId) {
      return errorResponse(res, "businessId is required", "Please provide a business ID", 400);
    }

    const invoice = await invoiceRepo().findOne({
      where: { id: parseInt(req.params.id), businessId: parseInt(businessId) },
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
    const { businessId } = req.query;
    if (!businessId) return errorResponse(res, "businessId is required", "Please provide a business ID", 400);

    const items = Array.isArray(req.body) ? req.body : [req.body];
    const updated = [];

    for (const item of items) {
      if (!item.id) return errorResponse(res, "id is required for each item", "Please provide id for each invoice", 400);
      const invoice = await invoiceRepo().findOneBy({ id: parseInt(item.id), businessId: parseInt(businessId) });
      if (!invoice) return errorResponse(res, `Invoice ${item.id} not found`, "One or more invoices could not be found", 404);
      const received = round2(item.received);
      invoice.received = received;
      invoice.balance = round2(parseFloat(invoice.totalPrice) - received);
      invoice.status = getStatus(received, parseFloat(invoice.totalPrice));
      updated.push(await invoiceRepo().save(invoice));
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Payment(s) updated successfully",
      displayMessage: `${updated.length} payment(s) updated successfully`,
      invoices: updated
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to update payment");
  }
};

const updateInvoice = async (req, res) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const businessId = req.query.businessId ?? req.body.businessId;
    if (!businessId) return errorResponse(res, "businessId is required", "Please provide a business ID", 400);

    const invoice = await queryRunner.manager.findOne(Invoice, {
      where: { id: parseInt(req.params.id), businessId: parseInt(businessId) },
      relations: ["items"],
    });
    if (!invoice) return errorResponse(res, "Invoice not found", "The requested invoice could not be found", 404);

    const { customerName, customerMobile, customerAddress, items, discount, received } = req.body;

    if (customerName !== undefined) invoice.customerName = customerName;
    if (customerMobile !== undefined) invoice.customerMobile = customerMobile;
    if (customerAddress !== undefined) invoice.customerAddress = customerAddress;

    if (items?.length) {
      const matchedExistingIds = new Set();

      const resolveExisting = (item) => {
        if (item.id) return invoice.items.find((i) => i.id === item.id) ?? null;
        if (item.productId) return invoice.items.find((i) => parseInt(i.productId) === parseInt(item.productId) && !matchedExistingIds.has(i.id)) ?? null;
        return null;
      };

      let totalPrice = 0;

      for (const item of items) {
        const itemTotal = item.total != null ? parseFloat(item.total) : (() => {
          const itemBase = parseFloat(item.price) * parseInt(item.qty);
          const itemDiscountAmt = itemBase * (parseFloat(item.discount || 0) / 100);
          const gstAmount = (itemBase - itemDiscountAmt) * (parseFloat(item.gstRate) / 100);
          return itemBase - itemDiscountAmt + gstAmount;
        })();
        totalPrice += itemTotal;

        const existing = resolveExisting(item);
        if (existing) matchedExistingIds.add(existing.id);

        const entity = existing
          ? Object.assign(existing, { productId: item.productId ?? existing.productId, productName: item.productName, price: item.price, qty: item.qty, discount: item.discount || 0, gstRate: item.gstRate, total: itemTotal })
          : queryRunner.manager.create(InvoiceItem, { productId: item.productId ?? null, productName: item.productName, price: item.price, qty: item.qty, discount: item.discount || 0, gstRate: item.gstRate, total: itemTotal, invoice: { id: invoice.id } });

        await queryRunner.manager.save(InvoiceItem, entity);
      }

      const toDelete = invoice.items.filter((i) => !matchedExistingIds.has(i.id));
      if (toDelete.length) await queryRunner.manager.remove(InvoiceItem, toDelete);

      const discountVal = round2(discount ?? invoice.discount);
      const receivedVal = round2(received ?? invoice.received);
      const finalTotal = round2(totalPrice - discountVal);
      invoice.totalPrice = finalTotal;
      invoice.discount = discountVal;
      invoice.received = receivedVal;
      invoice.balance = round2(finalTotal - receivedVal);
      invoice.status = getStatus(receivedVal, finalTotal);
    } else {
      if (received !== undefined) {
        const receivedVal = round2(received);
        invoice.received = receivedVal;
        invoice.balance = round2(parseFloat(invoice.totalPrice) - receivedVal);
        invoice.status = getStatus(receivedVal, parseFloat(invoice.totalPrice));
      }
      if (discount !== undefined) {
        invoice.discount = round2(discount);
        invoice.balance = round2(parseFloat(invoice.totalPrice) - parseFloat(invoice.received));
      }
    }

    const savedInvoice = await queryRunner.manager.save(Invoice, invoice);
    await queryRunner.commitTransaction();

    const result = await AppDataSource.getRepository(Invoice).findOne({
      where: { id: savedInvoice.id },
      relations: ["items"],
    });

    return res.status(200).json({
      status: "success",
      statusMessage: "Invoice updated successfully",
      displayMessage: `Invoice ${savedInvoice.billNo} updated successfully`,
      invoice: result,
    });
  } catch (err) {
    await queryRunner.rollbackTransaction();
    return errorResponse(res, err.message, "Failed to update invoice");
  } finally {
    await queryRunner.release();
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) return errorResponse(res, "businessId is required", "Please provide a business ID", 400);

    const invoice = await invoiceRepo().findOne({
      where: { id: parseInt(req.params.id), businessId: parseInt(businessId) },
      relations: ["items"],
    });
    if (!invoice) return errorResponse(res, "Invoice not found", "The requested invoice could not be found", 404);

    const billNo = invoice.billNo;
    await invoiceRepo().remove(invoice);

    return res.status(200).json({
      status: "success",
      statusMessage: "Invoice deleted successfully",
      displayMessage: `Invoice ${billNo} deleted successfully`,
      deletedBillNo: billNo
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to delete invoice");
  }
};

module.exports = { createInvoice, getInvoices, getInvoiceById, updateReceived, updateInvoice, deleteInvoice };
