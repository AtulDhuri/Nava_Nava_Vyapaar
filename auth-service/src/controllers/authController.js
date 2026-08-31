const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AppDataSource } = require("../config/database");
const { User } = require("../models/User");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const userRepo = () => AppDataSource.getRepository(User);

const signup = async (req, res) => {
  try {
    const { firstName, lastName, mobileNo, password } = req.body;
    
    if (!firstName || !lastName || !mobileNo || !password) {
      return errorResponse(res, "All fields are required", "Please fill all required fields", 400);
    }

    const existing = await userRepo().findOneBy({ mobileNo });
    if (existing) {
      return errorResponse(res, "Mobile number already registered", "This mobile number is already registered", 409);
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = userRepo().create({ firstName, lastName, mobileNo, password: hashed });
    await userRepo().save(user);

    return res.status(201).json({
      status: "success",
      statusMessage: "User registered successfully", 
      displayMessage: `Welcome ${user.firstName}! Registration completed successfully`,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      mobileNo: user.mobileNo
    });
  } catch (err) {
    return errorResponse(res, err.message, "Registration failed. Please try again");
  }
};

const signin = async (req, res) => {
  try {
    const { mobileNo, password } = req.body;
    
    if (!mobileNo || !password) {
      return errorResponse(res, "Mobile number and password required", "Please enter both mobile number and password", 400);
    }

    const user = await userRepo().findOneBy({ mobileNo });
    if (!user) {
      return errorResponse(res, "Invalid credentials", "Invalid mobile number or password", 401);
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return errorResponse(res, "Invalid credentials", "Invalid mobile number or password", 401);
    }

    const token = jwt.sign(
      { userId: user.id, mobileNo: user.mobileNo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      status: "success",
      statusMessage: "User authenticated",
      displayMessage: `Welcome ${user.firstName}!`,
      token,
      userId: user.id,
      mobileNo: user.mobileNo,
      firstName: user.firstName,
      lastName: user.lastName
    });
  } catch (err) {
    return errorResponse(res, err.message, "Login failed. Please try again");
  }
};

module.exports = { signup, signin };
