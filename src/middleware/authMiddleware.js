const jwt = require("jsonwebtoken");

/**
 * Unified JWT auth middleware for the monolith.
 * Reads a Bearer token from the Authorization header and verifies it with
 * JWT_SECRET. On success attaches the decoded payload to req.user.
 *
 * Returns 401 when no token is present, and 403 when the token is invalid or
 * expired (standardized across all modules — the old inventory-service returned
 * 401 for invalid tokens, the others returned 403; we unify on 403 here).
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({
    status: "error",
    statusMessage: "Token required",
    displayMessage: "Please provide authentication token"
  });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({
      status: "error",
      statusMessage: "Invalid or expired token",
      displayMessage: "Please login again"
    });
  }
};

module.exports = { verifyToken };
