require("reflect-metadata");
const { DataSource } = require("typeorm");
const { Inventory } = require("../models/Inventory");
const { InventoryTransaction } = require("../models/InventoryTransaction");

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL || `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  synchronize: false, // Changed to false to prevent conflicts
  logging: false,
  entities: [Inventory, InventoryTransaction], // Removed Product model to prevent conflicts
});

module.exports = { AppDataSource };
