const axios = require("axios");

const infobip = axios.create({
  baseURL: process.env.INFOBIP_BASE_URL,
  headers: {
    Authorization: `App ${process.env.INFOBIP_API_KEY}`,
    "Content-Type": "application/json",
  },
});

const sendMessage = async (to, text) => {
  try {
    const response = await infobip.post("/whatsapp/1/message/text", {
      from: process.env.INFOBIP_WHATSAPP_SENDER,
      to,
      content: { text },
    });
    console.log(`Message sent to ${to}:`, JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("Infobip error status:", err.response?.status);
    console.error("Infobip error data:", JSON.stringify(err.response?.data, null, 2));
    throw err;
  }
};

module.exports = { sendMessage };
