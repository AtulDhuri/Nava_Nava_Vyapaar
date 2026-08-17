require("dotenv").config({ path: `.env.${process.env.NODE_ENV || "development"}` });
require("reflect-metadata");
const express = require("express");
const { AppDataSource } = require("./config/database");
const billingRoutes = require("./routes/billingRoutes");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/api/invoices", billingRoutes);

AppDataSource.initialize()
  .then(() => {
    console.log("Billing DB connected");
    app.listen(process.env.PORT, () =>
      console.log(`Billing service running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("DB connection failed:", err));
