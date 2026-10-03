# Naya Nava Vyapaar — Monolith

A business management platform for authentication, business/product management, billing, and inventory. Previously five microservices, now a single Node.js + Express + TypeORM application backed by one PostgreSQL database.

## Architecture

One Express app (`src/server.js`) with four domain modules under `src/modules/`:

```
src/
  server.js                 # single Express app, one DB init
  config/database.js        # one PostgreSQL DataSource (all 7 entities)
  middleware/               # verifyToken (JWT), error handlers
  utils/                    # responseHandler, envLoader
  modules/
    auth/                   # users, signup/signin, token verify
    business/               # business + products (+ businessService helpers)
    billing/                # invoices + invoice items
    inventory/              # inventory + transactions (+ inventoryService)
```

What used to be inter-service HTTP calls are now direct in-process function calls:
- billing → business `resolveProductCodes` (numeric id → SKU code)
- billing → inventory `deductStock` (stock deduction after invoice commit)
- business → inventory `getByProducts` (product-list stock enrichment)

The API gateway, the `/internal` HTTP endpoints, and the unused internal API key mechanism are removed.

## Prerequisites

1. Node.js v18+
2. PostgreSQL v12+
3. npm

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create the database
```sql
CREATE DATABASE naya_nava_vyapaar;
```
Or run `setup-databases.sql`. Tables are created automatically on first start (TypeORM `synchronize`).

### 3. Configure environment
Edit `.env` (local) or `.env.prod` (production) and set `DATABASE_URL` and the JWT secrets.

### 4. Run
```bash
npm run dev     # development (auto-reload)
npm start       # production-style start
```

The app listens on `PORT` (default 3000).

## API Endpoints

All routes keep the same external paths as the previous gateway.

### Authentication
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `GET  /api/auth/verify`

### Business
- `POST /api/businesses`
- `GET  /api/businesses`
- `PUT  /api/businesses`

### Products
- `POST   /api/products`
- `GET    /api/products` (enriched with `currentStock`, `lowStockThreshold`, `lowStock`)
- `PUT    /api/products`
- `DELETE /api/products`

### Billing
- `POST   /api/invoices` (auto-deducts inventory, best-effort)
- `GET    /api/invoices`
- `GET    /api/invoices/:id`
- `PATCH  /api/invoices/received`
- `PUT    /api/invoices/:id`
- `DELETE /api/invoices/:id`

### Inventory
- `POST   /api/inventory`
- `GET    /api/inventory`
- `GET    /api/inventory/low-stock`
- `GET    /api/inventory/:productId`
- `PUT    /api/inventory`
- `DELETE /api/inventory`
- `PATCH  /api/inventory/:productId/threshold`

### Health
- `GET /health`

## Database Schema

Single database `naya_nava_vyapaar` with tables: `users`, `business`, `products`, `invoices`, `invoice_items`, `inventory`, `inventory_transactions`.

## Deployment

`render.yaml` defines a single web service. Set `DATABASE_URL` and JWT secrets as environment variables in the Render dashboard.
