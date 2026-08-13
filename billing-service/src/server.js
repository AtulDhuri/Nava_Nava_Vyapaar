require("dotenv").config({ path: `.env.${process.env.NODE_ENV || "development"}` });
require("reflect-metadata");
const express = require("express");
const { AppDataSource } = require("./config/database");
const billingRoutes = require("./routes/billingRoutes");

const app = express();
app.use(express.json());

app.use("/api/invoices", billingRoutes);

AppDataSource.initialize()
  .then(() => {
    console.log("Billing DB connected");
    app.listen(process.env.PORT, () =>
      console.log(`Billing service running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("DB connection failed:", err));
