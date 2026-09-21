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

  console.log(`🔍 NODE_ENV: ${nodeEnv}`);
  console.log(`🔍 Looking for environment file: ${envFile}`);

  // Check if environment-specific file exists
  if (fs.existsSync(path.resolve(envFile))) {
    require("dotenv").config({ path: envFile });
    console.log(`✅ Loaded environment config: ${envFile}`);
    
    // Log critical environment variables (without sensitive data)
    console.log(`🔍 PORT: ${process.env.PORT}`);
    console.log(`🔍 AUTH_SERVICE_URL: ${process.env.AUTH_SERVICE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`🔍 BUSINESS_SERVICE_URL: ${process.env.BUSINESS_SERVICE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`🔍 BILLING_SERVICE_URL: ${process.env.BILLING_SERVICE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`🔍 INVENTORY_SERVICE_URL: ${process.env.INVENTORY_SERVICE_URL ? 'SET' : 'NOT SET'}`);
    
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
      console.log(`🔍 System ENV - AUTH_SERVICE_URL: ${process.env.AUTH_SERVICE_URL ? 'SET' : 'NOT SET'}`);
      console.log(`🔍 System ENV - BUSINESS_SERVICE_URL: ${process.env.BUSINESS_SERVICE_URL ? 'SET' : 'NOT SET'}`);
      console.log(`🔍 System ENV - BILLING_SERVICE_URL: ${process.env.BILLING_SERVICE_URL ? 'SET' : 'NOT SET'}`);
      console.log(`🔍 System ENV - INVENTORY_SERVICE_URL: ${process.env.INVENTORY_SERVICE_URL ? 'SET' : 'NOT SET'}`);
      
      return null;
    }
  }
};

module.exports = { loadEnvironmentConfig };