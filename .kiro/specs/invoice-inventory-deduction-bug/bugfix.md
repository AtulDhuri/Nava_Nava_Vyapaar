# Invoice Inventory Deduction Bug

## Introduction

When an invoice is created in the billing service, the system is supposed to automatically deduct the invoiced items from the inventory service's stock. However, inventory is not being deducted despite products and inventory records existing in the database. The `inventoryDeducted` flag in the invoice response shows `false`, indicating that the inventory deduction is failing silently. This bug prevents inventory accuracy and allows overbooking of products.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an invoice is created with items that have productId values THEN the system returns `inventoryDeducted: false` indicating the stock was not deducted from inventory

1.2 WHEN an invoice is created and the inventory service is queried afterward THEN the currentStock values remain unchanged (no deduction occurred)

1.3 WHEN an invoice is created with valid productId and items THEN the billing service silently fails to deduct inventory and does not throw an error to the user (soft failure)

### Expected Behavior (Correct)

2.1 WHEN an invoice is created with items that have productId values THEN the system SHALL deduct the specified quantities from the inventory service's stock atomically

2.2 WHEN an invoice is created and the inventory service is queried afterward THEN the currentStock values SHALL be reduced by the invoiced quantities

2.3 WHEN an invoice is created with valid productId and items THEN the system SHALL successfully deduct inventory and return `inventoryDeducted: true` in the response

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an invoice is created without productId values (items with null productId) THEN the system SHALL CONTINUE TO skip those items without attempting deduction

3.2 WHEN an invoice is created and inventory deduction fails THEN the system SHALL CONTINUE TO successfully create the invoice (billing must not be blocked by inventory service failures)

3.3 WHEN an invoice is created THEN the system SHALL CONTINUE TO return an `inventoryError` message in the response if deduction fails

3.4 WHEN retrieving invoices THEN the system SHALL CONTINUE TO return all invoice data correctly regardless of inventory deduction status
