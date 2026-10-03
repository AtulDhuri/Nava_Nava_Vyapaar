/**
 * productService.js
 * Product domain logic, including inventory enrichment via a direct in-process
 * call to the inventory module. Returns plain data / outcome objects.
 */

const { AppDataSource } = require("../../config/database");
const { Product } = require("./models/Product");
const { getByProducts } = require("../inventory/inventoryService");

const productRepo = () => AppDataSource.getRepository(Product);

const MAX_DESCRIPTION_LENGTH = 5000;

/**
 * Validate and sanitize a product description in place.
 * @returns {string|null} error message, or null if valid.
 */
const sanitizeDescription = (item) => {
  if (item.description === undefined || item.description === null) return null;
  if (typeof item.description !== "string") return "Description must be a string";
  if (item.description.length > MAX_DESCRIPTION_LENGTH) return "Description cannot exceed 5000 characters";
  item.description = item.description.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  return null;
};

/**
 * Create one or more products for a business.
 * @returns {Promise<{products}|{error}>}
 */
const addProducts = async (businessId, products) => {
  for (const item of products) {
    if (!item.productCode || !item.name || !item.price || !item.uom || item.gstRate === undefined) {
      return { error: "productCode, name, price, uom and gstRate are required" };
    }
    const descError = sanitizeDescription(item);
    if (descError) return { error: descError };
  }

  const created = productRepo().create(products.map((p) => ({ ...p, businessId: parseInt(businessId) })));
  const saved = await productRepo().save(created);
  return { products: saved };
};

/**
 * List products for a business (optional search), enriched with live inventory.
 * Inventory enrichment is best-effort: failures fall back to zero defaults.
 */
const getProducts = async (businessId, search) => {
  const query = productRepo().createQueryBuilder("product")
    .where("product.businessId = :businessId", { businessId: parseInt(businessId) });

  if (search) {
    query.andWhere(
      "(product.name ILIKE :search OR product.productCode ILIKE :search OR COALESCE(product.description, '') ILIKE :search)",
      { search: `%${search}%` }
    );
  }

  const products = await query.getMany();

  let inventoryData = {};
  if (products.length > 0) {
    try {
      const productCodes = products.map((p) => p.productCode);
      inventoryData = await getByProducts(businessId, productCodes);
    } catch (inventoryErr) {
      console.warn(`Inventory enrichment failed, returning products without live stock: ${inventoryErr.message}`);
      inventoryData = {};
    }
  }

  return products.map((product) => ({
    ...product,
    currentStock: Number(inventoryData[product.productCode]?.currentStock) || 0,
    lowStockThreshold: Number(inventoryData[product.productCode]?.lowStockThreshold) || 0,
    lowStock: inventoryData[product.productCode]?.isLowStock || false,
  }));
};

/**
 * Update one or more products for a business.
 * @returns {Promise<{updated}|{error}|{notFound: id}>}
 */
const updateProducts = async (businessId, items) => {
  const updated = [];
  for (const item of items) {
    if (!item.id) return { error: "id is required for each item" };
    const descError = sanitizeDescription(item);
    if (descError) return { error: descError };

    const product = await productRepo().findOneBy({ id: parseInt(item.id), businessId: parseInt(businessId) });
    if (!product) return { notFound: item.id };
    productRepo().merge(product, item);
    updated.push(await productRepo().save(product));
  }
  return { updated };
};

/**
 * Delete one or more products for a business.
 * @returns {Promise<{deletedProducts}|{error}|{notFound: id}>}
 */
const deleteProducts = async (businessId, items) => {
  const deleted = [];
  for (const item of items) {
    if (!item.id) return { error: "id is required for each item" };
    const product = await productRepo().findOneBy({ id: parseInt(item.id), businessId: parseInt(businessId) });
    if (!product) return { notFound: item.id };
    deleted.push(product.name);
    await productRepo().remove(product);
  }
  return { deletedProducts: deleted };
};

module.exports = { addProducts, getProducts, updateProducts, deleteProducts };
