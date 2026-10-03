const authService = require("../authService");
const { errorResponse } = require("../../../utils/responseHandler");

const checkDatabaseReady = (res) => {
  if (!authService.isDatabaseReady()) {
    return errorResponse(res, "Database not initialized", "Service is initializing. Please try again in a moment.", 503);
  }
  return null;
};

const signup = async (req, res) => {
  try {
    const dbCheck = checkDatabaseReady(res);
    if (dbCheck) return dbCheck;

    const { firstName, lastName, mobileNo, password } = req.body;
    if (!firstName || !lastName || !mobileNo || !password) {
      return errorResponse(res, "All fields are required", "Please fill all required fields", 400);
    }

    const result = await authService.signup({ firstName, lastName, mobileNo, password });
    if (result.conflict) {
      return errorResponse(res, "Mobile number already registered", "This mobile number is already registered", 409);
    }

    const { user } = result;
    return res.status(201).json({
      status: "success",
      statusMessage: "User registered successfully",
      displayMessage: `Welcome ${user.firstName}! Registration completed successfully`,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      mobileNo: user.mobileNo,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return errorResponse(res, err.message, "Registration failed. Please try again", 500);
  }
};

const signin = async (req, res) => {
  try {
    const dbCheck = checkDatabaseReady(res);
    if (dbCheck) return dbCheck;

    const { mobileNo, password } = req.body;
    if (!mobileNo || !password) {
      return errorResponse(res, "Mobile number and password required", "Please enter both mobile number and password", 400);
    }

    const result = await authService.signin({ mobileNo, password });
    if (result.invalid) {
      return errorResponse(res, "Invalid credentials", "Invalid mobile number or password", 401);
    }
    if (result.misconfigured) {
      return errorResponse(res, "Server configuration error", "Service is not properly configured", 500);
    }

    const { token, user } = result;
    return res.status(200).json({
      status: "success",
      statusMessage: "User authenticated",
      displayMessage: `Welcome ${user.firstName}!`,
      token,
      userId: user.id,
      mobileNo: user.mobileNo,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (err) {
    console.error("Signin error:", err);
    return errorResponse(res, err.message, "Login failed. Please try again", 500);
  }
};

module.exports = { signup, signin };
