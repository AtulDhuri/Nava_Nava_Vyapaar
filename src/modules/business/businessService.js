/**
 * businessService.js
 * Business-entity domain logic plus shared product-code resolution used by other
 * modules (replaces the former /internal HTTP endpoint used by billing).
 * Returns plain data / outcome objects; controllers map them to HTTP responses.
 */

const { AppDataSource } = require("../../config/database");
const { Business } = require("./models/Business");
const { Product } = require("./models/Product");

const businessRepo = () => AppDataSource.getRepository(Business);
const productRepo = () => AppDataSource.getRepository(Product);

// ---------------------------------------------------------------------------
// Business entity operations
// ---------------------------------------------------------------------------

/** Create a business owned by a user. */
const addBusiness = async (userId, { name, address, gstNumber, contactNumber }) => {
  const business = businessRepo().create({ userId, name, address, gstNumber, contactNumber });
  return businessRepo().save(business);
};

/** List businesses owned by a user. */
const getBusinesses = async (userId) => {
  return businessRepo().findBy({ userId });
};

/**
 * Update one or more businesses owned by a user.
 * @returns {Promise<{updated}|{notFound: id}>}
 */
const updateBusinesses = async (userId, items) => {
  const updated = [];
  for (const item of items) {
    const business = await businessRepo().findOneBy({ id: parseInt(item.id), userId });
    if (!business) return { notFound: item.id };
    const { id, ...updateData } = item;
    businessRepo().merge(business, updateData);
    updated.push(await businessRepo().save(business));
  }
  return { updated };
};

// ---------------------------------------------------------------------------
// Shared cross-module function (called directly by the billing module)
// ---------------------------------------------------------------------------

/**
 * Resolve business product primary keys (numeric id, e.g. 111) to their
 * productCode SKUs (e.g. "P001") in a single query.
 * Returns a map { "111": "P001", ... }; ids with no match are absent.
 * Best-effort: on any failure returns an empty map.
 */
const resolveProductCodes = async (businessId, productIds) => {
  if (!businessId || !Array.isArray(productIds) || productIds.length === 0) {
    return {};
  }

  const numericIds = productIds
    .map((pid) => parseInt(pid, 10))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (numericIds.length === 0) return {};

  try {
    const products = await productRepo()
      .createQueryBuilder("product")
      .select(["product.id", "product.productCode"])
      .where("product.businessId = :businessId", { businessId: parseInt(businessId) })
      .andWhere("product.id IN (:...ids)", { ids: numericIds })
      .getMany();

    const codes = {};
    for (const p of products) {
      codes[String(p.id)] = p.productCode;
    }
    return codes;
  } catch (err) {
    console.warn(`resolveProductCodes failed: ${err.message}`);
    return {};
  }
};

module.exports = {
  addBusiness,
  getBusinesses,
  updateBusinesses,
  resolveProductCodes,
};
