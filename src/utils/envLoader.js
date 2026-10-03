/**
 * Environment Configuration Loader
 *
 * Loads environment-specific .env files with fallback support.
 * Production (Render): NODE_ENV=production loads .env.prod (Supabase PostgreSQL).
 * Local: loads .env (local/Supabase PostgreSQL).
 */

const fs = require("fs");
const path = require("path");

const loadEnvironmentConfig = () => {
  const nodeEnv = process.env.NODE_ENV || "development";
  // Production uses .env.prod; everything else uses .env
  const envFile = nodeEnv === "production" ? ".env.prod" : ".env";

  if (fs.existsSync(path.resolve(envFile))) {
    require("dotenv").config({ path: envFile });
    console.log(`✅ Loaded environment config: ${envFile}`);
    console.log(`🔍 NODE_ENV: ${nodeEnv}`);
    console.log(`🔍 PORT: ${process.env.PORT}`);
    console.log(`🔍 DATABASE_URL: ${process.env.DATABASE_URL ? "SET" : "NOT SET"}`);
    console.log(`🔍 JWT_SECRET: ${process.env.JWT_SECRET ? "SET" : "NOT SET"}`);
    return envFile;
  }

  // Fallback to default .env
  if (envFile !== ".env" && fs.existsSync(path.resolve(".env"))) {
    require("dotenv").config({ path: ".env" });
    console.log("✅ Loaded default environment config: .env");
    return ".env";
  }

  console.warn("⚠️ No .env file found. Using system environment variables.");
  return null;
};

module.exports = { loadEnvironmentConfig };
