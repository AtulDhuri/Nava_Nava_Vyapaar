# Fix Inventory Add Database Query Error

## Problem Statement

Users encounter a critical error when trying to add inventory: "You must provide selection conditions in order to find a single row." This prevents any inventory from being added to the system.

## Root Cause Analysis

The error occurs in the `upsertRecord` function in `inventory-service/src/services/inventoryService.js` when TypeORM's `findOne()` method is called with invalid where conditions:

```javascript
let record = await manager.findOne(Inventory, {
  where: { businessId: parseInt(businessId), productId: parseInt(productId) },
});
```

**Root Causes:**
1. **Invalid parseInt() results**: If `businessId` or `productId` are null, undefined, empty string, or non-numeric, `parseInt()` returns `NaN`
2. **Missing validation**: No validation occurs before passing values to `parseInt()`
3. **TypeORM constraint**: TypeORM requires valid, non-null where conditions for `findOne()`
4. **Poor error handling**: The actual cause is masked by a generic database error

## Technical Design

### 1. Input Validation Layer

```javascript
const validateNumericId = (value, fieldName) => {
  if (value == null || value === '') {
    throw new Error(`${fieldName} is required and cannot be null or empty`);
  }
  
  const parsed = parseInt(value);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a valid positive integer, got: ${value}`);
  }
  
  return parsed;
};
```

### 2. Enhanced upsertRecord Function

```javascript
const upsertRecord = async (manager, entry, transactionType) => {
  const { productId, businessId, quantity, uom, lowStockThreshold, note } = entry;
  
  // Validate and parse IDs safely
  let validBusinessId, validProductId;
  try {
    validBusinessId = validateNumericId(businessId, 'businessId');
    validProductId = validateNumericId(productId, 'productId');
  } catch (error) {
    throw new Error(`Invalid input: ${error.message}`);
  }
  
  // Safe database query with validated IDs
  let record = await manager.findOne(Inventory, {
    where: { 
      businessId: validBusinessId, 
      productId: validProductId 
    },
  });
  
  // Rest of the function logic...
};
```

### 3. Consistent Error Handling

- **Client-facing errors**: Clear, actionable messages for API consumers
- **Server-side logging**: Detailed technical information for debugging
- **Error categorization**: Distinguish between validation errors and database errors

### 4. Enhanced Logging

```javascript
console.error('Inventory upsert error:', {
  originalEntry: entry,
  parsedIds: { businessId: validBusinessId, productId: validProductId },
  error: err.message,
  stack: err.stack
});
```

## Database Schema Constraints

The existing schema has a unique constraint on `(businessId, productId)` which supports the upsert logic. No schema changes needed.

## API Contract Preservation

The public API endpoints remain unchanged:
- Request/response formats stay the same
- HTTP status codes remain consistent
- Error response structure unchanged (only error messages improved)

## Edge Cases Handled

1. **Null/undefined IDs**: Clear validation error before database query
2. **Empty string IDs**: Treated as invalid input
3. **Non-numeric IDs**: Explicit parsing error with original value shown
4. **Zero/negative IDs**: Rejected as invalid business logic
5. **Float IDs**: Parsed as integers (e.g., "123.45" becomes 123)

## Testing Strategy

### Unit Tests
- Valid integer parsing
- Invalid input handling (null, undefined, empty, non-numeric)
- Database error scenarios
- Transaction rollback behavior

### Integration Tests  
- Full add inventory flow with valid data
- Error handling with various invalid inputs
- Bulk add operations
- Concurrent add operations

## Performance Impact

- **Minimal overhead**: Simple validation adds ~1ms per operation
- **Error prevention**: Reduces failed database queries
- **Better caching**: Valid queries can be cached more effectively

## Monitoring & Observability

- **Error metrics**: Track validation vs database errors separately
- **Performance monitoring**: Monitor add inventory operation latency
- **Alert thresholds**: Alert on error rate increases

## Rollback Plan

If issues arise:
1. Revert the enhanced validation logic
2. Keep improved logging for debugging
3. Monitor error patterns to refine approach