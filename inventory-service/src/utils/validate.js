/**
 * Shared validation helpers for inventory-service controllers.
 * Returns an error response object { status, statusMessage, displayMessage }
 * or null if valid. Controllers check the return value and short-circuit.
 */

/**
 * Safely validate and parse a numeric ID value.
 * Throws an error with a descriptive message if validation fails.
 * 
 * @param {any} value - The value to validate (could be string, number, null, undefined, etc.)
 * @param {string} fieldName - The name of the field being validated (for error messages)
 * @returns {number} - The parsed positive integer
 * @throws {Error} - If validation fails with descriptive message including original value
 */
const validateNumericId = (value, fieldName) => {
  // Check for null, undefined, or empty values
  if (value == null || value === '') {
    throw new Error(`${fieldName} is required and cannot be null or empty`);
  }

  // If it's a number, check if it's valid
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      throw new Error(`${fieldName} must be a positive integer, got: ${value}`);
    }
    return value;
  }

  // Convert to string and trim whitespace
  const stringValue = String(value).trim();
  
  // Check for empty after trimming
  if (stringValue === '') {
    throw new Error(`${fieldName} is required and cannot be null or empty`);
  }
  
  // Check if the string is purely numeric (positive integers only)
  if (!/^\d+$/.test(stringValue)) {
    throw new Error(`${fieldName} must be a valid positive integer, got: ${value}`);
  }

  // Parse the value
  const parsed = parseInt(stringValue, 10);
  
  // Final check: should be positive
  if (parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer, got: ${value}`);
  }

  return parsed;
};

/**
 * Safely validate and parse an alphanumeric product ID.
 * Allows letters, numbers, hyphens, and underscores.
 * Throws an error with a descriptive message if validation fails.
 * 
 * @param {any} value - The value to validate (could be string, number, null, undefined, etc.)
 * @param {string} fieldName - The name of the field being validated (for error messages)
 * @returns {string} - The trimmed string product ID
 * @throws {Error} - If validation fails with descriptive message including original value
 */
const validateAlphanumericId = (value, fieldName) => {
  // Check for null, undefined, or empty values
  if (value == null || value === '') {
    throw new Error(`${fieldName} is required and cannot be null or empty`);
  }

  // Convert to string and trim whitespace
  const stringValue = String(value).trim();
  
  // Check for empty after trimming
  if (stringValue === '') {
    throw new Error(`${fieldName} is required and cannot be null or empty`);
  }
  
  // Allow alphanumeric strings, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(stringValue)) {
    throw new Error(`${fieldName} must be alphanumeric (letters, numbers, hyphens, underscores), got: ${value}`);
  }

  return stringValue;
};

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
  validateNumericId,
  validateAlphanumericId,
  missingBusinessId,
  invalidArray,
  missingId,
  notFound,
  invalidEntry,
  validateAddEntries,
};
