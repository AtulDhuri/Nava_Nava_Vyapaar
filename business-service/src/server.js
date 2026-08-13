require("dotenv").config({ path: `.env.${process.env.NODE_ENV || "development"}` });
require("reflect-metadata");
const express = require("express");
const { AppDataSource } = require("./config/database");
const businessRoutes = require("./routes/businessRoutes");
const productRoutes = require("./routes/productRoutes");

const app = express();
app.use(express.json());

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
