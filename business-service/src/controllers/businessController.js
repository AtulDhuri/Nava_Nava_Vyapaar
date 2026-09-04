const { AppDataSource } = require("../config/database");
const { Business } = require("../models/Business");
const { successResponse, errorResponse, getResponse } = require("../utils/responseHandler");

const businessRepo = () => AppDataSource.getRepository(Business);

const addBusiness = async (req, res) => {
  try {
    const { name, address, gstNumber, contactNumber } = req.body;
    if (!name) {
      return errorResponse(res, "Business name required", "Please provide business name", 400);
    }

    const business = businessRepo().create({ userId: req.user.userId, name, address, gstNumber, contactNumber });
    await businessRepo().save(business);
    
    return res.status(201).json({
      status: "success",
      statusMessage: "Business registered successfully",
      displayMessage: `Business registered with ${business.name}!`,
      business: business
    });
  } catch (err) {
    return errorResponse(res, err.message, "Something went wrong, Connect with admin");
  }
};

const getBusinesses = async (req, res) => {
  try {
    const businesses = await businessRepo().findBy({ userId: req.user.userId });
    
    if (businesses.length === 0) {
      return res.status(200).json({
        status: "success",
        statusMessage: "Businesses retrieved successfully",
        displayMessage: "No businesses found. Start by adding your first business!",
        businesses: []
      });
    } else {
      return res.status(200).json({
        status: "success", 
        statusMessage: "Businesses retrieved successfully",
        displayMessage: "Your businesses are ready to view",
        businesses: businesses
      });
    }
  } catch (err) {
    return errorResponse(res, err.message, "Something went wrong, Connect with admin");
  }
};

const updateBusiness = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const updated = [];

    for (const item of items) {
      if (!item.id) return errorResponse(res, "id is required for each item", "Please provide id for each business", 400);
      const business = await businessRepo().findOneBy({ id: parseInt(item.id), userId: req.user.userId });
      if (!business) return errorResponse(res, `Business ${item.id} not found`, "One or more businesses could not be found", 404);
      businessRepo().merge(business, item);
      updated.push(await businessRepo().save(business));
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Business(es) updated successfully",
      displayMessage: `${updated.length} business(es) updated successfully`,
      businesses: updated
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to update business");
  }
};

module.exports = { addBusiness, getBusinesses, updateBusiness };
