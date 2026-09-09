const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  if (req.headers["x-internal-key"] === process.env.INTERNAL_API_KEY) return next();

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
