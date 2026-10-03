# Naya Nava Vyapaar — API Testing Guide (Monolith)

A **step-by-step** walkthrough you can follow top to bottom to test the whole
system. Each step builds on the previous one (grab the token, then the
`businessId`, then product SKUs, then invoice). Example data models a
**boutique & accessories shop**.

- Base URL (local): `http://localhost:3000`
- Auth: `signup`/`signin` are public; everything else needs `Authorization: Bearer <token>`.
- Most data endpoints are scoped by `businessId` (a **query parameter**, except invoice-create which takes it in the body).

> **Frontend migration note:** all paths are identical to the old microservices/
> gateway. The only change is the base URL — point it at this one host.

> **Shell note:**
> - **macOS/Linux / Git Bash:** commands work as written (they use a `TOKEN` variable).
> - **Windows PowerShell:** use `curl.exe` (not the `curl` alias), set variables with `$TOKEN="..."`, and reference them as `$TOKEN`. A PowerShell-native version of each call is noted where it differs.

---

## Prerequisites

1. Install deps and start the server:
   ```bash
   npm install
   npm run dev
   ```
2. Wait for: `✓ Database connected successfully` and `Naya Nava Vyapaar running on port 3000`.
3. Prefer a one-shot automated run instead of manual steps? Use `npm run test:e2e` (see the last section). The steps below are the manual equivalent.

---

## Step 0 — Health check

Confirm the server is up and the DB is connected.

```bp
```

Expect `"status":"success"` and `"dbConnected":true`. If `dbConnected` is false, fix the DB connection before continuing.

---

## Step 1 — Register a user (signup)

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Meera",
    "lastName": "Shah",
    "mobileNo": "9876543210",
    "password": "secret123"
  }'
```

Expect `201`. If you've run this before, you'll get `409 mobile already registered` — that's fine, just continue to signin with the same credentials (or change `mobileNo`).

---

## Step 2 — Log in and capture the token

```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{ "mobileNo": "9876543210", "password": "secret123" }'
```

Copy the `token` from the response and store it:

```bash
# macOS/Linux / Git Bash
TOKEN="paste-the-token-here"
```
```powershell
# Windows PowerShell
$TOKEN="paste-the-token-here"
```

Quick sanity check that the token works:
```bash
curl http://localhost:3000/api/auth/verify -H "Authorization: Bearer $TOKEN"
```
Expect `"valid":true`.

---

## Step 3 — Create a business and capture its id

```bash
curl -X POST http://localhost:3000/api/businesses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meera Boutique & Accessories",
    "address": "24 Fashion Street, Bandra West, Mumbai",
    "gstNumber": "27ABCDE1234F1Z5",
    "contactNumber": "9876543210"
  }'
```

From the response, note `business.id`. Store it (used in every step below):
```bash
BUSINESS_ID=1        # replace with the id you got
```
```powershell
$BUSINESS_ID=1
```

Verify:
```bash
curl http://localhost:3000/api/businesses -H "Authorization: Bearer $TOKEN"
```

---

## Step 4 — Add products

Add three boutique items. Required per item: `productCode`, `name`, `price`, `uom`, `gstRate`.

```bash
curl -X POST "http://localhost:3000/api/products?businessId=$BUSINESS_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    { "productCode": "KUR-ANRK-M", "name": "Anarkali Kurti (Maroon, M)", "category": "Apparel", "price": 1499, "purchasePrice": 850, "uom": "pcs", "gstRate": 12, "description": "Rayon anarkali kurti, size M" },
    { "productCode": "DUP-SILK-RED", "name": "Banarasi Silk Dupatta (Red)", "category": "Apparel", "price": 899, "purchasePrice": 500, "uom": "pcs", "gstRate": 5, "description": "Pure silk dupatta with zari border" },
    { "productCode": "BAG-SLING-TAN", "name": "Leather Sling Bag (Tan)", "category": "Accessories", "price": 1799, "purchasePrice": 1100, "uom": "pcs", "gstRate": 18, "description": "Genuine leather sling bag" }
  ]'
