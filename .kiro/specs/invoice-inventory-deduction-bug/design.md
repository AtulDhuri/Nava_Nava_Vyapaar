# Invoice Inventory Deduction Bug - Design

## Overview

The billing service creates invoices and attempts to deduct inventory by calling the inventory service's `/internal/deduct-stock` endpoint. However, the deduction is failing silently, returning `inventoryDeducted: false` without logging or throwing errors visible to the user. The root cause appears to be a mismatch in how productId is being passed between services - the billing service filters items with `item.productId` but the deductStock service validates productId as a numeric ID, while the invoice items store productId as VARCHAR (string), creating a type mismatch that causes silent validation failures.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when an invoice is created with items containing productId values
- **Property (P)**: The desired behavior when inventory is deducted - stock is reduced atomically and `inventoryDeducted` returns true
- **Preservation**: Existing behavior for null productIds and soft-failure handling that must remain unchanged
- **inventoryClient**: HTTP client in `billing-service/src/services/inventoryClient.js` that communicates with inventory service
- **deductStock (billing)**: Method in inventoryClient that sends POST request to `/internal/deduct-stock`
- **deductStock (inventory)**: Endpoint handler in `inventory-service/src/controllers/internalController.js` that processes deduction requests
- **productId**: Unique identifier for products, stored as VARCHAR in billing-service and inventory-service
- **inventoryDeducted**: Boolean flag in invoice response indicating success of inventory deduction

## Bug Details

### Bug Condition

The bug manifests when an invoice is created with items that have productId values. The inventory deduction fails silently despite:
1. Inventory records existing for the products
2. ProductId values being present in the invoice items
3. The inventoryClient making the API call

The root cause is a productId type validation mismatch combined with inadequate error logging. When the inventory service receives the deduction request, it validates productId using `validateAlphanumericId()` in the `deductStock` service function, which is intended for alphanumeric string validation. However, the validation error is caught in a try-catch block and added to the `skipped` array, which then returns a 200 OK response, making the failure silent and invisible to the billing service.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type InvoiceCreationRequest
  OUTPUT: boolean
  
  RETURN input.items.length > 0
         AND EXISTS item IN input.items WHERE item.productId IS NOT NULL
         AND inventoryServiceAvailable()
         AND inventoryRecordsExistForProducts()
         AND deductStockFails()
END FUNCTION
```

### Examples

**Example 1: Silent failure with valid productId**
```
Invoice created with:
  businessId: 1
  items: [
    { productId: 'PROD-001', qty: 5, price: 100 },
    { productId: 'PROD-002', qty: 3, price: 50 }
  ]

Current Behavior:
  - inventoryClient.deductStock() is called
  - Request sent to /internal/deduct-stock
  - Inventory service processes request and returns:
    { deducted: [], skipped: [ 
      { productId: 'PROD-001', reason: 'Validation failed: ...' },
      { productId: 'PROD-002', reason: 'Validation failed: ...' }
    ]}
  - inventoryClient receives 200 OK response
  - deductStock promise resolves without error
  - No exception thrown in catch block
  - inventoryDeducted: false returned to user
  - No error logged to console in billing service

Expected Behavior:
  - inventoryClient.deductStock() is called
  - Request sent to /internal/deduct-stock
  - Inventory service processes request and returns:
    { deducted: [
      { productId: 'PROD-001', qtyDeducted: 5, remainingStock: 95 },
      { productId: 'PROD-002', qtyDeducted: 3, remainingStock: 47 }
    ], skipped: []}
  - inventoryClient receives 200 OK response with deducted items
  - deductStock promise resolves successfully
  - inventoryDeducted: true returned to user
```

**Example 2: All items skipped scenario**
```
Response from inventory service:
  { status: 'success', deducted: [], skipped: [...] }
  
