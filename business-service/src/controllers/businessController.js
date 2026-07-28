const { AppDataSource } = require("../config/database");
const { Business } = require("../models/Business");

const businessRepo = () => AppDataSource.getRepository(Business);

const addBusiness = async (req, res) => {
  try {
    const { name, address, gstNumber, contactNumber } = req.body;
    if (!name) return res.status(400).json({ message: "Business name required" });

    const business = businessRepo().create({ name, address, gstNumber, contactNumber });
    await businessRepo().save(business);
    res.status(201).json(business);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBusinesses = async (req, res) => {
  try {
    res.json(await businessRepo().find());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateBusiness = async (req, res) => {
  try {
    const business = await businessRepo().findOneBy({ id: parseInt(req.params.id) });
    if (!business) return res.status(404).json({ message: "Business not found" });

    businessRepo().merge(business, req.body);
    await businessRepo().save(business);
    res.json(business);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { addBusiness, getBusinesses, updateBusiness };
