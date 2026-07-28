const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AppDataSource } = require("../config/database");
const { User } = require("../models/User");

const userRepo = () => AppDataSource.getRepository(User);

const signup = async (req, res) => {
  try {
    const { firstName, lastName, mobileNo, password } = req.body;
    if (!firstName || !lastName || !mobileNo || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await userRepo().findOneBy({ mobileNo });
    if (existing) return res.status(409).json({ message: "Mobile number already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = userRepo().create({ firstName, lastName, mobileNo, password: hashed });
    await userRepo().save(user);

    res.status(201).json({ message: "User registered successfully", userId: user.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const signin = async (req, res) => {
  try {
    const { mobileNo, password } = req.body;
    if (!mobileNo || !password)
      return res.status(400).json({ message: "Mobile number and password required" });

    const user = await userRepo().findOneBy({ mobileNo });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, mobileNo: user.mobileNo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ token, userId: user.id, firstName: user.firstName, lastName: user.lastName });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { signup, signin };
