const { AppDataSource } = require("../config/database");
const { Invoice } = require("../models/Invoice");
const { InvoiceItem } = require("../models/InvoiceItem");

const invoiceRepo = () => AppDataSource.getRepository(Invoice);

const generateBillNo = () => `BILL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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

    if (!customerName || !items?.length)
      return res.status(400).json({ message: "customerName and items are required" });

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
    res.status(201).json({ ...savedInvoice, items: itemsWithInvoice });
  } catch (err) {
    await queryRunner.rollbackTransaction();
    res.status(500).json({ message: err.message });
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
    res.json(await query.getMany());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const invoice = await invoiceRepo().findOne({
      where: { id: parseInt(req.params.id) },
      relations: ["items"],
    });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateReceived = async (req, res) => {
  try {
    const invoice = await invoiceRepo().findOneBy({ id: parseInt(req.params.id) });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const received = parseFloat(req.body.received);
    invoice.received = received;
    invoice.balance = parseFloat(invoice.totalPrice) - received;
    invoice.status = getStatus(received, parseFloat(invoice.totalPrice));
    await invoiceRepo().save(invoice);
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createInvoice, getInvoices, getInvoiceById, updateReceived };
