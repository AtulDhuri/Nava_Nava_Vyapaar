const express = require("express");
const { addBusiness, getBusinesses, updateBusiness } = require("../controllers/businessController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken);
router.post("/", addBusiness);
router.get("/", getBusinesses);
router.put("/", updateBusiness);

module.exports = router;
