require("reflect-metadata");
const { DataSource } = require("typeorm");
const { Business } = require("../models/Business");
const { Product } = require("../models/Product");

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL || `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  synchronize: process.env.NODE_ENV !== 'production', // Use synchronize in dev, migrations in prod
  logging: false,
  entities: [Business, Product],
  migrations: ["src/migrations/*.js"],
  migrationsRun: false, // Set to true to auto-run migrations on startup
});

module.exports = { AppDataSource };
