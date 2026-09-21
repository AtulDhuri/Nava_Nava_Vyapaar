/**
 * Unit tests for validate.js utility functions
 */

const {
  validateNumericId,
  missingBusinessId,
  invalidArray,
  missingId,
  notFound,
  invalidEntry,
  validateAddEntries,
} = require("../utils/validate");

describe("validateNumericId", () => {
  describe("Valid positive integers", () => {
    test("should accept number 1", () => {
      expect(validateNumericId(1, "businessId")).toBe(1);
    });

    test("should accept number 123", () => {
      expect(validateNumericId(123, "productId")).toBe(123);
    });

    test("should accept string '456'", () => {
      expect(validateNumericId("456", "businessId")).toBe(456);
    });

    test("should accept string with leading/trailing whitespace ' 789 '", () => {
      expect(validateNumericId(" 789 ", "businessId")).toBe(789);
    });

    test("should accept large number", () => {
      const largeNum = 999999999;
      expect(validateNumericId(largeNum, "businessId")).toBe(largeNum);
    });

    test("should accept string representation of large number", () => {
      const largeNumStr = "999999999";
      expect(validateNumericId(largeNumStr, "businessId")).toBe(999999999);
    });
  });

  describe("Invalid inputs", () => {
    test("should throw error for null", () => {
      expect(() => validateNumericId(null, "businessId")).toThrow(
        "businessId is required and cannot be null or empty"
      );
    });

    test("should throw error for undefined", () => {
      expect(() => validateNumericId(undefined, "businessId")).toThrow(
        "businessId is required and cannot be null or empty"
      );
    });

    test("should throw error for empty string", () => {
      expect(() => validateNumericId("", "businessId")).toThrow(
        "businessId is required and cannot be null or empty"
      );
    });

    test("should throw error for NaN", () => {
      expect(() => validateNumericId(NaN, "businessId")).toThrow(
        "businessId must be a positive integer, got: NaN"
      );
    });

    test("should throw error for negative number", () => {
      expect(() => validateNumericId(-1, "businessId")).toThrow(
        "businessId must be a positive integer, got: -1"
      );
    });

    test("should throw error for negative string", () => {
      expect(() => validateNumericId("-123", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: -123"
      );
    });

    test("should throw error for float/decimal number", () => {
      expect(() => validateNumericId(12.5, "businessId")).toThrow(
        "businessId must be a positive integer, got: 12.5"
      );
    });

    test("should throw error for float string", () => {
      expect(() => validateNumericId("12.5", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: 12.5"
      );
    });

    test("should throw error for string with non-numeric characters", () => {
      expect(() => validateNumericId("123abc", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: 123abc"
      );
    });

    test("should throw error for string with special characters", () => {
      expect(() => validateNumericId("$123", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: $123"
      );
    });

    test("should throw error for boolean true", () => {
      expect(() => validateNumericId(true, "businessId")).toThrow(
        "businessId must be a valid positive integer, got: true"
      );
    });

    test("should throw error for boolean false", () => {
      expect(() => validateNumericId(false, "businessId")).toThrow(
        "businessId must be a valid positive integer, got: false"
      );
    });
  });

  describe("Edge cases", () => {
    test("should throw error for zero", () => {
      expect(() => validateNumericId(0, "businessId")).toThrow(
        "businessId must be a positive integer, got: 0"
      );
    });

    test("should throw error for string '0'", () => {
      expect(() => validateNumericId("0", "businessId")).toThrow(
        "businessId must be a positive integer, got: 0"
      );
    });

    test("should throw error for Infinity", () => {
      expect(() => validateNumericId(Infinity, "businessId")).toThrow(
        "businessId must be a positive integer, got: Infinity"
      );
    });

    test("should throw error for -Infinity", () => {
      expect(() => validateNumericId(-Infinity, "businessId")).toThrow(
        "businessId must be a positive integer, got: -Infinity"
      );
    });

    test("should throw error for string with only whitespace", () => {
      expect(() => validateNumericId("   ", "businessId")).toThrow(
        "businessId is required and cannot be null or empty"
      );
    });
  });

  describe("Error messages include original values", () => {
    test("should include original value in error message for null", () => {
      try {
        validateNumericId(null, "businessId");
      } catch (err) {
        expect(err.message).toContain("null");
      }
    });

    test("should include original value in error message for NaN", () => {
      try {
        validateNumericId(NaN, "productId");
      } catch (err) {
        expect(err.message).toContain("NaN");
      }
    });

    test("should include original value in error message for negative number", () => {
      try {
        validateNumericId(-5, "businessId");
      } catch (err) {
        expect(err.message).toContain("-5");
      }
    });

    test("should include field name in error message", () => {
      try {
        validateNumericId("invalid", "customField");
      } catch (err) {
        expect(err.message).toContain("customField");
      }
    });
  });
});

describe("Helper functions", () => {
  describe("missingBusinessId", () => {
    test("should return correct error object", () => {
      const result = missingBusinessId();
      expect(result).toEqual({
        status: "error",
        statusMessage: "businessId is required",
        displayMessage: "Please provide a business ID",
      });
    });
  });

  describe("invalidArray", () => {
    test("should return default error for entries", () => {
      const result = invalidArray();
      expect(result).toEqual({
        status: "error",
        statusMessage: "Request body must be a non-empty array",
        displayMessage: "Please provide an array of entries",
      });
    });

    test("should return custom entity error", () => {
      const result = invalidArray("items");
      expect(result).toEqual({
        status: "error",
        statusMessage: "Request body must be a non-empty array",
        displayMessage: "Please provide an array of items",
      });
    });
  });

  describe("missingId", () => {
    test("should return correct error object", () => {
      const result = missingId();
      expect(result).toEqual({
        status: "error",
        statusMessage: "id is required for each item",
        displayMessage: "Please provide id for each inventory record",
      });
    });
  });

  describe("notFound", () => {
    test("should return error without id", () => {
      const result = notFound();
      expect(result).toEqual({
        status: "error",
        statusMessage: "Inventory record not found",
        displayMessage: "One or more inventory records could not be found",
      });
    });

    test("should return error with id", () => {
      const result = notFound(123);
      expect(result).toEqual({
        status: "error",
        statusMessage: "Inventory record 123 not found",
        displayMessage: "One or more inventory records could not be found",
      });
    });
  });

  describe("invalidEntry", () => {
    test("should return error for index 0", () => {
      const result = invalidEntry(0, "productId is required");
      expect(result).toEqual({
        status: "error",
        statusMessage: "Entry 1: productId is required",
        displayMessage: "Please provide all required fields",
      });
    });

    test("should return error for index 2", () => {
      const result = invalidEntry(2, "quantity must be positive");
      expect(result).toEqual({
        status: "error",
        statusMessage: "Entry 3: quantity must be positive",
        displayMessage: "Please provide all required fields",
      });
    });
  });
});

describe("validateAddEntries", () => {
  describe("Valid entries", () => {
    test("should return null for valid single entry", () => {
      const entries = [{ productId: 1, businessId: 2, quantity: 10 }];
      expect(validateAddEntries(entries)).toBeNull();
    });

    test("should return null for valid multiple entries", () => {
      const entries = [
        { productId: 1, businessId: 2, quantity: 10 },
        { productId: 3, businessId: 4, quantity: 20 },
      ];
      expect(validateAddEntries(entries)).toBeNull();
    });

    test("should reject zero quantity", () => {
      const entries = [{ productId: 1, businessId: 2, quantity: 0 }];
      expect(validateAddEntries(entries)).toEqual({
        index: 0,
        error: "quantity must be a positive number",
      });
    });

    test("should accept positive float quantity", () => {
      const entries = [{ productId: 1, businessId: 2, quantity: 10.5 }];
      expect(validateAddEntries(entries)).toBeNull();
    });

    test("should accept string quantity that parses to number", () => {
      const entries = [{ productId: "1", businessId: "2", quantity: "10" }];
      expect(validateAddEntries(entries)).toBeNull();
    });

    test("should accept optional fields", () => {
      const entries = [
        {
          productId: 1,
          businessId: 2,
          quantity: 10,
          uom: "pcs",
          lowStockThreshold: 5,
          note: "Test",
        },
      ];
      expect(validateAddEntries(entries)).toBeNull();
    });
  });

  describe("Invalid entries", () => {
    test("should detect missing productId", () => {
      const entries = [{ businessId: 2, quantity: 10 }];
      const result = validateAddEntries(entries);
      expect(result).toEqual({
        index: 0,
        error: "productId, businessId and quantity are required",
      });
    });

    test("should detect missing businessId", () => {
      const entries = [{ productId: 1, quantity: 10 }];
      const result = validateAddEntries(entries);
      expect(result).toEqual({
        index: 0,
        error: "productId, businessId and quantity are required",
      });
    });

    test("should detect missing quantity", () => {
      const entries = [{ productId: 1, businessId: 2 }];
      const result = validateAddEntries(entries);
      expect(result).toEqual({
        index: 0,
        error: "productId, businessId and quantity are required",
      });
    });

    test("should detect null quantity", () => {
      const entries = [{ productId: 1, businessId: 2, quantity: null }];
      const result = validateAddEntries(entries);
      expect(result).toEqual({
        index: 0,
        error: "productId, businessId and quantity are required",
      });
    });

    test("should detect undefined quantity", () => {
      const entries = [{ productId: 1, businessId: 2, quantity: undefined }];
      const result = validateAddEntries(entries);
      expect(result).toEqual({
        index: 0,
        error: "productId, businessId and quantity are required",
      });
    });

    test("should detect negative quantity", () => {
      const entries = [{ productId: 1, businessId: 2, quantity: -5 }];
      const result = validateAddEntries(entries);
      expect(result).toEqual({
        index: 0,
        error: "quantity must be a positive number",
      });
    });

    test("should detect zero quantity as invalid", () => {
      const entries = [{ productId: 1, businessId: 2, quantity: 0 }];
      const result = validateAddEntries(entries);
      expect(result).toEqual({
        index: 0,
        error: "quantity must be a positive number",
      });
    });

    test("should detect first invalid entry in multiple entries", () => {
      const entries = [
        { productId: 1, businessId: 2, quantity: -5 },
        { productId: 3, businessId: 4, quantity: 10 },
      ];
      const result = validateAddEntries(entries);
      expect(result).toEqual({
        index: 0,
        error: "quantity must be a positive number",
      });
    });

    test("should detect empty array as valid", () => {
      const entries = [];
      expect(validateAddEntries(entries)).toBeNull();
    });
  });
});
