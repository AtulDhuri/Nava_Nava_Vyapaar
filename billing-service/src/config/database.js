require("reflect-metadata");
const { DataSource } = require("typeorm");
const { Invoice } = require("../models/Invoice");
const { InvoiceItem } = require("../models/InvoiceItem");

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: true,
  logging: false,
  entities: [Invoice, InvoiceItem],
});

module.exports = { AppDataSource };
