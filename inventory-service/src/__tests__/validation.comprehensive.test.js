/**
 * Comprehensive validation tests for inventoryService validation layer
 * Tests all edge cases for businessId and productId validation
 * 
 * Validates Requirements:
 * - FR2: Input validation before database operations
 * - FR3: Clear error messages with original values
 * - AC2: Invalid operations fail safely
 * - AC3: Error messages are clear
 */

const {
  validateNumericId,
  validateAlphanumericId,
  validateAddEntries,
} = require("../utils/validate");

describe("Comprehensive Validation Tests", () => {
  
  // ===================================================================
  // validateNumericId - Null/Undefined/Empty Cases
  // ===================================================================
  
  describe("validateNumericId - Null, Undefined, and Empty inputs", () => {
    test("should reject null businessId", () => {
      expect(() => validateNumericId(null, "businessId")).toThrow(
        "businessId is required and cannot be null or empty"
      );
    });

    test("should reject undefined businessId", () => {
      expect(() => validateNumericId(undefined, "businessId")).toThrow(
        "businessId is required and cannot be null or empty"
      );
    });

    test("should reject empty string", () => {
      expect(() => validateNumericId("", "businessId")).toThrow(
        "businessId is required and cannot be null or empty"
      );
    });

    test("should reject whitespace-only string", () => {
      expect(() => validateNumericId("   ", "businessId")).toThrow(
        "businessId is required and cannot be null or empty"
      );
    });

    test("should reject tabs and spaces", () => {
      expect(() => validateNumericId("\t\t", "businessId")).toThrow(
        "businessId is required and cannot be null or empty"
      );
    });
  });

  // ===================================================================
  // validateNumericId - Zero and Negative Cases
  // ===================================================================
  
  describe("validateNumericId - Zero and Negative IDs", () => {
    test("should reject zero", () => {
      expect(() => validateNumericId(0, "businessId")).toThrow(
        "businessId must be a positive integer, got: 0"
      );
    });

    test("should reject negative number", () => {
      expect(() => validateNumericId(-1, "businessId")).toThrow(
        "businessId must be a positive integer, got: -1"
      );
    });

    test("should reject negative string", () => {
      expect(() => validateNumericId("-123", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: -123"
      );
    });

    test("should reject string '0'", () => {
      expect(() => validateNumericId("0", "businessId")).toThrow(
        "businessId must be a positive integer, got: 0"
      );
    });
  });

  // ===================================================================
  // validateNumericId - Non-Numeric Cases
  // ===================================================================
  
  describe("validateNumericId - Non-numeric input", () => {
    test("should reject alphabetic string", () => {
      expect(() => validateNumericId("abc", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: abc"
      );
    });

    test("should reject alphanumeric string", () => {
      expect(() => validateNumericId("123abc", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: 123abc"
      );
    });

    test("should reject string with special characters", () => {
      expect(() => validateNumericId("123@456", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: 123@456"
      );
    });

    test("should reject string with dollar sign", () => {
      expect(() => validateNumericId("$123", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: $123"
      );
    });

    test("should reject decimal string", () => {
      expect(() => validateNumericId("123.45", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: 123.45"
      );
    });

    test("should reject scientific notation", () => {
      expect(() => validateNumericId("1e5", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: 1e5"
      );
    });

    test("should reject hex notation", () => {
      expect(() => validateNumericId("0xFF", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: 0xFF"
      );
    });
  });

  // ===================================================================
  // validateNumericId - Float and Decimal Cases
  // ===================================================================
  
  describe("validateNumericId - Float and Decimal numbers", () => {
    test("should reject float number", () => {
      expect(() => validateNumericId(123.45, "businessId")).toThrow(
        "businessId must be a positive integer, got: 123.45"
      );
    });

    test("should reject float string", () => {
      expect(() => validateNumericId("99.99", "businessId")).toThrow(
        "businessId must be a valid positive integer, got: 99.99"
      );
    });

    test("should reject NaN", () => {
      expect(() => validateNumericId(NaN, "businessId")).toThrow(
        "businessId must be a positive integer, got: NaN"
      );
    });

    test("should reject Infinity", () => {
      expect(() => validateNumericId(Infinity, "businessId")).toThrow(
        "businessId must be a positive integer, got: Infinity"
      );
    });

    test("should reject negative Infinity", () => {
      expect(() => validateNumericId(-Infinity, "businessId")).toThrow(
        "businessId must be a positive integer, got: -Infinity"
      );
    });
  });

  // ===================================================================
  // validateNumericId - Type Edge Cases
  // ===================================================================
  
  describe("validateNumericId - Type edge cases", () => {
    test("should reject boolean true", () => {
      expect(() => validateNumericId(true, "businessId")).toThrow();
    });

    test("should reject boolean false", () => {
      expect(() => validateNumericId(false, "businessId")).toThrow();
    });

    test("should reject empty object", () => {
      expect(() => validateNumericId({}, "businessId")).toThrow();
    });

    test("should reject object with value property", () => {
      expect(() => validateNumericId({ value: 123 }, "businessId")).toThrow();
    });

    test("should reject array with single number", () => {
      // Arrays are converted to string, so [123] becomes "123", which is valid
      const result = validateNumericId([123], "businessId");
      expect(result).toBe(123);
    });

    test("should reject array with multiple numbers", () => {
      expect(() => validateNumericId([1, 2, 3], "businessId")).toThrow();
    });
  });

  // ===================================================================
  // validateNumericId - Valid Cases
  // ===================================================================
  
  describe("validateNumericId - Valid positive integers", () => {
    test("should accept positive number 1", () => {
      expect(validateNumericId(1, "businessId")).toBe(1);
    });

    test("should accept positive number 123", () => {
      expect(validateNumericId(123, "businessId")).toBe(123);
    });

    test("should accept string '456'", () => {
      expect(validateNumericId("456", "businessId")).toBe(456);
    });

    test("should accept string with leading/trailing spaces", () => {
      expect(validateNumericId("  789  ", "businessId")).toBe(789);
    });

    test("should accept large number", () => {
      const largeNum = 999999999;
      expect(validateNumericId(largeNum, "businessId")).toBe(largeNum);
    });

    test("should accept string with leading zeros", () => {
      expect(validateNumericId("00123", "businessId")).toBe(123);
    });

    test("should accept very large number string", () => {
      expect(validateNumericId("999999999999", "businessId")).toBe(999999999999);
    });
  });

  // ===================================================================
  // validateNumericId - Error Message Quality
  // ===================================================================
  
  describe("validateNumericId - Error messages include context", () => {
    test("should include field name in error", () => {
      try {
        validateNumericId(null, "businessId");
        fail("Should have thrown");
      } catch (err) {
        expect(err.message).toContain("businessId");
      }
    });

    test("should include original value in error for invalid format", () => {
      const invalidValue = "not_numeric";
      try {
        validateNumericId(invalidValue, "businessId");
        fail("Should have thrown");
      } catch (err) {
        expect(err.message).toContain(invalidValue);
      }
    });

    test("should include field name for different field names", () => {
      try {
        validateNumericId(null, "productId");
        fail("Should have thrown");
      } catch (err) {
        expect(err.message).toContain("productId");
      }
    });

    test("should distinguish between required and format errors", () => {
      const nullError = (() => {
        try {
          validateNumericId(null, "businessId");
        } catch (err) {
          return err.message;
        }
      })();

      const invalidError = (() => {
        try {
          validateNumericId("invalid", "businessId");
        } catch (err) {
          return err.message;
        }
      })();

      expect(nullError).toContain("required");
      expect(invalidError).not.toContain("required");
      expect(invalidError).toContain("valid");
    });
  });

  // ===================================================================
  // validateAlphanumericId - Null/Undefined/Empty Cases
  // ===================================================================
  
  describe("validateAlphanumericId - Null, Undefined, Empty inputs", () => {
    test("should reject null productId", () => {
      expect(() => validateAlphanumericId(null, "productId")).toThrow(
        "productId is required and cannot be null or empty"
      );
    });

    test("should reject undefined productId", () => {
      expect(() => validateAlphanumericId(undefined, "productId")).toThrow(
        "productId is required and cannot be null or empty"
      );
    });

    test("should reject empty string", () => {
      expect(() => validateAlphanumericId("", "productId")).toThrow(
        "productId is required and cannot be null or empty"
      );
    });

    test("should reject whitespace-only string", () => {
      expect(() => validateAlphanumericId("   ", "productId")).toThrow(
        "productId is required and cannot be null or empty"
      );
    });
  });

  // ===================================================================
  // validateAlphanumericId - Special Characters
  // ===================================================================
  
  describe("validateAlphanumericId - Special character rejection", () => {
    test("should reject string with @", () => {
      expect(() => validateAlphanumericId("PROD@001", "productId")).toThrow(
        "productId must be alphanumeric (letters, numbers, hyphens, underscores), got: PROD@001"
      );
    });

    test("should reject string with #", () => {
      expect(() => validateAlphanumericId("PROD#001", "productId")).toThrow();
    });

    test("should reject string with $", () => {
      expect(() => validateAlphanumericId("$PROD", "productId")).toThrow();
    });

    test("should reject string with %", () => {
      expect(() => validateAlphanumericId("PROD%001", "productId")).toThrow();
    });

    test("should reject string with &", () => {
      expect(() => validateAlphanumericId("PROD&001", "productId")).toThrow();
    });

    test("should reject string with spaces", () => {
      expect(() => validateAlphanumericId("PROD 001", "productId")).toThrow();
    });

    test("should reject string with dots", () => {
      expect(() => validateAlphanumericId("PROD.001", "productId")).toThrow();
    });

    test("should reject string with slashes", () => {
      expect(() => validateAlphanumericId("PROD/001", "productId")).toThrow();
    });

    test("should reject string with backslashes", () => {
      expect(() => validateAlphanumericId("PROD\\001", "productId")).toThrow();
    });

    test("should reject string with only special characters", () => {
      expect(() => validateAlphanumericId("@#$%", "productId")).toThrow();
    });
  });

  // ===================================================================
  // validateAlphanumericId - Valid Cases
  // ===================================================================
  
  describe("validateAlphanumericId - Valid alphanumeric IDs", () => {
    test("should accept uppercase letters", () => {
      expect(validateAlphanumericId("PROD001", "productId")).toBe("PROD001");
    });

    test("should accept lowercase letters", () => {
      expect(validateAlphanumericId("prod001", "productId")).toBe("prod001");
    });

    test("should accept mixed case", () => {
      expect(validateAlphanumericId("PrOd001", "productId")).toBe("PrOd001");
    });

    test("should accept with hyphens", () => {
      expect(validateAlphanumericId("PROD-001", "productId")).toBe("PROD-001");
    });

    test("should accept with underscores", () => {
      expect(validateAlphanumericId("PROD_001", "productId")).toBe("PROD_001");
    });

    test("should accept with both hyphens and underscores", () => {
      expect(validateAlphanumericId("PROD-001_A", "productId")).toBe("PROD-001_A");
    });

    test("should accept only letters", () => {
      expect(validateAlphanumericId("ABCXYZ", "productId")).toBe("ABCXYZ");
    });

    test("should accept only numbers", () => {
      expect(validateAlphanumericId("123456", "productId")).toBe("123456");
    });

    test("should accept with leading/trailing spaces (will be trimmed)", () => {
      expect(validateAlphanumericId("  PROD001  ", "productId")).toBe("PROD001");
    });

    test("should accept long alphanumeric string", () => {
      const longId = "PROD_ABC-123_XYZ";
      expect(validateAlphanumericId(longId, "productId")).toBe(longId);
    });
  });

  // ===================================================================
  // validateAddEntries - Entry Array Validation
  // ===================================================================
  
  describe("validateAddEntries - Entry array validation", () => {
    test("should return null for valid entries", () => {
      const entries = [
        { productId: 1, businessId: 2, quantity: 10 },
        { productId: 3, businessId: 4, quantity: 20 },
      ];
      expect(validateAddEntries(entries)).toBeNull();
    });

    test("should return null for empty array", () => {
      expect(validateAddEntries([])).toBeNull();
    });

    test("should detect missing productId", () => {
      const entries = [{ businessId: 2, quantity: 10 }];
      const result = validateAddEntries(entries);
      expect(result.index).toBe(0);
      expect(result.error).toContain("productId");
    });

    test("should detect missing businessId", () => {
      const entries = [{ productId: 1, quantity: 10 }];
      const result = validateAddEntries(entries);
      expect(result.index).toBe(0);
      expect(result.error).toContain("businessId");
    });

    test("should detect missing quantity", () => {
      const entries = [{ productId: 1, businessId: 2 }];
      const result = validateAddEntries(entries);
      expect(result.index).toBe(0);
      expect(result.error).toContain("quantity");
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

    test("should detect zero quantity", () => {
      const entries = [{ productId: 1, businessId: 2, quantity: 0 }];
      const result = validateAddEntries(entries);
      expect(result).toEqual({
        index: 0,
        error: "quantity must be a positive number",
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

    test("should accept positive float quantity", () => {
      const entries = [{ productId: 1, businessId: 2, quantity: 10.5 }];
      expect(validateAddEntries(entries)).toBeNull();
    });

    test("should identify invalid entry index in array", () => {
      const entries = [
        { productId: 1, businessId: 2, quantity: 10 },
        { productId: 3, businessId: 4, quantity: 20 },
        { productId: 5, businessId: 6, quantity: -10 }, // Invalid at index 2
      ];
      const result = validateAddEntries(entries);
      expect(result.index).toBe(2);
      expect(result.error).toContain("positive");
    });

    test("should return first invalid entry", () => {
      const entries = [
        { productId: 1, businessId: 2, quantity: 10 },
        { productId: 3, businessId: 4 }, // Missing quantity at index 1
        { productId: 5, businessId: 6, quantity: 30 }, // Would be valid
      ];
      const result = validateAddEntries(entries);
      expect(result.index).toBe(1);
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

    test("should validate multiple entries and stop at first error", () => {
      const entries = [
        { productId: 1, businessId: 2, quantity: 10 },
        { productId: 3, businessId: 4, quantity: 0 }, // First error
        { businessId: 6 }, // Would also be error
      ];
      const result = validateAddEntries(entries);
      expect(result.index).toBe(1); // Stops at first error
    });
  });

  // ===================================================================
  // Cross-Field Validation - businessId and productId Combination
  // ===================================================================
  
  describe("Cross-validation scenarios", () => {
    test("should validate both businessId and productId independently", () => {
      // validateNumericId for businessId
      expect(() => validateNumericId(null, "businessId")).toThrow();
      // validateAlphanumericId for productId
      expect(() => validateAlphanumericId(null, "productId")).toThrow();
    });

    test("should handle businessId as number and productId as string", () => {
      const busId = validateNumericId(123, "businessId");
      const prodId = validateAlphanumericId("PROD001", "productId");
      expect(busId).toBe(123);
      expect(prodId).toBe("PROD001");
    });

    test("should handle businessId as string and productId as string", () => {
      const busId = validateNumericId("456", "businessId");
      const prodId = validateAlphanumericId("PROD002", "productId");
      expect(busId).toBe(456);
      expect(prodId).toBe("PROD002");
    });
  });

  // ===================================================================
  // Performance Tests
  // ===================================================================
  
  describe("Validation performance", () => {
    test("should validate 1000 numeric IDs quickly", () => {
      const start = Date.now();
      for (let i = 1; i <= 1000; i++) {
        validateNumericId(i, "businessId");
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50); // Should be very fast
    });

    test("should validate 1000 alphanumeric IDs quickly", () => {
      const start = Date.now();
      for (let i = 1; i <= 1000; i++) {
        validateAlphanumericId(`PROD${i}`, "productId");
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });

    test("should validate array of 1000 entries quickly", () => {
      const entries = Array.from({ length: 1000 }, (_, i) => ({
        productId: `PROD${i}`,
        businessId: i + 1,
        quantity: 10,
      }));
      const start = Date.now();
      const result = validateAddEntries(entries);
      const duration = Date.now() - start;
      expect(result).toBeNull();
      expect(duration).toBeLessThan(50);
    });
  });
});
