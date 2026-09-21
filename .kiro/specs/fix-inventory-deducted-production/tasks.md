# Tasks: Fix inventoryDeducted False in Production

## Task 1: Create InventoryClient with Connection Pooling and Retry Logic

**Type**: Implementation
**Priority**: High
**Dependencies**: None

Create a reusable HTTP client for inter-service communication with connection pooling, configurable timeouts, and exponential backoff retry logic.

**Subtasks**:
- [ ] Create `billing-service/src/services/inventoryClient.js` with:
  - HTTP/HTTPS agents with keepAlive enabled
  - Configurable timeout (default 10s, from `INTER_SERVICE_TIMEOUT_MS` env var)
  - Retry logic with exponential backoff (2 retries: 100ms, 200ms)
  - Proper error classification (retryable vs non-retryable)
  - Comprehensive error logging with stack traces
- [ ] Export as singleton so agents are reused across requests
- [ ] Add JSDoc comments documenting the API

**Acceptance Criteria**:
- ✅ Client successfully makes requests to inventory service
- ✅ Timeouts are respected (test with mock server delay)
- ✅ Retries occur for transient failures (connection errors, 5xx)
- ✅ No retries for permanent errors (400, 403, 404)
- ✅ Connection pooling logs show agent reuse
- ✅ Code compiles without errors

---

## Task 2: Update Billing Controller to Use InventoryClient

**Type**: Implementation
**Priority**: High
**Dependencies**: Task 1

Replace the inline HTTP request code in `billingController.js` with calls to the new InventoryClient.

**Subtasks**:
- [ ] Import the new inventoryClient in billingController
- [ ] Replace lines 90-149 (the inline Promise-based HTTP request) with inventoryClient.deductStock() call
- [ ] Keep the soft-failure behavior (billing never blocks on inventory error)
- [ ] Ensure `inventoryError` is included in response when present
- [ ] Add structured logging for inventory deduction failures
- [ ] Verify no breaking changes to API response format

**Acceptance Criteria**:
- ✅ Invoice creation still succeeds even if inventory deduction fails
- ✅ Response includes `inventoryDeducted: true` on success
- ✅ Response includes `inventoryError` on failure
- ✅ Error logs include billNo, businessId, error message, and stack trace
- ✅ Code compiles without errors
- ✅ No TypeErrors or undefined references

---

## Task 3: Configure Production Environment Variables

**Type**: Configuration
**Priority**: High
**Dependencies**: None

Add and document the new timeout configuration in production environment files.

**Subtasks**:
- [ ] Add `INTER_SERVICE_TIMEOUT_MS=10000` to `billing-service/.env.prod`
- [ ] Add `INTER_SERVICE_TIMEOUT_MS=10000` to `inventory-service/.env.prod` (for consistency)
- [ ] Document the setting in deployment guide or README
- [ ] Verify no existing code hardcodes the 3-second timeout elsewhere

**Acceptance Criteria**:
- ✅ Timeout is 10 seconds in production
- ✅ Timeout is configurable without code changes
- ✅ Local development still uses shorter timeout (3s default for dev speed)

---

## Task 4: Write Integration Tests for Inventory Deduction Resilience

**Type**: Testing
**Priority**: High
**Dependencies**: Task 1, Task 2

Create integration tests that verify the invoice + inventory flow works with simulated network issues.

**Subtasks**:
- [ ] Create test file: `billing-service/src/__tests__/inventoryClient.integration.test.js`
- [ ] Test 1: Success case - inventory deduction succeeds on first try
- [ ] Test 2: Retry case - deduction fails on first attempt (timeout), succeeds on retry
- [ ] Test 3: Permanent failure - 404 not found is NOT retried
- [ ] Test 4: Max retries exceeded - after 2 retries fail, operation fails
- [ ] Test 5: Connection pool reuse - multiple requests reuse same connection
- [ ] Test 6: Timeout respected - request aborts after 10 seconds
- [ ] Mock inventory service to simulate delays and failures
- [ ] Use `supertest` for request testing

**Acceptance Criteria**:
- ✅ All tests pass
- ✅ Coverage includes happy path and error paths
- ✅ Mocked server can simulate 5+ second delays
- ✅ Tests verify retry counts and backoff timing
- ✅ Connection pooling behavior is observable in tests