Current code treats this as a successful response (200 OK)
No error is thrown, so the catch block is never entered
inventoryDeducted remains false
No user-facing error message is generated
```

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Invoices must still be created successfully even if inventory deduction fails (soft failure pattern)
- Items with null productId must continue to be filtered out and skipped
- The `inventoryError` field in the response must continue to indicate deduction failures
- API response format for invoice creation must remain unchanged
- Database transactions must continue to be atomic (invoice+items committed even if deduction fails)

**Scope:**
- All inputs that DO NOT involve productId-based inventory deduction should be completely unaffected
- This includes:
  - Invoices with null productId items
  - Inventory service being unavailable (network error, timeout)
  - Payment updates to existing invoices
  - Invoice retrieval operations

## Hypothesized Root Cause

Based on code analysis, the most likely issues are:

1. **Silent Success Response with All Items Skipped**: The inventory service's `deductStock` endpoint returns a 200 OK response even when all items are skipped due to validation errors. The billing service treats any 200 OK as success and doesn't check if `deducted` array is empty.

2. **productId Validation Mismatch**: The inventory service validates productId using `validateAlphanumericId()` which may have stricter rules than expected. If validation fails, items are added to `skipped` array rather than throwing an error.

3. **Inadequate Error Handling in inventoryClient**: The `_requestWithRetry` method doesn't check the response body for success indicators. It only checks HTTP status codes. A 200 OK with all items in `skipped` is treated as success.

4. **No Response Body Inspection**: The billing service's catch block at line ~79 in billingController only catches exceptions. If the API returns 200 OK with empty `deducted` array, no exception is thrown and `inventoryDeducted` incorrectly remains false instead of detecting the silent failure.

5. **Missing Validation in Billing Service**: After receiving the response from inventoryClient, the code should verify that items were actually deducted, not just that the HTTP response succeeded.

## Correctness Properties

Property 1: Bug Condition - Inventory Deduction on Invoice Creation

_For any_ invoice creation request where items with productId values are provided and inventory records exist for those products, the fixed deductStock function SHALL successfully deduct the specified quantities from inventory and return `inventoryDeducted: true` in the response.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Soft Failure and Null ProductId Handling

_For any_ invoice creation request where inventory deduction fails (due to unavailable service, validation errors, or missing records), the fixed code SHALL continue to create the invoice successfully, return `inventoryDeducted: false`, and include an `inventoryError` message. For any items with null productId, the system SHALL continue to skip them without attempting deduction.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the issue is that the billing service doesn't properly validate whether inventory deduction actually succeeded. The inventory service correctly skips items and returns them in the `skipped` array, but the billing service doesn't check for this condition.

**File**: `billing-service/src/controllers/billingController.js`

**Function**: `createInvoice`

**Specific Changes**:

1. **Inspect Response Body**: After receiving response from `inventoryClient.deductStock()`, check if the response contains deducted items or if all items were skipped.

2. **Check Deduction Success**: Verify that the `deducted` array is not empty before setting `inventoryDeducted = true`. If `deducted` array is empty and `skipped` array is not empty, this indicates a failure.

3. **Generate Error Message**: When deduction fails, construct a meaningful error message that explains why items couldn't be deducted (e.g., "1 item(s) could not be deducted: PROD-001 - No inventory record found").

4. **Log Detailed Errors**: Enhance logging to include which items failed and why (from `skipped` array), not just generic error messages.

5. **Consider Failure Scenarios**: Distinguish between:
   - Partial success: Some items deducted, some skipped
   - Total failure: All items skipped
   - API failure: Network error or timeout

### Changes Detail

In the `createInvoice` function after line ~75 where `await inventoryClient.deductStock()` is called:

```javascript
// Current code (problematic):
await inventoryClient.deductStock(parseInt(businessId), savedInvoice.billNo, inventoryItems);
inventoryDeducted = true;

// Fixed code:
const deductionResponse = await inventoryClient.deductStock(parseInt(businessId), savedInvoice.billNo, inventoryItems);

