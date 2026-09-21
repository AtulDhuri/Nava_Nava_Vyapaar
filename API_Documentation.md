# Naya Nava Vyapaar - Complete API Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [Products APIs](#products-apis)
3. [Inventory APIs - Public](#inventory-apis---public)
4. [Inventory APIs - Internal](#inventory-apis---internal)
5. [Data Models](#data-models)
6. [Response Format](#response-format)

## Authentication

All public APIs require JWT authentication. First, get your token:

```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**Response:**
```json
{
  "status": "success",
  "statusMessage": "Login successful",
  "displayMessage": "Welcome back!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "email": "user@example.com" }
}
```

Use the `token` value as `Bearer YOUR_JWT_TOKEN` in subsequent requests.

---

## Products APIs

### 1. Add Product (Single)
```bash
curl -X POST "http://localhost:3000/api/products?businessId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productCode": "PROD001",
    "name": "Sample Product",
    "description": "This is a sample product description",
    "price": 99.99,
    "purchasePrice": 75.00,
    "uom": "pieces",
    "gstRate": 18,
    "category": "Electronics"
  }'
```

### 2. Add Products (Bulk)
```bash
curl -X POST "http://localhost:3000/api/products?businessId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '[
    {
      "productCode": "PROD001",
      "name": "Product One",
      "description": "First product description",
      "price": 99.99,
      "purchasePrice": 75.00,
      "uom": "pieces",
      "gstRate": 18,
      "category": "Electronics"
    },
    {
      "productCode": "PROD002",
      "name": "Product Two",
      "description": "Second product description",
      "price": 149.99,
      "purchasePrice": 120.00,
      "uom": "kg",
      "gstRate": 12,
      "category": "Consumables"
    }
  ]'
```

### 3. Get All Products
```bash
curl -X GET "http://localhost:3000/api/products?businessId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Search Products
```bash
curl -X GET "http://localhost:3000/api/products?businessId=1&search=Product" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Update Product (Single)
```bash
curl -X PUT "http://localhost:3000/api/products?businessId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "id": 1,
    "name": "Updated Product Name",
    "description": "Updated product description",
    "price": 119.99,
    "purchasePrice": 85.00,
    "gstRate": 18,
    "category": "Updated Category"
  }'
```

### 6. Update Products (Bulk)
```bash
curl -X PUT "http://localhost:3000/api/products?businessId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '[
    {
      "id": 1,
      "name": "Updated Product One",
      "price": 109.99,
      "purchasePrice": 80.00
    },
    {
      "id": 2,
      "name": "Updated Product Two",
      "price": 159.99,
      "purchasePrice": 125.00
    }
  ]'
```

### 7. Delete Product (Single)
```bash
curl -X DELETE "http://localhost:3000/api/products?businessId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "id": 1
  }'
```

### 8. Delete Products (Bulk)
```bash
curl -X DELETE "http://localhost:3000/api/products?businessId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '[
    {"id": 1},
    {"id": 2}
  ]'
```

---

## Inventory APIs - Public

*All inventory APIs require JWT authentication and go through the API Gateway*

### 1. Add Inventory Stock (Single Item)
```bash
curl -X POST http://localhost:3000/api/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '[{
    "productId": 1,
    "businessId": 1,
    "quantity": 100,
    "lowStockThreshold": 10,
    "uom": "pieces",
    "note": "Initial stock"
  }]'
```

### 2. Add Inventory Stock (Bulk)
```bash
curl -X POST http://localhost:3000/api/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '[
    {
      "productId": 1,
      "businessId": 1,
      "quantity": 100,
      "lowStockThreshold": 10,
      "uom": "pieces",
      "note": "Product 1 initial stock"
    },
    {
      "productId": 2,
      "businessId": 1,
      "quantity": 50,
      "lowStockThreshold": 5,
      "uom": "kg",
      "note": "Product 2 initial stock"
    }
  ]'
