-- Database setup script for Naya Nava Vyapaar microservices
-- Run this script in PostgreSQL to create all required databases

-- Create databases for each microservice
CREATE DATABASE invoice_auth;
CREATE DATABASE invoice_business;
CREATE DATABASE invoice_billing;
CREATE DATABASE invoice_inventory;

-- Grant all privileges to postgres user (adjust if using different user)
GRANT ALL PRIVILEGES ON DATABASE invoice_auth TO postgres;
GRANT ALL PRIVILEGES ON DATABASE invoice_business TO postgres;
GRANT ALL PRIVILEGES ON DATABASE invoice_billing TO postgres;
GRANT ALL PRIVILEGES ON DATABASE invoice_inventory TO postgres;

-- Switch to each database and create extensions if needed
\c invoice_auth;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c invoice_business;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c invoice_billing;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c invoice_inventory;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Print success message
\echo 'All databases created successfully!'
\echo 'You can now start the microservices using: npm run start:all'