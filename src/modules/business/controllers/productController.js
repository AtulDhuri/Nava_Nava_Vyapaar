const productService = require("../productService");
const { errorResponse } = require("../../../utils/responseHandler");

const addProduct = async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) {
      return errorResponse(res, "businessId is required", "Please provide a business ID", 400);
    }

    const products = Array.isArray(req.body) ? req.body : [req.body];
    const result = await productService.addProducts(businessId, products);
    if (result.error) {
      return errorResponse(res, result.error, "Please fill all required fields", 400);
    }

    return res.status(201).json({
      status: "success",
      statusMessage: "Product(s) added successfully",
      displayMessage: `${result.products.length} product(s) added successfully`,
      products: result.products,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to add product");
  }
};

const getProducts = async (req, res) => {
  try {
    const { search, businessId } = req.query;
    if (!businessId) {
      return errorResponse(res, "businessId is required", "Please provide a business ID", 400);
    }

    const products = await productService.getProducts(businessId, search);

    const displayMessage = products.length === 0
      ? (search ? `No products found matching "${search}"` : "No products available. Start by adding your first product!")
      : (search ? `Found ${products.length} product(s) matching "${search}"` : "Your product catalog is ready");

    return res.status(200).json({
      status: "success",
      statusMessage: "Products retrieved successfully",
      displayMessage,
      products,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to retrieve products");
  }
};

const updateProduct = async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) return errorResponse(res, "businessId is required", "Please provide a business ID", 400);

    const items = Array.isArray(req.body) ? req.body : [req.body];
    const result = await productService.updateProducts(businessId, items);
    if (result.error) {
      return errorResponse(res, result.error, "Please check your input and try again", 400);
    }
    if (result.notFound !== undefined) {
      return errorResponse(res, `Product ${result.notFound} not found`, "One or more products could not be found", 404);
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Product(s) updated successfully",
      displayMessage: `${result.updated.length} product(s) updated successfully`,
      products: result.updated,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to update product");
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) return errorResponse(res, "businessId is required", "Please provide a business ID", 400);

    const items = Array.isArray(req.body) ? req.body : [req.body];
    const result = await productService.deleteProducts(businessId, items);
    if (result.error) {
      return errorResponse(res, result.error, "Please provide id for each product", 400);
    }
    if (result.notFound !== undefined) {
      return errorResponse(res, `Product ${result.notFound} not found`, "One or more products could not be found", 404);
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Product(s) deleted successfully",
      displayMessage: `${result.deletedProducts.length} product(s) deleted successfully`,
      deletedProducts: result.deletedProducts,
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to delete product");
  }
};

module.exports = { addProduct, getProducts, updateProduct, deleteProduct };
