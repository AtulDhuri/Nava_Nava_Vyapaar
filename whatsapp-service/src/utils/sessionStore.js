// In-memory session store keyed by customer WhatsApp number
// Steps: idle -> selecting_products -> entering_qty -> entering_name -> entering_address
const sessions = {};

const getSession = (phone) => sessions[phone] || null;

const createSession = (phone) => {
  sessions[phone] = { step: "selecting_products", products: [], selectedProducts: [], quantities: [], name: null, address: null };
  return sessions[phone];
};

const updateSession = (phone, data) => {
  sessions[phone] = { ...sessions[phone], ...data };
  return sessions[phone];
};

const clearSession = (phone) => {
  delete sessions[phone];
};

module.exports = { getSession, createSession, updateSession, clearSession };
