const { AppDataSource } = require("../config/database");
const { Product } = require("../models/Product");
const { successResponse, errorResponse, getResponse } = require("../utils/responseHandler");

const productRepo = () => AppDataSource.getRepository(Product);

const addProduct = async (req, res) => {
  try {
    const products = Array.isArray(req.body) ? req.body : [req.body];
    const { businessId } = req.query;

    if (!businessId) {
      return errorResponse(res, "businessId is required", "Please provide a business ID", 400);
    }

    for (const item of products) {
      if (!item.productCode || !item.name || !item.price || !item.uom || item.gstRate === undefined) {
        return errorResponse(res, "productCode, name, price, uom and gstRate are required", "Please fill all required fields", 400);
      }
    }

    const created = productRepo().create(products.map((p) => ({ ...p, businessId: parseInt(businessId) })));
    const saved = await productRepo().save(created);

    return res.status(201).json({
      status: "success",
      statusMessage: "Product(s) added successfully",
      displayMessage: `${saved.length} product(s) added successfully`,
      products: saved
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

    const query = productRepo().createQueryBuilder("product")
      .where("product.businessId = :businessId", { businessId: parseInt(businessId) });

    if (search) {
      query.andWhere("product.name ILIKE :search OR product.productCode ILIKE :search", {
        search: `%${search}%`,
      });
    }
    
    const products = await query.getMany();
    
    if (products.length === 0) {
      const noRecordsMessage = search 
        ? `No products found matching "${search}"` 
        : "No products available. Start by adding your first product!";
        
      return res.status(200).json({
        status: "success",
        statusMessage: "Products retrieved successfully",
        displayMessage: noRecordsMessage,
        products: []
      });
    } else {
      const withRecordsMessage = search 
        ? `Found ${products.length} product(s) matching "${search}"` 
        : "Your product catalog is ready";
        
      return res.status(200).json({
        status: "success",
        statusMessage: "Products retrieved successfully",
        displayMessage: withRecordsMessage,
        products: products
      });
    }
  } catch (err) {
    return errorResponse(res, err.message, "Failed to retrieve products");
  }
};

const updateProduct = async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) return errorResponse(res, "businessId is required", "Please provide a business ID", 400);

    const items = Array.isArray(req.body) ? req.body : [req.body];
    const updated = [];

    for (const item of items) {
      if (!item.id) return errorResponse(res, "id is required for each item", "Please provide id for each product", 400);
      const product = await productRepo().findOneBy({ id: parseInt(item.id), businessId: parseInt(businessId) });
      if (!product) return errorResponse(res, `Product ${item.id} not found`, "One or more products could not be found", 404);
      productRepo().merge(product, item);
      updated.push(await productRepo().save(product));
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Product(s) updated successfully",
      displayMessage: `${updated.length} product(s) updated successfully`,
      products: updated
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
    const deleted = [];

    for (const item of items) {
      if (!item.id) return errorResponse(res, "id is required for each item", "Please provide id for each product", 400);
      const product = await productRepo().findOneBy({ id: parseInt(item.id), businessId: parseInt(businessId) });
      if (!product) return errorResponse(res, `Product ${item.id} not found`, "One or more products could not be found", 404);
      deleted.push(product.name);
      await productRepo().remove(product);
    }

    return res.status(200).json({
      status: "success",
      statusMessage: "Product(s) deleted successfully",
      displayMessage: `${deleted.length} product(s) deleted successfully`,
      deletedProducts: deleted
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to delete product");
  }
};

module.exports = { addProduct, getProducts, updateProduct, deleteProduct };
