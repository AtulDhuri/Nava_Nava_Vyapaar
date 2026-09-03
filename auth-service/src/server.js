// Production (Render): NODE_ENV=production loads .env.prod (Supabase)
// Local: NODE_ENV=development loads .env (local PostgreSQL)
const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env";
require("dotenv").config({ path: envFile });
require("reflect-metadata");
const express = require("express");
const { AppDataSource } = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const { verifyToken } = require("./middleware/authMiddleware");
const { globalErrorHandler, notFoundHandler } = require("./middleware/errorHandler");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/api/auth", authRoutes);

// Internal token verification endpoint used by other services via gateway
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

// Add global error handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

AppDataSource.initialize()
  .then(() => {
    console.log("Auth DB connected");
    app.listen(process.env.PORT, () =>
      console.log(`Auth service running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("DB connection failed:", err));
