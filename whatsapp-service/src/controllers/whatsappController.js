const axios = require("axios");
const { getSession, createSession, updateSession, clearSession } = require("../utils/sessionStore");
const { sendMessage } = require("../utils/infobip");

const BUSINESS_ID = process.env.BUSINESS_ID || 1;

const fetchProducts = async () => {
  const { data } = await axios.get(`${process.env.BUSINESS_SERVICE_URL}/api/products?businessId=${BUSINESS_ID}&limit=10`, {
    headers: { "x-internal-key": process.env.INTERNAL_API_KEY },
  });
  return data.products || [];
};

const createInvoice = async (session, phone) => {
  const items = session.selectedProducts.map((p, i) => ({
    productId: p.id,
    productName: p.name,
    qty: session.quantities[i],
    price: parseFloat(p.price),
    discount: 0,
    gstRate: parseFloat(p.gstRate),
  }));

  const { data } = await axios.post(`${process.env.BILLING_SERVICE_URL}/api/invoices?businessId=${BUSINESS_ID}`, {
    businessId: String(BUSINESS_ID),
    customerName: session.name,
    customerMobile: phone,
    customerAddress: session.address,
    discount: 0,
    received: 0,
    items,
  }, {
    headers: { "x-internal-key": process.env.INTERNAL_API_KEY },
  });

  return data.invoice;
};

const buildProductList = (products) => {
  let msg = `🛒 *Our Products:*\n\n`;
  products.forEach((p, i) => {
    msg += `${i + 1}. *${p.name}*${p.category ? ` - ${p.category}` : ""}\n`;
  });
  msg += `\nReply with product numbers separated by commas.\nExample: *1,3*`;
  return msg;
};

const buildInvoiceSummary = (invoice) => {
  let msg = `✅ *Order Confirmed!*\n\n`;
  msg += `📄 Bill No: ${invoice.billNo}\n`;
  msg += `👤 Name: ${invoice.customerName}\n\n`;
  msg += `*Items:*\n`;
  invoice.items.forEach((item) => {
    msg += `• ${item.productName} x${item.qty} = ₹${item.total}\n`;
  });
  msg += `\n💰 *Total: ₹${invoice.totalPrice}*\n`;
  msg += `📌 Status: ${invoice.status}\n\n`;
  msg += `Thank you for your order! 🙏`;
  return msg;
};

const processedMessages = new Set();

const handleWebhook = async (req, res) => {
  res.sendStatus(200);

  try {
    console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));
    const msg = req.body?.results?.[0];
    if (!msg) return;

    if (processedMessages.has(msg.messageId)) return;
    processedMessages.add(msg.messageId);
    setTimeout(() => processedMessages.delete(msg.messageId), 60000);

    const phone = msg.sender;
    const rawText = msg.content?.[0]?.text?.trim();
    const keyword = msg.content?.[0]?.keyword?.trim();
    const text = rawText || keyword;
    if (!phone || !text) return;
    console.log(`[${phone}] rawText: "${rawText}" | keyword: "${keyword}" | text: "${text}" | charCodes: ${[...text].map(c => c.charCodeAt(0)).join(",")}`);

    const session = getSession(phone);
    console.log(`[${phone}] text: "${text}" | step: ${session?.step || "no session"}`);

    // Entry point
    if (["order", "dhuriatu"].includes(text.toLowerCase())) {
      try {
        console.log(`[${phone}] fetching products...`);
        const products = await fetchProducts();
        console.log(`[${phone}] fetched ${products.length} products`);
        if (!products.length) {
          return sendMessage(phone, "Sorry, no products available right now.");
        }
        createSession(phone);
        updateSession(phone, { products, page: 0 });
        console.log(`[${phone}] sending product list...`);
        return sendMessage(phone, buildProductList(products));
      } catch (err) {
        console.error("fetchProducts error:", err.message);
        return sendMessage(phone, "Sorry, something went wrong. Please try again.");
      }
    }

    if (!session) {
      return sendMessage(phone, 'Send *Order* to start placing an order.');
    }

    // Step 1: select products by number
    if (session.step === "selecting_products") {
      const indices = text.split(",").map((n) => parseInt(n.trim()) - 1);
      const selected = indices.map((i) => session.products[i]).filter(Boolean);

      if (!selected.length) {
        return sendMessage(phone, "Invalid selection. Please reply with valid product numbers like *1,2*");
      }

      updateSession(phone, { step: "entering_qty", selectedProducts: selected });

      const qtyPrompt = selected.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
      return sendMessage(phone, `Enter quantities for:\n\n${qtyPrompt}\n\nReply with quantities separated by commas.\nExample: *2,1*`);
    }

    // Step 2: enter quantities
    if (session.step === "entering_qty") {
      const quantities = text.split(",").map((n) => parseInt(n.trim()));

      if (quantities.length !== session.selectedProducts.length || quantities.some(isNaN) || quantities.some((q) => q <= 0)) {
        return sendMessage(phone, `Please enter ${session.selectedProducts.length} valid quantity/quantities separated by commas.`);
      }

      updateSession(phone, { step: "entering_name", quantities });
      return sendMessage(phone, "Please enter your *full name*:");
    }

    // Step 3: enter name
    if (session.step === "entering_name") {
      updateSession(phone, { step: "entering_address", name: text });
      return sendMessage(phone, "Please enter your *delivery address*:");
    }

    // Step 4: enter address → create invoice
    if (session.step === "entering_address") {
      updateSession(phone, { address: text });
      const updatedSession = getSession(phone);

      const invoice = await createInvoice(updatedSession, phone);
      clearSession(phone);
      return sendMessage(phone, buildInvoiceSummary(invoice));
    }
  } catch (err) {
    console.error("Webhook error:", err.message);
  }
};

module.exports = { handleWebhook };
