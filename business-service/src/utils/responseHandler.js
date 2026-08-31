/**
 * Standardized API Response Handler
 * 
 * Response Format:
 * {
 *   status: "success" | "error",
 *   statusMessage: "Message for developers/logs",
 *   displayMessage: "User-friendly message"
 * }
 */

const createResponse = (status, statusMessage, displayMessage, statusCode = 200) => {
  const response = {
    status,
    statusMessage,
    displayMessage
  };

  return { response, statusCode };
};

const successResponse = (res, statusMessage, displayMessage, statusCode = 200) => {
  const { response, statusCode: code } = createResponse("success", statusMessage, displayMessage, statusCode);
  return res.status(code).json(response);
};

const getResponse = (res, statusMessage, displayMessageWithRecords, displayMessageNoRecords, data = []) => {
  let finalDisplayMessage;
  
  if (Array.isArray(data) && data.length === 0) {
    finalDisplayMessage = displayMessageNoRecords || "No records found";
  } else if (Array.isArray(data)) {
    finalDisplayMessage = displayMessageWithRecords || `Data retrieved - ${data.length} record(s)`;
  } else {
    // For single object responses
    finalDisplayMessage = displayMessageWithRecords || "Data retrieved successfully";
  }
  
  return successResponse(res, statusMessage, finalDisplayMessage);
};

const errorResponse = (res, statusMessage, displayMessage = "Something went wrong", statusCode = 500) => {
  const { response, statusCode: code } = createResponse("error", statusMessage, displayMessage, statusCode);
  return res.status(code).json(response);
};

module.exports = {
  successResponse,
  errorResponse,
  createResponse,
  getResponse
};