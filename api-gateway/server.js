require("dotenv").config({ path: `.env.${process.env.NODE_ENV || "development"}` });
const express = require("express");
const proxy = require("express-http-proxy");

const app = express();

app.use("/api/auth", proxy(process.env.AUTH_SERVICE_URL));
app.use("/api/businesses", proxy(process.env.BUSINESS_SERVICE_URL));
app.use("/api/products", proxy(process.env.BUSINESS_SERVICE_URL));
app.use("/api/invoices", proxy(process.env.BILLING_SERVICE_URL));

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

app.listen(process.env.PORT, () =>
  console.log(`API Gateway running on port ${process.env.PORT}`)
);
