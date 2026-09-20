// Production (Render): NODE_ENV=production loads .env.prod (Supabase)
// Local: NODE_ENV=development loads .env (local PostgreSQL)
const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env";
require("dotenv").config({ path: envFile });
require("reflect-metadata");
const express = require("express");
const { AppDataSource } = require("./config/database");
const inventoryRoutes = require("./routes/inventoryRoutes");
const internalRoutes = require("./routes/internalRoutes");
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

// Public routes — JWT protected (via inventoryRoutes router)
app.use("/api/inventory", inventoryRoutes);

// Internal routes — NO JWT, service-to-service only
app.use("/internal", internalRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

AppDataSource.initialize()
  .then(() => {
    console.log("Inventory DB connected");
    app.listen(process.env.PORT || 3004, () =>
      console.log(`Inventory service running on port ${process.env.PORT || 3004}`)
    );
  })
  .catch((err) => console.error("DB connection failed:", err));
