const rateLimit = require("express-rate-limit");

/**
 * Rate limiter for authentication endpoints (signin/signup).
 * Limits brute-force attempts: by default 10 requests per IP per 15 minutes.
 * Tunable via AUTH_RATE_LIMIT_WINDOW_MS and AUTH_RATE_LIMIT_MAX.
 */
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  message: {
    status: "error",
    statusMessage: "Too many requests",
    displayMessage: "Too many attempts. Please try again later.",
  },
});

module.exports = { authLimiter };
