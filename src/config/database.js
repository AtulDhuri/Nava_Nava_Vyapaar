require("reflect-metadata");
const { DataSource } = require("typeorm");

// Entities from every module, registered on ONE PostgreSQL DataSource.
const { User } = require("../modules/auth/models/User");
const { Business } = require("../modules/business/models/Business");
const { Product } = require("../modules/business/models/Product");
const { Invoice } = require("../modules/billing/models/Invoice");
const { InvoiceItem } = require("../modules/billing/models/InvoiceItem");
const { Inventory } = require("../modules/inventory/models/Inventory");
const { InventoryTransaction } = require("../modules/inventory/models/InventoryTransaction");

// Schema sync control.
// - DB_SYNC=true  -> force on  (use on first run to auto-create all tables)
// - DB_SYNC=false -> force off (use in production once the schema exists, so
//                    entity changes can never auto-alter the client's DB)
// - unset         -> on in development, off in production (safe default)
const synchronize =
  process.env.DB_SYNC === "true"
    ? true
    : process.env.DB_SYNC === "false"
    ? false
    : process.env.NODE_ENV !== "production";

// Single PostgreSQL connection for the whole monolith.
const AppDataSource = new DataSource({
  type: "postgres",
  url:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  // SSL is OPT-IN via DB_SSL=true. Local PostgreSQL rejects SSL by default, so
  // it stays off unless you explicitly enable it for a managed/remote DB
  // (Supabase, Render Postgres, etc.).
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  synchronize,
  logging: false,
  entities: [User, Business, Product, Invoice, InvoiceItem, Inventory, InventoryTransaction],
});

// Visible safety signal: shows whether the schema will auto-sync on this boot.
console.log(`🔧 DB synchronize: ${synchronize} (NODE_ENV=${process.env.NODE_ENV || "development"})`);

module.exports = { AppDataSource };
