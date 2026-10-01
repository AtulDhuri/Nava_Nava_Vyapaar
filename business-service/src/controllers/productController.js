const { AppDataSource } = require("../config/database");
const { Product } = require("../models/Product");
const { successResponse, errorResponse, getResponse } = require("../utils/responseHandler");
const { getInventoryByProducts } = require("../services/inventoryClient");

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
      
      // Validate description if provided
      if (item.description !== undefined && item.description !== null) {
        if (typeof item.description !== 'string') {
          return errorResponse(res, "Description must be a string", "Invalid description format", 400);
        }
        if (item.description.length > 5000) {
          return errorResponse(res, "Description cannot exceed 5000 characters", "Description is too long", 400);
        }
        // Sanitize description - basic HTML/script tag removal
        item.description = item.description.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
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
      query.andWhere("(product.name ILIKE :search OR product.productCode ILIKE :search OR COALESCE(product.description, '') ILIKE :search)", {
        search: `%${search}%`,
      });
    }
    
    const products = await query.getMany();
    
    // Fetch inventory data for all products.
    // Inventory is an ENRICHMENT, never a hard dependency: if the inventory
    // service is down, unreachable, or has no record for a product, we must
    // still return the full product list. Any failure here is swallowed and we
    // fall back to zero-stock defaults so the products endpoint never breaks.
    // Inventory keys its records by productCode (the SKU, e.g. "P001"), stored
    // as a varchar. Business-service products use a numeric primary key `id`,
    // so we must enrich by productCode, not id, or every lookup misses and
    // stock falls back to 0.
    let inventoryData = {};
    if (products.length > 0) {
      try {
        const productCodes = products.map(p => p.productCode);
        inventoryData = await getInventoryByProducts(businessId, productCodes);
      } catch (inventoryErr) {
        console.warn(`Inventory enrichment failed, returning products without live stock: ${inventoryErr.message}`);
        inventoryData = {};
      }
    }
    
    // Add inventory info to each product, matching on productCode.
    const productsWithInventory = products.map(product => ({
      ...product,
      currentStock: Number(inventoryData[product.productCode]?.currentStock) || 0,
      lowStockThreshold: Number(inventoryData[product.productCode]?.lowStockThreshold) || 0,
      lowStock: inventoryData[product.productCode]?.lowStock || false
    }));
    
    if (productsWithInventory.length === 0) {
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
        ? `Found ${productsWithInventory.length} product(s) matching "${search}"` 
        : "Your product catalog is ready";
        
      return res.status(200).json({
        status: "success",
        statusMessage: "Products retrieved successfully",
        displayMessage: withRecordsMessage,
        products: productsWithInventory
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
      
      // Validate description if provided in update
      if (item.description !== undefined && item.description !== null) {
        if (typeof item.description !== 'string') {
          return errorResponse(res, "Description must be a string", "Invalid description format", 400);
        }
        if (item.description.length > 5000) {
          return errorResponse(res, "Description cannot exceed 5000 characters", "Description is too long", 400);
        }
        // Sanitize description - basic HTML/script tag removal
        item.description = item.description.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
      
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
