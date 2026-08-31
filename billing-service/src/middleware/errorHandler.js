/**
 * Global Error Handler Middleware
 * 
 * Handles all unhandled errors and ensures consistent error response format
 */

const globalErrorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Default error response
  let statusCode = 500;
  let statusMessage = err.message || "Internal server error";
  let displayMessage = "Something went wrong. Please try again later.";

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    statusMessage = err.message;
    displayMessage = "Please check your input and try again.";
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    statusMessage = err.message;
    displayMessage = "Please login to continue.";
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    statusMessage = "Database connection failed";
    displayMessage = "Service temporarily unavailable. Please try again later.";
  }

  res.status(statusCode).json({
    status: "error",
    statusMessage,
    displayMessage
  });
};

// Handle 404 routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: "error",
    statusMessage: "Route not found",
    displayMessage: "The requested endpoint does not exist"
  });
};

module.exports = {
  globalErrorHandler,
  notFoundHandler
};