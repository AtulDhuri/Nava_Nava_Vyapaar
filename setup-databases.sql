-- Database setup for Naya Nava Vyapaar (monolith)
-- A single PostgreSQL database holds all tables.
-- Tables are created automatically on startup via TypeORM synchronize.

CREATE DATABASE naya_nava_vyapaar;

GRANT ALL PRIVILEGES ON DATABASE naya_nava_vyapaar TO postgres;

\c naya_nava_vyapaar;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\echo 'Database created. Start the app with: npm start'
