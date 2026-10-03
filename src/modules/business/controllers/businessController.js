const businessService = require("../businessService");
const { errorResponse } = require("../../../utils/responseHandler");

const addBusiness = async (req, res) => {
  try {
    const { name, address, gstNumber, contactNumber } = req.body;
    if (!name) {
      return errorResponse(res, "Business name required", "Please provide business name", 400);
    }

    const business = await businessService.addBusiness(req.user.userId, { name, address, gstNumber, contactNumber });

    return res.status(201).json({
      status: "success",
      statusMessage: "Business registered successfully",
      displayMessage: `Business registered with ${business.name}!`,
      business,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Something went wrong, Connect with admin");
  }
};

const getBusinesses = async (req, res) => {
  try {
    const businesses = await businessService.getBusinesses(req.user.userId);

    const displayMessage = businesses.length === 0
      ? "No businesses found. Start by adding your first business!"
      : "Your businesses are ready to view";

    return res.status(200).json({
      status: "success",
      statusMessage: "Businesses retrieved successfully",
      displayMessage,
      businesses,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Something went wrong, Connect with admin");
  }
};

const updateBusiness = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    for (const item of items) {
      if (!item.id) return errorResponse(res, "id is required for each item", "Please provide id for each business", 400);
    }

    const result = await businessService.updateBusinesses(req.user.userId, items);
    if (result.notFound !== undefined) {
      return errorResponse(res, `Business ${result.notFound} not found`, "One or more businesses could not be found", 404);
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Business(es) updated successfully",
      displayMessage: `${result.updated.length} business(es) updated successfully`,
      businesses: result.updated,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to update business");
  }
};

module.exports = { addBusiness, getBusinesses, updateBusiness };