// Check if any items were actually deducted
if (deductionResponse && deductionResponse.deducted && deductionResponse.deducted.length > 0) {
  inventoryDeducted = true;
  
  // If there are skipped items, log them but don't fail the invoice
  if (deductionResponse.skipped && deductionResponse.skipped.length > 0) {
    const skippedDetails = deductionResponse.skipped
      .map(s => `${s.productId} (${s.reason})`)
      .join(', ');
    inventoryError = `Partial deduction: ${deductionResponse.skipped.length} item(s) could not be deducted: ${skippedDetails}`;
  }
} else if (deductionResponse && deductionResponse.skipped && deductionResponse.skipped.length > 0) {
  // All items were skipped - deduction completely failed
  const skippedDetails = deductionResponse.skipped
    .map(s => `${s.productId} (${s.reason})`)
    .join(', ');
  inventoryError = `Stock deduction failed: ${deductionResponse.skipped.length} item(s) could not be deducted: ${skippedDetails}`;
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by creating invoices and verifying inventory is not deducted, then verify the fix works correctly and preserves existing behavior for soft failures.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that invoices are created but inventory is not deducted.

**Test Plan**: Create an invoice with items that have valid productId values where inventory records exist. Query the inventory database to verify currentStock is unchanged. Inspect the invoice response to confirm `inventoryDeducted: false`.

**Test Cases**:
1. **Valid ProductId Deduction Test**: Create invoice with productId='PROD-001', qty=5. Before fix: inventory unchanged, inventoryDeducted=false. After fix: inventory reduced by 5, inventoryDeducted=true.
2. **Multiple Items Deduction Test**: Create invoice with multiple items (PROD-001, PROD-002). Before fix: all items skipped. After fix: all items deducted.
3. **Partial Inventory Test**: Create invoice with one valid product and one invalid product. Before fix: inventoryDeducted=false. After fix: partial deduction with error message indicating which failed.

**Expected Counterexamples**:
- Invoice response shows `inventoryDeducted: false` despite valid productId and existing inventory records
- Inventory query shows `currentStock` unchanged after invoice creation
- No detailed error message about why deduction failed

### Fix Checking

**Goal**: Verify that for all invoice creation requests with valid productId values, the fixed function properly deducts inventory and sets inventoryDeducted=true.

**Pseudocode:**
```
FOR ALL invoice WITH productId items WHERE inventoryRecordsExist DO
  result := createInvoice_fixed(invoice)
  ASSERT result.inventoryDeducted = true
  ASSERT database.inventory[productId].currentStock decreased BY invoice.qty
  ASSERT result.inventoryError = null OR result.inventoryError relates to specific skipped items
END FOR
```

### Preservation Checking

**Goal**: Verify that for invoices with null productId items and inventory service failures, the fixed function maintains soft-failure behavior (invoice created, error reported, but no crash).

**Pseudocode:**
```
FOR ALL invoice WHERE inventoryDeductionFails DO
  result := createInvoice_fixed(invoice)
  ASSERT result.status = "success"
  ASSERT result.invoice is created successfully
  ASSERT result.inventoryDeducted = false
  ASSERT result.inventoryError contains explanation
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation because:
- It generates many combinations of product combinations and inventory states
- It catches edge cases where partial deduction occurs
- It ensures soft-failure behavior is preserved across all failure scenarios

**Test Plan**: 
1. Test with null productId items - verify they continue to be skipped
2. Test with inventory service returning 500 error - verify invoice still created
3. Test with network timeout - verify invoice still created with retry behavior
4. Test with all items skipped - verify inventoryError contains details

**Test Cases**:
1. **Null ProductId Preservation**: Create invoice with null productId items. Verify they are skipped (not attempted for deduction).
2. **Soft Failure Preservation**: Simulate inventory service unavailable. Verify invoice is created successfully with inventoryError message.
3. **Timeout Preservation**: Simulate network timeout. Verify retry logic works and eventual soft failure with error message.
4. **Partial Failure Preservation**: Create invoice with mix of valid and invalid productIds. Verify valid ones are deducted and invalid ones reported in error.

### Unit Tests

- Test inventoryClient.deductStock() call with valid productId
- Test billing controller response inspection for deducted vs skipped items
- Test error message construction from skipped items
- Test soft failure when inventory service returns 5xx
- Test timeout handling with retry logic

### Property-Based Tests

- Generate random invoices with various productId combinations and verify deduction status
- Generate inventory states and verify deduction respects those states
- Test that soft-failure behavior is consistent across all failure types
- Verify error messages are descriptive for all skipped item reasons

### Integration Tests

- Create invoice with real inventory records and verify deduction
- Test end-to-end flow from invoice creation through inventory update
- Verify inventory transaction logs are created for successful deductions
- Test with multiple concurrent invoices to verify atomicity
