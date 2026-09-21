/**
 * Environment Configuration Loader for Inventory Service
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

  console.log(`🔍 NODE_ENV: ${nodeEnv}`);
  console.log(`🔍 Looking for environment file: ${envFile}`);

  // Check if environment-specific file exists
  if (fs.existsSync(path.resolve(envFile))) {
    require("dotenv").config({ path: envFile });
    console.log(`✅ Loaded environment config: ${envFile}`);
    
    // Log critical environment variables (without sensitive data)
    console.log(`🔍 PORT: ${process.env.PORT}`);
    console.log(`🔍 DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`🔍 JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
    
    return envFile;
  } else {
    // Fallback to default .env file
    if (fs.existsSync(path.resolve(defaultEnvFile))) {
      require("dotenv").config({ path: defaultEnvFile });
      console.log(`✅ Loaded default environment config: ${defaultEnvFile}`);
      return defaultEnvFile;
    } else {
      console.warn("⚠️ No .env file found. Using system environment variables.");
      
      // Log what system environment variables are available
      console.log(`🔍 System ENV - PORT: ${process.env.PORT || 'NOT SET'}`);
      console.log(`🔍 System ENV - DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
      console.log(`🔍 System ENV - JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
      
      return null;
    }
  }
};

module.exports = { loadEnvironmentConfig };