const express = require("express");
const { signup, signin } = require("../controllers/authController");
const { authLimiter } = require("../../../middleware/rateLimiter");

const router = express.Router();

// Rate-limit auth endpoints to curb brute-force attempts.
router.post("/signup", authLimiter, signup);
router.post("/signin", authLimiter, signin);

module.exports = router;
