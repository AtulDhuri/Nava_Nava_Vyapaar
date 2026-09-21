require("reflect-metadata");
const { DataSource } = require("typeorm");
const { Inventory } = require("../models/Inventory");
const { InventoryTransaction } = require("../models/InventoryTransaction");
const { ChangeProductIdToVarchar1700000000000 } = require("../migrations/1700000000000-ChangeProductIdToVarchar");
const { ChangeTransactionProductIdToVarchar1700000001000 } = require("../migrations/1700000001000-ChangeTransactionProductIdToVarchar");
const { FixProductIdVarcharFinal1700000002000 } = require("../migrations/1700000002000-FixProductIdVarcharFinal");

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL || `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  synchronize: false, // Changed to false to prevent conflicts
  logging: false,
  entities: [Inventory, InventoryTransaction], // Removed Product model to prevent conflicts
  migrations: [ChangeProductIdToVarchar1700000000000, ChangeTransactionProductIdToVarchar1700000001000, FixProductIdVarcharFinal1700000002000],
});

module.exports = { AppDataSource };
