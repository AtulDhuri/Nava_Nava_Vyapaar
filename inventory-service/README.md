# Inventory Service

Microservice for inventory management in the Naya Nava Vyapaar system.

## Features

- Stock level management (add, update, delete)
- Low stock threshold monitoring
- Automatic stock deduction for sales
- Transaction logging for all stock movements
- Service-to-service internal APIs
- JWT-protected public APIs

## Environment Variables

### Required for Production:
```bash
NODE_ENV=production
PORT=3004
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key
```

## API Endpoints

### Public APIs (JWT Required)
- `POST /api/inventory` - Add inventory stock
- `GET /api/inventory` - Get all inventory
- `GET /api/inventory/low-stock` - Get low stock items
- `GET /api/inventory/:productId` - Get inventory by product
- `PUT /api/inventory` - Update inventory records
- `PATCH /api/inventory/:productId/threshold` - Update stock threshold
- `DELETE /api/inventory` - Delete inventory records

### Internal APIs (No JWT)
- `POST /internal/deduct-stock` - Deduct stock (called by billing service)
- `GET /internal/inventory/:productId` - Get inventory by product (internal)

### Health Checks
- `GET /health` - Service health check
- `GET /health/db` - Database connectivity check

## Deployment

### Render.com Deployment

1. **Create New Web Service** on Render.com
2. **Connect Repository** pointing to this inventory-service directory
3. **Configure Build & Deploy**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Node Version: `18` or higher

4. **Set Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3004
   DATABASE_URL=your-supabase-connection-string
   JWT_SECRET=your-jwt-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   ```

5. **Deploy** - Service will be available at `https://your-service-name.onrender.com`

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## Database

Uses TypeORM with PostgreSQL. The service will automatically connect to the database specified in `DATABASE_URL`.

### Models:
- **Inventory**: Main inventory records
- **InventoryTransaction**: Transaction log for all stock movements

## Integration

This service integrates with:
- **Business Service**: For product information
- **Billing Service**: Automatic stock deduction on invoice creation
- **API Gateway**: Routes public API requests

## Monitoring

- Health endpoint: `/health`
- Database health: `/health/db`
- All operations log to console with structured messages