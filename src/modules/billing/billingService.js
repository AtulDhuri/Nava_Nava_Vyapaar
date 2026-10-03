/**
 * billingService.js
 * All invoice domain logic: totals math, status, and persistence (including the
 * transaction orchestration and best-effort inventory deduction). Controllers
 * call these functions and only translate results into HTTP responses.
 *
 * Service functions return plain data or a small outcome object
 * ({ notFound: true } / { ok: false }) rather than touching req/res, so they
 * stay transport-agnostic and unit-testable.
 */

const { AppDataSource } = require("../../config/database");
const { Invoice } = require("./models/Invoice");
const { InvoiceItem } = require("./models/InvoiceItem");
// Monolith: direct in-process calls instead of HTTP to other services.
const inventoryService = require("../inventory/inventoryService");
const businessService = require("../business/businessService");

const invoiceRepo = () => AppDataSource.getRepository(Invoice);

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const round2 = (val) => Math.round(parseFloat(val) * 100) / 100;

// A productId is a numeric business PK (e.g. "111") rather than a SKU code
// (e.g. "P001") when it's composed only of digits.
const isNumericId = (val) => val != null && /^\d+$/.test(String(val).trim());

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

const computeItemTotal = (item) => {
  if (item.total != null) return parseFloat(item.total);
  const itemBase = parseFloat(item.price) * parseInt(item.qty);
  const itemDiscountAmt = itemBase * (parseFloat(item.discount || 0) / 100);
  const gstAmount = (itemBase - itemDiscountAmt) * (parseFloat(item.gstRate) / 100);
  return itemBase - itemDiscountAmt + gstAmount;
};

/**
 * Resolve the numeric product ids on invoice items to their productCode SKUs via
 * the business module. Best-effort: on failure returns {} so invoice creation is
 * never blocked.
 */
const resolveItemCodes = async (businessId, items) => {
  const numericIds = [...new Set(
    items
      .map((item) => item.productCode ?? item.productId)
      .filter((key) => isNumericId(key))
      .map((key) => String(key))
  )];

  if (numericIds.length === 0) return {};
  return businessService.resolveProductCodes(businessId, numericIds);
};

/**
 * Best-effort inventory deduction run AFTER the invoice transaction commits.
 * Never throws — returns { inventoryDeducted, inventoryError }.
 */
const deductInventoryForInvoice = async (businessId, billNo, inventoryItems) => {
  let inventoryDeducted = false;
  let inventoryError = null;

  if (!inventoryItems.length) return { inventoryDeducted, inventoryError };

  try {
    const deductionResponse = await inventoryService.deductStock(businessId, billNo, inventoryItems);

    if (deductionResponse?.deducted?.length > 0) {
      inventoryDeducted = true;
      if (deductionResponse.skipped?.length > 0) {
        const details = deductionResponse.skipped.map((s) => `${s.productId} (${s.reason})`).join(", ");
        inventoryError = `Partial deduction: ${deductionResponse.skipped.length} item(s) could not be deducted: ${details}`;
      }
    } else if (deductionResponse?.skipped?.length > 0) {
      const details = deductionResponse.skipped.map((s) => `${s.productId} (${s.reason})`).join(", ");
      inventoryError = `Stock deduction failed: ${deductionResponse.skipped.length} item(s) could not be deducted: ${details}`;
    }
  } catch (err) {
    inventoryError = err.message || "Inventory deduction failed — stock not deducted";
    console.error(`[INVENTORY_DEDUCTION_ERROR] billNo: ${billNo}, businessId: ${businessId}, error: ${err.message}`);
  }

  return { inventoryDeducted, inventoryError };
};

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

/**
 * Create an invoice with its items in a transaction, then best-effort deduct
 * inventory after commit.
 * @returns {Promise<{invoice, inventoryDeducted, inventoryError}>}
 */