```

Expect `201` with the saved products. The SKUs (`productCode`) are what inventory and invoices key on.

---

## Step 5 — Add stock for those products

Body is **always an array**. Required per entry: `productId` (the SKU), `businessId`, `quantity` (> 0).

```bash
curl -X POST "http://localhost:3000/api/inventory" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    { "productId": "KUR-ANRK-M", "businessId": '"$BUSINESS_ID"', "quantity": 40, "uom": "pcs", "lowStockThreshold": 5 },
    { "productId": "DUP-SILK-RED", "businessId": '"$BUSINESS_ID"', "quantity": 60, "uom": "pcs", "lowStockThreshold": 8 },
    { "productId": "BAG-SLING-TAN", "businessId": '"$BUSINESS_ID"', "quantity": 25, "uom": "pcs", "lowStockThreshold": 4 }
  ]'
```
> PowerShell: replace `'"$BUSINESS_ID"'` with the literal number (e.g. `1`) inside the JSON, since the bash quoting trick doesn't apply.

Expect `201`. Each entry shows `currentStock`.

---

## Step 6 — Verify stock shows up on products

```bash
curl "http://localhost:3000/api/products?businessId=$BUSINESS_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Each product should now carry `currentStock`, `lowStockThreshold`, and `lowStock`. The kurti should read `currentStock: 40`.

---

## Step 7 — Create an invoice (auto-deducts stock)

`businessId` goes in the **body** here. Buying 2 kurtis and 1 dupatta.

```bash
curl -X POST "http://localhost:3000/api/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": '"$BUSINESS_ID"',
    "customerName": "Priya Nair",
    "customerMobile": "9000000000",
    "customerAddress": "12 Hill Road, Bandra West",
    "discount": 100,
    "received": 2000,
    "items": [
      { "productCode": "KUR-ANRK-M", "productName": "Anarkali Kurti (Maroon, M)", "price": 1499, "qty": 2, "discount": 0, "gstRate": 12 },
      { "productCode": "DUP-SILK-RED", "productName": "Banarasi Silk Dupatta (Red)", "price": 899, "qty": 1, "discount": 0, "gstRate": 5 }
    ]
  }'
```

Expect `201` with `"inventoryDeducted": true`. Note the `invoice.id` and `invoice.billNo`. Store the id:
```bash
INVOICE_ID=1
```

---

## Step 8 — Confirm stock was deducted

The kurti had 40, you sold 2, so it should now be 38:
```bash
curl "http://localhost:3000/api/inventory/KUR-ANRK-M?businessId=$BUSINESS_ID" \
  -H "Authorization: Bearer $TOKEN"
```
Expect `currentStock: 38`. The dupatta (`DUP-SILK-RED`) should be 59.

---

## Step 9 — List and fetch invoices

```bash
# all invoices
curl "http://localhost:3000/api/invoices?businessId=$BUSINESS_ID" \
  -H "Authorization: Bearer $TOKEN"

# filter by status (Unpaid | Partially Paid | Paid)
curl "http://localhost:3000/api/invoices?businessId=$BUSINESS_ID&status=Partially%20Paid" \
  -H "Authorization: Bearer $TOKEN"

# one invoice with its items
curl "http://localhost:3000/api/invoices/$INVOICE_ID?businessId=$BUSINESS_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Step 10 — Record a payment (update received)

```bash
curl -X PATCH "http://localhost:3000/api/invoices/received?businessId=$BUSINESS_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{ "id": '"$INVOICE_ID"', "received": 4000 }]'
```
`balance` and `status` recompute (e.g. to `Paid`).

---

## Step 11 — Low-stock check

Drop the sling bag threshold test by selling it down, or just view current low-stock items:
```bash
curl "http://localhost:3000/api/inventory/low-stock?businessId=$BUSINESS_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Step 12 — Cleanup (optional)

```bash
# delete the invoice
curl -X DELETE "http://localhost:3000/api/invoices/$INVOICE_ID?businessId=$BUSINESS_ID" \
  -H "Authorization: Bearer $TOKEN"

# delete a product (needs its numeric id — get it from the products list)
curl -X DELETE "http://localhost:3000/api/products?businessId=$BUSINESS_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{ "id": 1 }]'

# delete an inventory row (needs its id — from the inventory list)
curl -X DELETE "http://localhost:3000/api/inventory?businessId=$BUSINESS_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{ "id": 5 }]'
```

You've now exercised the full flow: **auth → business → products → inventory → invoice → payment**.

---
---

# Full Endpoint Reference

Grouped by area. All paths are unchanged from the microservices version.

## Auth (`/api/auth`) — public
| Method | Path | Body / notes |
|--------|------|--------------|
| POST | `/api/auth/signup` | `{ firstName, lastName, mobileNo, password }` → 201 |
| POST | `/api/auth/signin` | `{ mobileNo, password }` → `{ token, ... }` |
| GET | `/api/auth/verify` | header `Authorization: Bearer <token>` → `{ valid, user }` |

