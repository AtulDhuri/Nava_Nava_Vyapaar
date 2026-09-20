# Deployment Checklist - Naya Nava Vyapaar

## Inventory Service Deployment

### Prerequisites
- [ ] Supabase database is set up and accessible
- [ ] JWT secrets are generated and secure
- [ ] Render.com account is ready

### Step 1: Deploy Inventory Service
1. [ ] Go to [Render.com Dashboard](https://dashboard.render.com)
2. [ ] Click "New +" → "Web Service"
3. [ ] Connect to your GitHub repository
4. [ ] Select the `inventory-service` directory as root
5. [ ] Configure build settings:
   - **Name**: `inventory-service` (or your preferred name)
   - **Branch**: `main`
   - **Root Directory**: `inventory-service`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: `18` or higher

6. [ ] Set Environment Variables:
   ```
   removed

7. [ ] Click "Create Web Service"
8. [ ] Wait for deployment to complete
9. [ ] Note the deployed URL (e.g., `https://inventory-service.onrender.com`)

### Step 2: Update API Gateway
1. [ ] Update API Gateway `.env.prod` file with the new inventory service URL
2. [ ] Redeploy API Gateway service
3. [ ] Test the `/health` endpoint of inventory service
4. [ ] Test inventory APIs through API Gateway

### Step 3: Verify Deployment
1. [ ] Health Check: `GET https://your-inventory-service.onrender.com/health`
2. [ ] Database Check: `GET https://your-inventory-service.onrender.com/health/db`
3. [ ] API Gateway Integration: `GET https://your-api-gateway.onrender.com/api/inventory?businessId=1`

### Step 4: Update Other Services
If other services are already deployed, update their environment variables to include the new inventory service URL.

### Troubleshooting
- **Service won't start**: Check environment variables are set correctly
- **Database connection fails**: Verify DATABASE_URL is correct and Supabase allows connections
- **API Gateway can't reach inventory**: Update API Gateway environment with correct inventory service URL
- **JWT errors**: Ensure JWT_SECRET matches across all services

### Post-Deployment Testing
Test these key inventory operations:
1. [ ] Add inventory item
2. [ ] Get inventory list
3. [ ] Update stock levels
4. [ ] Check low stock items
5. [ ] Internal stock deduction (if billing service is deployed)

## Service URLs to Update

Once inventory service is deployed, update these URLs in other services:

- **API Gateway**: `INVENTORY_SERVICE_URL=https://your-inventory-service.onrender.com`
- **Business Service**: Update inventory client URL if used
- **Billing Service**: Update inventory service URL for stock deduction

## Current Service Status
- [ ] Auth Service: `https://auth-service.onrender.com`
- [ ] Business Service: `https://business-service.onrender.com`
- [ ] Billing Service: `https://billing-service.onrender.com`
- [ ] Inventory Service: `https://inventory-service.onrender.com` (to be deployed)
- [ ] API Gateway: `https://api-gateway.onrender.com`