const createInvoice = async (payload) => {
  const { businessId, customerName, customerMobile, customerAddress, items, discount, received } = payload;

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const bizId = parseInt(businessId);

    // Resolve each item to its inventory SKU/productCode up front.
    const resolvedCodes = await resolveItemCodes(bizId, items);
    const codeFor = (item) => {
      const key = item.productCode ?? item.productId;
      if (key == null || key === "") return null;
      return isNumericId(key) ? (resolvedCodes[String(key)] ?? key) : key;
    };

    let totalPrice = 0;
    const invoiceItems = items.map((item) => {
      const itemTotal = computeItemTotal(item);
      totalPrice += itemTotal;
      return {
        productId: codeFor(item) ?? null,
        productName: item.productName,
        price: item.price,
        qty: item.qty,
        discount: item.discount || 0,
        gstRate: item.gstRate,
        total: itemTotal,
        description: item.description || null,
      };
    });

    const discountVal = round2(discount || 0);
    const receivedVal = round2(received || 0);
    const finalTotal = round2(totalPrice - discountVal);
    const balance = round2(finalTotal - receivedVal);

    const invoice = queryRunner.manager.create(Invoice, {
      businessId: bizId,
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

    const itemsWithInvoice = invoiceItems.map((i) => ({ ...i, invoice: { id: savedInvoice.id } }));
    await queryRunner.manager.save(InvoiceItem, itemsWithInvoice);

    await queryRunner.commitTransaction();

    // Deduction uses the SAME resolved codes; keyed by SKU, filtered to those present.
    const inventoryItems = items
      .map((item) => ({ productId: codeFor(item), qty: parseInt(item.qty) }))
      .filter((item) => item.productId);

    const { inventoryDeducted, inventoryError } = await deductInventoryForInvoice(
      bizId, savedInvoice.billNo, inventoryItems
    );

    return {
      invoice: { ...savedInvoice, items: itemsWithInvoice },
      inventoryDeducted,
      inventoryError,
    };
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
};

/** List invoices for a business, optionally filtered by status. */
const getInvoices = async (businessId, status) => {
  const query = invoiceRepo().createQueryBuilder("invoice")
    .where("invoice.businessId = :businessId", { businessId: parseInt(businessId) });
  if (status) query.andWhere("invoice.status = :status", { status });
  query.orderBy("invoice.date", "DESC");
  return query.getMany();
};

/** Get one invoice (with items) by id for a business, or null. */
const getInvoiceById = async (businessId, id) => {
  return invoiceRepo().findOne({
    where: { id: parseInt(id), businessId: parseInt(businessId) },
    relations: ["items"],
  });
};

/**
 * Update the received amount on one or more invoices.
 * @returns {Promise<{updated}|{notFound: id}>}
 */
const updateReceived = async (businessId, items) => {
  const updated = [];
  for (const item of items) {
    const invoice = await invoiceRepo().findOneBy({ id: parseInt(item.id), businessId: parseInt(businessId) });
    if (!invoice) return { notFound: item.id };
    const received = round2(item.received);
    invoice.received = received;
    invoice.balance = round2(parseFloat(invoice.totalPrice) - received);
    invoice.status = getStatus(received, parseFloat(invoice.totalPrice));
    updated.push(await invoiceRepo().save(invoice));
  }
  return { updated };
};

/**
 * Update an invoice and its items in a transaction.
 * @returns {Promise<{invoice}|{notFound: true}>}
 */
const updateInvoice = async (businessId, id, payload) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const invoice = await queryRunner.manager.findOne(Invoice, {
      where: { id: parseInt(id), businessId: parseInt(businessId) },
      relations: ["items"],
    });
    if (!invoice) {
      await queryRunner.rollbackTransaction();
      return { notFound: true };
    }

    const { customerName, customerMobile, customerAddress, items, discount, received } = payload;

    if (customerName !== undefined) invoice.customerName = customerName;
    if (customerMobile !== undefined) invoice.customerMobile = customerMobile;
    if (customerAddress !== undefined) invoice.customerAddress = customerAddress;

    if (items?.length) {
      const matchedExistingIds = new Set();

      const resolveExisting = (item) => {
        if (item.id) return invoice.items.find((i) => i.id === item.id) ?? null;
        const code = item.productCode ?? item.productId;
        if (code != null) return invoice.items.find((i) => i.productId === String(code) && !matchedExistingIds.has(i.id)) ?? null;
        return null;
      };

      let totalPrice = 0;
      for (const item of items) {
        const itemTotal = computeItemTotal(item);
        totalPrice += itemTotal;

        const existing = resolveExisting(item);
        if (existing) matchedExistingIds.add(existing.id);

        const itemCode = item.productCode ?? item.productId;
        const entity = existing
          ? Object.assign(existing, { productId: itemCode ?? existing.productId, productName: item.productName, price: item.price, qty: item.qty, discount: item.discount || 0, gstRate: item.gstRate, total: itemTotal, description: item.description || null })
          : queryRunner.manager.create(InvoiceItem, { productId: itemCode ?? null, productName: item.productName, price: item.price, qty: item.qty, discount: item.discount || 0, gstRate: item.gstRate, total: itemTotal, description: item.description || null, invoice: { id: invoice.id } });

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

    const result = await invoiceRepo().findOne({
      where: { id: savedInvoice.id },
      relations: ["items"],
    });
    return { invoice: result };
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
};

/**
 * Delete an invoice (and its items via cascade) by id for a business.
 * @returns {Promise<{billNo}|{notFound: true}>}
 */
const deleteInvoice = async (businessId, id) => {
  const invoice = await invoiceRepo().findOne({
    where: { id: parseInt(id), businessId: parseInt(businessId) },
    relations: ["items"],
  });
  if (!invoice) return { notFound: true };

  const billNo = invoice.billNo;
  await invoiceRepo().remove(invoice);
  return { billNo };
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateReceived,
  updateInvoice,
  deleteInvoice,
};