```

### 3. Get All Inventory for Business
```bash
curl -X GET "http://localhost:3000/api/inventory?businessId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Get Low Stock Items
```bash
curl -X GET "http://localhost:3000/api/inventory/low-stock?businessId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Get Inventory by Product ID
```bash
curl -X GET "http://localhost:3000/api/inventory/1?businessId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Update Inventory Records
```bash
curl -X PUT "http://localhost:3000/api/inventory?businessId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '[{
    "id": 1,
    "currentStock": 150,
    "lowStockThreshold": 15,
    "uom": "pieces",
    "note": "Stock adjustment"
  }]'
```

### 7. Update Low Stock Threshold Only
```bash
curl -X PATCH "http://localhost:3000/api/inventory/1/threshold?businessId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "lowStockThreshold": 20
  }'
```

### 8. Delete Inventory Records
```bash
curl -X DELETE "http://localhost:3000/api/inventory?businessId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '[{"id": 1}, {"id": 2}]'
```

---

## Inventory APIs - Internal

*These are for service-to-service communication only, no JWT required*

### 9. Deduct Stock (Called by Billing Service)
```bash
curl -X POST http://localhost:3004/internal/deduct-stock \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": 1,
    "billNo": "INV-001",
    "items": [
      {
        "productId": 1,
        "qty": 5
      },
      {
        "productId": 2,
        "qty": 2
      }
    ]
  }'
```

### 10. Get Inventory by Product (Internal)
```bash
curl -X GET "http://localhost:3004/internal/inventory/1?businessId=1"
```

---

## Data Models

### Product Model
```json
{
  "id": 1,
  "businessId": 1,
  "productCode": "PROD001",
  "name": "Sample Product",
  "category": "Electronics",
  "price": 99.99,
  "purchasePrice": 75.00,
  "uom": "pieces",
  "gstRate": 18.00,
  "description": "Product description",
  "currentStock": 100,
  "lowStock": false
}
```

### Inventory Model
```json
{
  "id": 1,
  "businessId": 1,
  "productId": 1,
  "currentStock": 100.000,
  "lowStockThreshold": 10.000,
  "uom": "pieces",
  "lastUpdatedAt": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-15T09:00:00.000Z",
  "isLowStock": false
}
```

### Inventory Transaction Model
```json
{
  "id": 1,
  "businessId": 1,
  "productId": 1,
  "type": "ADD",
  "quantity": 50.000,
  "referenceId": "INV-001",
  "note": "Stock replenishment",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

## Response Format

All APIs follow a consistent response format:

### Success Response
```json
{
  "status": "success",
  "statusMessage": "Operation completed successfully",
  "displayMessage": "User-friendly message",
  "data": { /* relevant data */ }
}
```

### Error Response
```json
{
  "status": "error",
  "statusMessage": "Technical error message",
  "displayMessage": "User-friendly error message"
}
```

---

## Field Requirements

### Product Fields
- **Required**: `productCode`, `name`, `price`, `uom`, `gstRate`
- **Optional**: `description` (max 5000 chars), `purchasePrice`, `category`

### Inventory Fields
- **Required**: `productId`, `businessId`, `quantity`
- **Optional**: `lowStockThreshold`, `uom`, `note`

---

## Transaction Types

| Type | Description |
|------|-------------|
| `ADD` | Manual stock additions |
| `DEDUCT` | Stock reductions (sales) |
| `ADJUSTMENT` | Direct stock corrections |
| `BULK_UPLOAD` | Bulk inventory operations |

---

## Port Configuration

- **API Gateway (Public)**: http://localhost:3000
- **Auth Service**: http://localhost:3001
- **Business Service**: http://localhost:3002
- **Billing Service**: http://localhost:3003
- **Inventory Service (Direct)**: http://localhost:3004

---

## Notes

1. All public APIs require JWT authentication via `Authorization: Bearer TOKEN`
2. Internal APIs are for service-to-service communication only
3. Arrays are required for POST/PUT/DELETE operations, even for single items
4. `businessId` is required for all operations and should be passed as query parameter
5. Inventory operations automatically log transactions for audit trails
6. Low stock detection is automatic based on `currentStock <= lowStockThreshold`
7. Products API automatically includes current stock information from inventory service