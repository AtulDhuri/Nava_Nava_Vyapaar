require("reflect-metadata");
const { DataSource } = require("typeorm");
const { Invoice } = require("../models/Invoice");
const { InvoiceItem } = require("../models/InvoiceItem");
const { ChangeInvoiceItemProductIdToVarchar1700000000000 } = require("../migrations/1700000000000-ChangeInvoiceItemProductIdToVarchar");

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL || `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  synchronize: true,
  logging: false,
  entities: [Invoice, InvoiceItem],
  migrations: [ChangeInvoiceItemProductIdToVarchar1700000000000],
});

module.exports = { AppDataSource };
