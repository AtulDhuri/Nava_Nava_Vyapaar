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

// Warm-up endpoint: pings every downstream service so they spin up (e.g. Render cold starts)
// before real API traffic arrives. Hit this once on app launch / splash screen.
const WARMUP_TARGETS = [
  { name: "auth", url: process.env.AUTH_SERVICE_URL },
  { name: "business", url: process.env.BUSINESS_SERVICE_URL },
  { name: "billing", url: process.env.BILLING_SERVICE_URL },
  { name: "inventory", url: process.env.INVENTORY_SERVICE_URL },
];

const pingService = async ({ name, url }) => {
  if (!url || url === "undefined") {
    return { name, ok: false, status: "not-configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // allow for cold starts
  const startedAt = Date.now();

  try {
    const response = await fetch(`${url}/health`, { signal: controller.signal });
    return {
      name,
      ok: response.ok,
      status: response.status,
      responseTimeMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      name,
      ok: false,
      status: err.name === "AbortError" ? "timeout" : "unreachable",
      error: err.code || err.message,
      responseTimeMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
};

app.get("/warmup", async (req, res) => {
  const results = await Promise.all(WARMUP_TARGETS.map(pingService));
  const allReady = results.every((r) => r.ok);

  res.status(allReady ? 200 : 207).json({
    status: allReady ? "success" : "partial",
    statusMessage: allReady ? "All services warmed up" : "Some services are not ready",
    displayMessage: allReady
      ? "All services are ready"
      : "Services are starting up, please wait a moment",
    services: results,
  });
});

// Debug endpoint for environment variables (only show in development)
app.get("/debug/env", (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: "Not found" });
  }
  
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
    BUSINESS_SERVICE_URL: process.env.BUSINESS_SERVICE_URL,
    BILLING_SERVICE_URL: process.env.BILLING_SERVICE_URL,
    INVENTORY_SERVICE_URL: process.env.INVENTORY_SERVICE_URL
  });
});

const proxyOpts = (basePath) => ({
  proxyReqPathResolver: (req) => `${basePath}${req.url}`,
  parseReqBody: true,
  proxyReqBodyDecorator: (bodyContent) => bodyContent,
});

// Add validation and error handling for service URLs
const validateAndProxy = (route, serviceUrl, basePath) => {
  if (!serviceUrl || serviceUrl === 'undefined') {
    console.warn(`⚠️ Warning: ${route} service URL not configured, skipping proxy setup`);
    app.use(route, (req, res) => {
      res.status(503).json({
        status: "error",
        statusMessage: "Service unavailable",
        displayMessage: `${route.replace('/api/', '').toUpperCase()} service is not configured`
      });
    });
  } else {
    console.log(`✅ Setting up proxy for ${route} -> ${serviceUrl}`);
    app.use(route, proxy(serviceUrl, proxyOpts(basePath)));
  }
};

// Setup proxies with validation
validateAndProxy("/api/auth", process.env.AUTH_SERVICE_URL, "/api/auth");
validateAndProxy("/api/businesses", process.env.BUSINESS_SERVICE_URL, "/api/businesses");
validateAndProxy("/api/products", process.env.BUSINESS_SERVICE_URL, "/api/products");
validateAndProxy("/api/invoices", process.env.BILLING_SERVICE_URL, "/api/invoices");
validateAndProxy("/api/inventory", process.env.INVENTORY_SERVICE_URL, "/api/inventory");

app.use((req, res) => res.status(404).json({ 
  status: "error", 
  statusMessage: "Route not found", 
  displayMessage: "The requested endpoint does not exist" 
}));

app.listen(process.env.PORT, () =>
  console.log(`API Gateway running on port ${process.env.PORT}`)
);
