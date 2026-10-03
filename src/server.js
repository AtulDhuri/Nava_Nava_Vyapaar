// Naya Nava Vyapaar — Monolith
// Single Express app serving auth, business, products, billing, and inventory.
// Loads .env.prod when NODE_ENV=production, otherwise .env.
const { loadEnvironmentConfig } = require("./utils/envLoader");
loadEnvironmentConfig();
require("reflect-metadata");

const express = require("express");
const jwt = require("jsonwebtoken");
const { AppDataSource } = require("./config/database");

// Module routers
const authRoutes = require("./modules/auth/routes/authRoutes");
const businessRoutes = require("./modules/business/routes/businessRoutes");
const productRoutes = require("./modules/business/routes/productRoutes");
const billingRoutes = require("./modules/billing/routes/billingRoutes");
const inventoryRoutes = require("./modules/inventory/routes/inventoryRoutes");

const { globalErrorHandler, notFoundHandler } = require("./middleware/errorHandler");

console.log("Starting Naya Nava Vyapaar monolith...");
console.log("Environment:", process.env.NODE_ENV || "development");
console.log("Port:", process.env.PORT);
console.log("Database URL configured:", !!process.env.DATABASE_URL);

const app = express();
// Behind a reverse proxy (e.g. Render), trust the first proxy hop so
// express-rate-limit and req.ip see the real client address.
app.set("trust proxy", 1);
app.use(express.json());

// CORS — one place for the whole app.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Health check — fast, side-effect-free liveness route.
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    statusMessage: "Service is running",
    displayMessage: "Naya Nava Vyapaar is healthy",
    service: "naya-nava-vyapaar",
    dbConnected: AppDataSource.isInitialized,
    timestamp: new Date().toISOString(),
  });
});

// Token verification endpoint (kept for backward compatibility with any client
// that called the old gateway's /api/auth/verify).
app.get("/api/auth/verify", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({
    status: "error",
    statusMessage: "Token required",
    displayMessage: "Authentication token is required",
    valid: false
  });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      status: "success",
      statusMessage: "Token verified successfully",
      displayMessage: "Authentication verified",
      valid: true,
      user: decoded
    });
  } catch {
    res.status(403).json({
      status: "error",
      statusMessage: "Invalid or expired token",
      displayMessage: "Please login again",
      valid: false
    });
  }
});

// Mount module routers at the same external paths the API gateway used, so the
// public API is unchanged.
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", billingRoutes);
app.use("/api/inventory", inventoryRoutes);

// Error handlers (after routes)
app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

// Initialize the single database connection, then start listening.
AppDataSource.initialize()
  .then(() => {
    console.log("✓ Database connected successfully");
    app.listen(PORT, () => console.log(`Naya Nava Vyapaar running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("✗ Database connection failed:", err.message);
    // Start the server anyway so /health stays responsive while the DB recovers.
    app.listen(PORT, () => console.log(`Naya Nava Vyapaar running on port ${PORT} (DB not connected)`));
  });

module.exports = app;
