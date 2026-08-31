const { AppDataSource } = require("../config/database");
const { Product } = require("../models/Product");
const { successResponse, errorResponse, getResponse } = require("../utils/responseHandler");

const productRepo = () => AppDataSource.getRepository(Product);

const addProduct = async (req, res) => {
  try {
    const { productCode, name, category, price, uom, gstRate } = req.body;
    if (!productCode || !name || !price || !uom || gstRate === undefined) {
      return errorResponse(res, "productCode, name, price, uom and gstRate are required", "Please fill all required fields", 400);
    }

    const product = productRepo().create({ productCode, name, category, price, uom, gstRate });
    await productRepo().save(product);
    
    return res.status(201).json({
      status: "success",
      statusMessage: "Product added successfully",
      displayMessage: `Product ${product.name} added successfully`,
      product: product
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to add product");
  }
};

const getProducts = async (req, res) => {
  try {
    const { search } = req.query;
    const query = productRepo().createQueryBuilder("product");
    if (search) {
      query.where("product.name ILIKE :search OR product.productCode ILIKE :search", {
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
    const product = await productRepo().findOneBy({ id: parseInt(req.params.id) });
    if (!product) {
      return errorResponse(res, "Product not found", "The requested product could not be found", 404);
    }

    productRepo().merge(product, req.body);
    await productRepo().save(product);
    
    return res.status(200).json({
      status: "success",
      statusMessage: "Product updated successfully",
      displayMessage: `Product ${product.name} updated successfully`,
      product: product
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to update product");
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await productRepo().findOneBy({ id: parseInt(req.params.id) });
    if (!product) {
      return errorResponse(res, "Product not found", "The requested product could not be found", 404);
    }

    const productName = product.name;
    await productRepo().remove(product);
    
    return res.status(200).json({
      status: "success",
      statusMessage: "Product deleted successfully",
      displayMessage: `Product ${productName} deleted successfully`,
      deletedProduct: productName
    });
  } catch (err) {
    return errorResponse(res, err.message, "Failed to delete product");
  }
};

module.exports = { addProduct, getProducts, updateProduct, deleteProduct };
