/**
 * authService.js
 * Authentication domain logic: user registration and sign-in (hashing, lookup,
 * JWT issuance). Returns plain data or a small outcome object; the controller
 * maps outcomes to HTTP responses.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AppDataSource } = require("../../config/database");
const { User } = require("./models/User");

const userRepo = () => AppDataSource.getRepository(User);

const isDatabaseReady = () => AppDataSource && AppDataSource.isInitialized;

// Sensible default so a missing JWT_EXPIRES_IN can never mint a non-expiring token.
const DEFAULT_JWT_EXPIRES_IN = "7d";

/**
 * Register a new user.
 * @returns {Promise<{user}|{conflict: true}>}
 */
const signup = async ({ firstName, lastName, mobileNo, password }) => {
  const existing = await userRepo().findOneBy({ mobileNo });
  if (existing) return { conflict: true };

  const hashed = await bcrypt.hash(password, 10);
  const user = userRepo().create({ firstName, lastName, mobileNo, password: hashed });
  await userRepo().save(user);
  return { user };
};

/**
 * Authenticate a user and issue a JWT.
 * @returns {Promise<{token, user}|{invalid: true}|{misconfigured: true}>}
 */
const signin = async ({ mobileNo, password }) => {
  const user = await userRepo().findOneBy({ mobileNo });
  if (!user) return { invalid: true };

  const match = await bcrypt.compare(password, user.password);
  if (!match) return { invalid: true };

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET not configured");
    return { misconfigured: true };
  }

  const token = jwt.sign(
    { userId: user.id, mobileNo: user.mobileNo },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN }
  );

  return { token, user };
};

module.exports = { signup, signin, isDatabaseReady };
