# Requirements: Fix inventoryDeducted False in Production

## Problem Statement

In **production only** (local works fine), when an invoice is created via the billing service, the response includes `"inventoryDeducted": false` even though the inventory deduction should succeed. This indicates that the inter-service call from billing-service to inventory-service is failing or timing out.

**Symptoms:**
- Invoice creation succeeds and returns `inventoryDeducted: false`
- No `inventoryError` field is returned (error silently swallowed)
- Local environment works correctly with `inventoryDeducted: true`
- Production uses HTTPS over the internet (Onrender), while local uses HTTP over localhost

## Root Cause

The billing controller makes a fire-and-forget HTTP(S) request to the inventory service to deduct stock after the invoice is committed. In production, this fails because:

1. **Insufficient Timeout**: 3-second timeout is too aggressive for cross-service HTTPS calls over the internet
2. **No Connection Reuse**: Each request creates a new TCP connection and SSL handshake, adding 100-500ms latency per request
3. **Network Latency**: Production environment (Onrender) has network latency that local `localhost:3004` doesn't have

## Requirements

### R1: Increase Timeout for Production Calls
- Change the timeout from 3 seconds to **10 seconds** for inter-service HTTP(S) requests
- Timeout should be configurable via environment variable: `INTER_SERVICE_TIMEOUT_MS` (default: 10000)

### R2: Implement Connection Pooling / Keep-Alive
- Use HTTP Agent with `keepAlive: true` to reuse TCP connections
- Configure reasonable pool settings for production (e.g., maxSockets: 50, maxFreeSockets: 10)
- Apply to both HTTP and HTTPS transports

### R3: Add Retry Logic with Exponential Backoff
- Implement 1-2 retry attempts for transient failures (timeouts, connection errors)
- Use exponential backoff: first retry after 100ms, second after 300ms
- Do NOT retry on permanent errors (400, 403, 404, validation errors)

### R4: Improve Error Tracking & Logging
- Log inventory deduction failures with full details (URL, statusCode, errorMessage, retryCount)
- Include stack traces in logs for debugging
- Response should include `inventoryError` field even on success when errors occur

### R5: Testing
- Add property-based tests to verify inventory deduction resilience under various network conditions
- Add integration tests to ensure invoice + inventory flow works end-to-end in production-like environment

## Success Criteria

1. ✅ Invoice creation returns `inventoryDeducted: true` in production
2. ✅ If inventory deduction actually fails, `inventoryError` is returned and logged
3. ✅ No inventory is deducted if stock insufficient (validation error) — don't retry
4. ✅ Transient failures are retried and eventually succeed
5. ✅ Connection pooling reduces latency for subsequent requests (measurable via logs)
6. ✅ Production tests pass with simulated 5-10s network latency

## Out of Scope

- Changing the soft-failure architecture (billing must never block)
- Database-level transaction coordination between services
- Circuit breaker pattern (can be added later)
- Async message queue (can be considered as alternative architecture)
