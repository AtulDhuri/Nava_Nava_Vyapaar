// Load environment configuration with fallback support
const { loadEnvironmentConfig } = require("./utils/envLoader");
loadEnvironmentConfig();
const express = require("express");
const proxy = require("express-http-proxy");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (req, res) => res.status(200).json({ 
  status: "success", 
  statusMessage: "Health check successful", 
  displayMessage: "API Gateway is running normally" 
}));

const proxyOpts = (basePath) => ({
  proxyReqPathResolver: (req) => `${basePath}${req.url}`,
  parseReqBody: true,
  proxyReqBodyDecorator: (bodyContent) => bodyContent,
});

app.use("/api/auth", proxy(process.env.AUTH_SERVICE_URL, proxyOpts("/api/auth")));
app.use("/api/businesses", proxy(process.env.BUSINESS_SERVICE_URL, proxyOpts("/api/businesses")));
app.use("/api/products", proxy(process.env.BUSINESS_SERVICE_URL, proxyOpts("/api/products")));
app.use("/api/invoices", proxy(process.env.BILLING_SERVICE_URL, proxyOpts("/api/invoices")));

app.use((req, res) => res.status(404).json({ 
  status: "error", 
  statusMessage: "Route not found", 
  displayMessage: "The requested endpoint does not exist" 
}));

app.listen(process.env.PORT, () =>
  console.log(`API Gateway running on port ${process.env.PORT}`)
);