---

## Task 5: Add Property-Based Tests for Timeout Scenarios

**Type**: Testing
**Priority**: Medium
**Dependencies**: Task 1

Create property-based tests to verify InventoryClient handles various timeout and error scenarios correctly.

**Subtasks**:
- [ ] Create test file: `billing-service/src/__tests__/inventoryClient.pbt.test.js` (if using jest + fast-check)
- [ ] Property: For any timeout between 100ms-15000ms, requests complete or timeout gracefully
- [ ] Property: For any retryable error code (connection refused, 5xx), retry behavior is correct
- [ ] Property: For any non-retryable error code (4xx), no retry occurs
- [ ] Property: Connection pool size stays within configured limits
- [ ] Use fast-check or similar library for property generation

**Acceptance Criteria**:
- ✅ Property tests pass with 100+ iterations each
- ✅ No edge cases found
- ✅ Code is resilient to various network conditions

---

## Task 6: Create Integration Test for Full Invoice + Inventory Flow

**Type**: Testing
**Priority**: Medium
**Dependencies**: Task 1, Task 2

End-to-end test that creates an invoice and verifies inventory is deducted with production-like latency.

**Subtasks**:
- [ ] Create test file: `billing-service/src/__tests__/invoiceWithInventory.e2e.test.js`
- [ ] Setup mock inventory service with 2-5 second delay (simulating Onrender latency)
- [ ] Create invoice via billing service
- [ ] Assert `inventoryDeducted: true` is returned
- [ ] Assert inventory service was called with correct parameters
- [ ] Test scenario where inventory service is slow (but succeeds)
- [ ] Test scenario where inventory service temporarily fails then succeeds on retry
- [ ] Use Jest/Supertest framework

**Acceptance Criteria**:
- ✅ Invoice creation succeeds with 2-5s inventory service latency
- ✅ `inventoryDeducted: true` is returned
- ✅ No timeouts occur
- ✅ Retries work as expected
- ✅ Test execution time is reasonable (~5-10 seconds)

---

## Task 7: Document the Change and Create Deployment Guide

**Type**: Documentation
**Priority**: Low
**Dependencies**: All other tasks

Document the fix, deployment steps, and monitoring recommendations.

**Subtasks**:
- [ ] Update `DEPLOYMENT_CHECKLIST.md` with new timeout configuration
- [ ] Add section to API docs explaining inventory deduction behavior
- [ ] Document how to monitor connection pool usage
- [ ] Document retry behavior and log messages to watch for
- [ ] Create troubleshooting guide for inventory deduction failures
- [ ] List any breaking changes (there should be none)

**Acceptance Criteria**:
- ✅ Deployment guide is clear and complete
- ✅ New environment variables are documented
- ✅ Monitoring recommendations are actionable
- ✅ Troubleshooting guide covers common scenarios

---

## Task 8: Verify Fix in Production and Monitor

**Type**: Verification
**Priority**: High
**Dependencies**: All other tasks

Deploy the fix to production and verify it resolves the issue.

**Subtasks**:
- [ ] Deploy updated billing-service to production
- [ ] Execute test curl: `https://api-gateway-fyeg.onrender.com/api/invoices` with sample invoice
- [ ] Verify response includes `inventoryDeducted: true`
- [ ] Check logs for any inventory service errors
- [ ] Monitor logs for 24 hours for inventory deduction success rate
- [ ] Compare before/after: % of invoices with `inventoryDeducted: true`
- [ ] Check connection pool metrics (if available)
- [ ] Verify no performance regression

**Acceptance Criteria**:
- ✅ Test curl returns `inventoryDeducted: true`
- ✅ No `inventoryError` field in response
- ✅ Production logs show successful deductions
- ✅ Success rate improved from 0% to ≥99%
- ✅ No performance degradation
- ✅ No new errors introduced

---

## Summary

**Total Tasks**: 8
**Implementation**: 2
**Configuration**: 1
**Testing**: 3
**Documentation**: 1
**Verification**: 1

**Critical Path**: Task 1 → Task 2 → Task 8
**Can run in parallel**: Tasks 3, 4, 5, 6, 7 (after Task 1 & 2 complete)

**Estimated Effort**: 6-8 hours
**Risk Level**: Low (soft-failure pattern unchanged, adding resilience)
