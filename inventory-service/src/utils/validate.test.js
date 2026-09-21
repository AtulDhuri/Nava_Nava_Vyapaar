/**
 * Unit tests for validateNumericId function
 * Tests all edge cases and validation scenarios
 */

const assert = require('assert');
const { validateNumericId } = require('./validate');

/**
 * Test helper to assert that a function throws an error with expected message
 */
function assertThrows(fn, expectedMessageSubstring) {
  try {
    fn();
    assert.fail('Expected function to throw an error');
  } catch (error) {
    assert(error.message.includes(expectedMessageSubstring), 
      `Expected error message to contain "${expectedMessageSubstring}", got: ${error.message}`);
  }
}

/**
 * Test helper to run all tests and report results
 */
function runTests() {
  const tests = [
    testValidPositiveIntegers,
    testValidStringIntegers,
    testNullAndUndefinedValues,
    testEmptyStringValues,
    testNonNumericStrings,
    testZeroAndNegativeValues,
    testFloatValues,
    testOriginalValueInErrorMessage,
    testFieldNameInErrorMessage
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      test();
      console.log(`✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${test.name}: ${error.message}`);
      failed++;
    }
  });

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Test Cases

function testValidPositiveIntegers() {
  assert.strictEqual(validateNumericId(1, 'testId'), 1);
  assert.strictEqual(validateNumericId(123, 'testId'), 123);
  assert.strictEqual(validateNumericId(999999, 'testId'), 999999);
}

function testValidStringIntegers() {
  assert.strictEqual(validateNumericId('1', 'testId'), 1);
  assert.strictEqual(validateNumericId('123', 'testId'), 123);
  assert.strictEqual(validateNumericId('999999', 'testId'), 999999);
}

function testNullAndUndefinedValues() {
  assertThrows(() => validateNumericId(null, 'businessId'), 'businessId is required and cannot be null or empty');
  assertThrows(() => validateNumericId(undefined, 'productId'), 'productId is required and cannot be null or empty');
}

function testEmptyStringValues() {
  assertThrows(() => validateNumericId('', 'businessId'), 'businessId is required and cannot be null or empty');
  assertThrows(() => validateNumericId('   ', 'productId'), 'productId is required and cannot be null or empty');
}

function testNonNumericStrings() {
  assertThrows(() => validateNumericId('abc', 'businessId'), 'businessId must be a valid positive integer, got: abc');
  assertThrows(() => validateNumericId('12abc', 'productId'), 'productId must be a valid positive integer, got: 12abc');
  assertThrows(() => validateNumericId('not-a-number', 'businessId'), 'businessId must be a valid positive integer, got: not-a-number');
}

function testZeroAndNegativeValues() {
  assertThrows(() => validateNumericId(0, 'businessId'), 'businessId must be a positive integer, got: 0');
  assertThrows(() => validateNumericId(-1, 'productId'), 'productId must be a positive integer, got: -1');
  assertThrows(() => validateNumericId('-5', 'businessId'), 'businessId must be a valid positive integer, got: -5');
}

function testFloatValues() {
  // Float numbers should be rejected as they're not integers
  assertThrows(() => validateNumericId(123.45, 'testId'), 'testId must be a positive integer');
  // String floats should also be rejected due to decimal point
  assertThrows(() => validateNumericId('123.99', 'testId'), 'testId must be a valid positive integer');
}

function testOriginalValueInErrorMessage() {
  assertThrows(() => validateNumericId('invalid-value', 'testId'), 'got: invalid-value');
  assertThrows(() => validateNumericId(-42, 'testId'), 'got: -42');
  assertThrows(() => validateNumericId(0, 'testId'), 'got: 0');
}

function testFieldNameInErrorMessage() {
  assertThrows(() => validateNumericId(null, 'businessId'), 'businessId is required');
  assertThrows(() => validateNumericId('abc', 'productId'), 'productId must be a valid');
  assertThrows(() => validateNumericId(-1, 'customFieldName'), 'customFieldName must be a positive');
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };