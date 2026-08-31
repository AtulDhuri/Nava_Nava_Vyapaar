// Load environment configuration with fallback support
const { loadEnvironmentConfig } = require("./utils/envLoader");
loadEnvironmentConfig();
require("reflect-metadata");
const express = require("express");
const { AppDataSource } = require("./config/database");
const businessRoutes = require("./routes/businessRoutes");
const productRoutes = require("./routes/productRoutes");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/api/businesses", businessRoutes);
app.use("/api/products", productRoutes);

AppDataSource.initialize()
  .then(() => {
    console.log("Business DB connected");
    app.listen(process.env.PORT, () =>
      console.log(`Business service running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("DB connection failed:", err));
