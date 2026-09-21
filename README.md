# Naya Nava Vyapaar - Microservices Architecture

A comprehensive business management platform with microservices architecture for inventory, billing, authentication, and business operations.

## Services Overview

- **API Gateway** (Port 3000) - Routes requests to appropriate services
- **Auth Service** (Port 3001) - User authentication and authorization
- **Business Service** (Port 3002) - Business and product management
- **Billing Service** (Port 3003) - Invoice generation and billing
- **Inventory Service** (Port 3004) - Inventory tracking and management

## Prerequisites

1. **Node.js** (v16 or higher)
2. **PostgreSQL** (v12 or higher)
3. **npm** package manager

## Setup Instructions

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Database Setup

**Important:** Create PostgreSQL databases before starting services.

#### Option A: Automated Setup (Windows)
```bash
# Run the setup script (requires PostgreSQL client tools)
setup-databases.bat
```

#### Option B: Manual Setup
Connect to PostgreSQL and run:
```sql
CREATE DATABASE invoice_auth;
CREATE DATABASE invoice_business; 
CREATE DATABASE invoice_billing;
CREATE DATABASE invoice_inventory;
```

### 3. Environment Configuration

Each service has its own `.env` file with database connection settings:
- Default PostgreSQL credentials: `postgres:Root@localhost:5432`
- Update `.env` files in each service directory if your PostgreSQL setup differs

### 4. Start Services

#### Development Mode (with auto-reload)
```bash
npm run dev:all
```

#### Production Mode
```bash
npm run start:all
```

#### Individual Services
```bash
npm run start:gateway    # API Gateway
npm run start:auth       # Auth Service
npm run start:business   # Business Service
npm run start:billing    # Billing Service
npm run start:inventory  # Inventory Service
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh

### Business Management
- `GET /business/products` - Get products with inventory data
- `POST /business/products` - Create products
- `PUT /business/products/:id` - Update products

### Inventory Management
- `GET /inventory` - Get inventory records
- `POST /inventory` - Create/Update inventory
- `DELETE /inventory/:id` - Delete inventory record

### Billing
- `POST /billing/invoices` - Create invoice (auto-deducts inventory)
- `GET /billing/invoices` - Get invoices

## Features

### Enhanced Product API
The `GET /business/products` endpoint now includes:
- `currentStock` - Current inventory quantity
- `lowStock` - Boolean flag indicating low stock status

### Inventory Integration
- Automatic stock deduction during invoice creation
- Low stock alerts and tracking
- Real-time inventory updates

### Microservice Communication
- Internal APIs for service-to-service communication
- JWT-based authentication for public APIs
- Internal API key authentication for service communication

## Database Schema

Each service maintains its own database:
- `invoice_auth` - User authentication data
- `invoice_business` - Business and product data  
- `invoice_billing` - Invoice and billing data
- `invoice_inventory` - Inventory tracking data

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Verify database names exist (run `setup-databases.sql`)
3. Check `.env` files for correct credentials

### Service Startup Issues
1. Run `npm run install:all` to ensure dependencies are installed
2. Check that no other services are using the same ports
3. Verify environment variables are set correctly

### Inventory Service Issues
- Database: Ensure `invoice_inventory` database exists
- Dependencies: Verify `dotenv` and `axios` are installed
- Internal communication: Check `INTERNAL_API_KEY` matches across services

## Development

### Adding New Features
1. Create feature specs in `.kiro/specs/` directory
2. Follow microservice patterns established in existing services
3. Update API documentation and tests

### Service Communication
- Use internal APIs for service-to-service calls
- Include `x-api-key` header for internal API authentication
- Handle service unavailability gracefully with default values