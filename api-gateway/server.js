require("dotenv").config({ path: `.env.${process.env.NODE_ENV || "development"}` });
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

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/auth", proxy(process.env.AUTH_SERVICE_URL, { parseReqBody: false, proxyReqPathResolver: (req) => `/api/auth${req.url}` }));
app.use("/api/businesses", proxy(process.env.BUSINESS_SERVICE_URL, { parseReqBody: false, proxyReqPathResolver: (req) => `/api/businesses${req.url}` }));
app.use("/api/products", proxy(process.env.BUSINESS_SERVICE_URL, { parseReqBody: false, proxyReqPathResolver: (req) => `/api/products${req.url}` }));
app.use("/api/invoices", proxy(process.env.BILLING_SERVICE_URL, { parseReqBody: false, proxyReqPathResolver: (req) => `/api/invoices${req.url}` }));

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

app.listen(process.env.PORT, () =>
  console.log(`API Gateway running on port ${process.env.PORT}`)
);
