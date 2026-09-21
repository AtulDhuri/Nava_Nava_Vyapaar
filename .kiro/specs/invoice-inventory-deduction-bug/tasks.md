# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Inventory Not Deducted on Invoice Creation
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Test Implementation**: Create an invoice with items containing valid productId values where inventory records exist. Verify currentStock is deducted from the inventory database and inventoryDeducted flag is true in the response.
  - **Concrete Failing Case**: Invoice with productId='PROD-TEST-001', qty=10, where inventory record exists with currentStock >= 10. After invoice creation, query inventory table for this product and verify currentStock decreased by 10. Check invoice response inventoryDeducted flag.
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists). inventoryDeducted will be false and currentStock will be unchanged.
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Soft Failure and Null ProductId Handling
  - **IMPORTANT**: Follow observation-first methodology
  - **Goal**: Verify that invoices with null productId items and soft-failure scenarios continue to work as expected
  - Observe: Current code creates invoices successfully even when inventory deduction fails
  - Observe: Items with null productId are filtered out and skipped (no deduction attempted)
  - Observe: inventoryError field contains failure information
  - Write property-based tests:
    1. For invoices with null productId items: Verify items array doesn't include null productIds in deduction request
    2. For inventory service unavailable (network error): Verify invoice is still created with inventoryDeducted=false
    3. For inventory service returning 500 error: Verify retry logic attempts, then soft-fails with error message
    4. For inventory service timeout: Verify timeout handling with retry logic
  - Verify tests PASS on UNFIXED code (confirms baseline behavior)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Fix inventory deduction response validation

  - [ ] 3.1 Implement response validation in billing controller
    - **Location**: `d:\Naya_Nava_Vyapaar\billing-service\src\controllers\billingController.js`
    - **Function**: `createInvoice` (lines ~75-85 in the inventory deduction try block)
    - **Change**: After receiving response from `inventoryClient.deductStock()`, inspect the response body to check if items were actually deducted
    - Replace simple `inventoryDeducted = true` with logic that checks:
      - If `deductionResponse.deducted` array is not empty, set `inventoryDeducted = true`
      - If `deductionResponse.deducted` array is empty and `skipped` array has items, generate detailed error message
      - Construct `inventoryError` string describing which items failed and why (from `skipped` reasons)
    - Handle partial deductions (some items deducted, some skipped) with appropriate messaging
    - _Bug_Condition: isBugCondition(input) where items have productId values_
    - _Expected_Behavior: deductionResponse.deducted contains deducted items_
    - _Preservation: Soft-failure behavior maintained, null productId items skipped, error messages generated_
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Inventory Successfully Deducted
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run the same test that failed in step 1, now on FIXED code
    - Verify that:
      - Invoice response shows `inventoryDeducted: true`
      - Database query shows `currentStock` decreased by the invoiced quantity
      - No `inventoryError` field for successful deductions
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Document test results
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Soft Failure and Null ProductId
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run all preservation property tests from step 2 on FIXED code
    - Verify that:
      - Null productId items continue to be skipped
      - Invoices are still created when inventory deduction fails
      - inventoryError contains descriptive messages for skipped items
      - Network errors and timeouts are still handled with soft failure
      - Retry logic still works for transient failures
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Document test results showing all preservation behaviors maintained
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run the full test suite for the billing service
  - Verify no other invoice creation functionality was affected
  - Confirm inventory deduction now works end-to-end
  - Verify soft-failure handling is intact (invoices created even if deduction fails)
  - Document results and any findings
