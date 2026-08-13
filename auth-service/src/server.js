require("dotenv").config({ path: `.env.${process.env.NODE_ENV || "development"}` });
require("reflect-metadata");
const express = require("express");
const { AppDataSource } = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const { verifyToken } = require("./middleware/authMiddleware");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);

// Internal token verification endpoint used by other services via gateway
app.get("/api/auth/verify", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ valid: false });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(403).json({ valid: false });
  }
});

AppDataSource.initialize()
  .then(() => {
    console.log("Auth DB connected");
    app.listen(process.env.PORT, () =>
      console.log(`Auth service running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("DB connection failed:", err));
