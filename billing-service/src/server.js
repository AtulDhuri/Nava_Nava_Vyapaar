// Production (Render): NODE_ENV=production loads .env.prod (Supabase)
// Local: NODE_ENV=development loads .env (local PostgreSQL)
const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env";
require("dotenv").config({ path: envFile });
require("reflect-metadata");
const express = require("express");
const { AppDataSource } = require("./config/database");
const billingRoutes = require("./routes/billingRoutes");
const { globalErrorHandler, notFoundHandler } = require("./middleware/errorHandler");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Health check endpoint (registered before DB init so warm-up pings respond immediately)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    statusMessage: "Billing service is running",
    displayMessage: "Billing service is healthy",
    dbConnected: AppDataSource.isInitialized,
  });
});

app.use("/api/invoices", billingRoutes);

// Start listening immediately so the service can be warmed up before the DB is ready
app.listen(process.env.PORT, () =>
  console.log(`Billing service running on port ${process.env.PORT}`)
);

AppDataSource.initialize()
  .then(async () => {
    console.log("Billing DB connected");

    // Run pending migrations automatically
    try {
      const migrations = await AppDataSource.runMigrations();
      if (migrations.length > 0) {
        console.log(`Ran ${migrations.length} pending migration(s)`);
      } else {
        console.log("No pending migrations");
      }
    } catch (migrationError) {
      console.error("Migration error:", migrationError.message);
      // Don't fail startup if migrations error - database might be in valid state
    }
  })
  .catch((err) => console.error("DB connection failed:", err));
