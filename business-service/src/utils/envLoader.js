/**
 * Environment Configuration Loader
 * 
 * This utility handles environment-specific .env file loading with fallback support.
 * It tries to load environment-specific files first (.env.development, .env.production)
 * and falls back to the default .env file if the specific one doesn't exist.
 */

const fs = require("fs");
const path = require("path");

const loadEnvironmentConfig = () => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const envFile = `.env.${nodeEnv}`;
  const defaultEnvFile = ".env";

  // Check if environment-specific file exists
  if (fs.existsSync(path.resolve(envFile))) {
    require("dotenv").config({ path: envFile });
    console.log(`✅ Loaded environment config: ${envFile}`);
    return envFile;
  } else {
    // Fallback to default .env file
    if (fs.existsSync(path.resolve(defaultEnvFile))) {
      require("dotenv").config({ path: defaultEnvFile });
      console.log(`✅ Loaded default environment config: ${defaultEnvFile}`);
      return defaultEnvFile;
    } else {
      console.warn("⚠️ No .env file found. Using system environment variables.");
      return null;
    }
  }
};

module.exports = { loadEnvironmentConfig };