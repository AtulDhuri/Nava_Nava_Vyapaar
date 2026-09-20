/**
 * Shared validation helpers for inventory-service controllers.
 * Returns an error response object { status, statusMessage, displayMessage }
 * or null if valid. Controllers check the return value and short-circuit.
 */

const missingBusinessId = () => ({
  status: "error",
  statusMessage: "businessId is required",
  displayMessage: "Please provide a business ID",
});

const invalidArray = (entity = "entries") => ({
  status: "error",
  statusMessage: "Request body must be a non-empty array",
  displayMessage: `Please provide an array of ${entity}`,
});

const missingId = () => ({
  status: "error",
  statusMessage: "id is required for each item",
  displayMessage: "Please provide id for each inventory record",
});

const notFound = (id) => ({
  status: "error",
  statusMessage: `Inventory record ${id !== undefined ? id + " " : ""}not found`,
  displayMessage: "One or more inventory records could not be found",
});

const invalidEntry = (index, message) => ({
  status: "error",
  statusMessage: `Entry ${index + 1}: ${message}`,
  displayMessage: "Please provide all required fields",
});

/**
 * Validate an array of add-inventory entries.
 * Returns { index, error } for the first bad entry, or null if all valid.
 */
const validateAddEntries = (entries) => {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.productId || !e.businessId || e.quantity == null) {
      return { index: i, error: "productId, businessId and quantity are required" };
    }
    if (parseFloat(e.quantity) <= 0) {
      return { index: i, error: "quantity must be a positive number" };
    }
  }
  return null;
};

module.exports = {
  missingBusinessId,
  invalidArray,
  missingId,
  notFound,
  invalidEntry,
  validateAddEntries,
};