## Businesses (`/api/businesses`) — token required, owner from token
| Method | Path | Body / notes |
|--------|------|--------------|
| POST | `/api/businesses` | `{ name, address?, gstNumber?, contactNumber? }` (only `name` required) |
| GET | `/api/businesses` | list businesses for the logged-in user |
| PUT | `/api/businesses` | single `{ id, ... }` or array; each needs `id` |

## Products (`/api/products`) — token required, `?businessId=`
| Method | Path | Body / notes |
|--------|------|--------------|
| POST | `/api/products?businessId=` | single or array; required: `productCode, name, price, uom, gstRate` |
| GET | `/api/products?businessId=` | optional `&search=`; enriched with `currentStock, lowStockThreshold, lowStock` |
| PUT | `/api/products?businessId=` | single or array; each needs `id` |
| DELETE | `/api/products?businessId=` | single or array of `{ id }` |

## Inventory (`/api/inventory`) — token required, `?businessId=`, `productId` = SKU
| Method | Path | Body / notes |
|--------|------|--------------|
| POST | `/api/inventory` | **array**; per entry `{ productId, businessId, quantity>0, uom?, lowStockThreshold? }` |
| GET | `/api/inventory?businessId=` | all records (`isLowStock` included) |
| GET | `/api/inventory/low-stock?businessId=` | low-stock records |
| GET | `/api/inventory/:productId?businessId=` | one record by SKU (404 if none) |
| PUT | `/api/inventory?businessId=` | array; each needs row `id`; set `uom/lowStockThreshold/currentStock` |
| PATCH | `/api/inventory/:productId/threshold?businessId=` | `{ lowStockThreshold }` |
| DELETE | `/api/inventory?businessId=` | array of `{ id }` |

## Invoices (`/api/invoices`) — token required
| Method | Path | Body / notes |
|--------|------|--------------|
| POST | `/api/invoices` | `businessId` in **body**; `{ businessId, customerName, items[], discount?, received?, ... }`; auto-deducts stock |
| GET | `/api/invoices?businessId=` | optional `&status=`; list |
| GET | `/api/invoices/:id?businessId=` | one invoice with items |
| PATCH | `/api/invoices/received?businessId=` | single or array; each `{ id, received }` |
| PUT | `/api/invoices/:id?businessId=` | update customer fields and/or items |
| DELETE | `/api/invoices/:id?businessId=` | delete invoice |

## Response envelope
```json
{ "status": "success | error", "statusMessage": "...", "displayMessage": "..." }
```
plus endpoint-specific fields.

## Status codes
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Validation error |
| 401 | Missing/invalid credentials or no token |
| 403 | Invalid or expired token |
| 404 | Not found |
| 409 | Conflict (e.g. mobile already registered) |
| 429 | Too many requests (auth rate limit) |
| 500 | Server error |
| 503 | Database not ready |

## Data model quick reference
- **User** → `users`: id, firstName, lastName, mobileNo (unique), password, timestamps
- **Business** → `business`: id, userId, name, address, gstNumber, contactNumber
- **Product** → `products`: id, businessId, productCode (unique SKU), name, category, price, purchasePrice, uom, gstRate, description
- **Invoice** → `invoices`: id, businessId, billNo (unique), customer fields, totalPrice, discount, received, balance, status, date; has many **items**
- **InvoiceItem** → `invoice_items`: id, productId (SKU), productName, price, qty, discount, gstRate, total, description
- **Inventory** → `inventory`: id, businessId, productId (SKU), currentStock, lowStockThreshold, uom, timestamps; unique (businessId, productId)
- **InventoryTransaction** → `inventory_transactions`: id, businessId, productId, type (ADD/BULK_UPLOAD/ADJUSTMENT/DEDUCT), quantity, referenceId (billNo), note, createdAt

## GST / SKU notes (boutique)
- Example GST slabs: 5% apparel ≤ ₹1000, 12% apparel > ₹1000, 18% accessories — set to the shop's real tax config.
- SKU convention used: `<TYPE>-<STYLE/MATERIAL>-<VARIANT>`, e.g. `KUR-ANRK-M`, `DUP-SILK-RED`, `BAG-SLING-TAN`. Any alphanumeric string with `-`/`_` is valid.
