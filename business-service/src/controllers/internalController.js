const { AppDataSource } = require("../config/database");
const { Product } = require("../models/Product");

const productRepo = () => AppDataSource.getRepository(Product);

// ---------------------------------------------------------------------------
// POST /internal/products/resolve-codes
// Body: { businessId, productIds: [ ... ] }
//
// Resolves business-service product primary keys (numeric `id`, e.g. 111) to
// their `productCode` SKUs (e.g. "P001"). Other services (billing, inventory)
// key their records by productCode, but the frontend often sends the numeric
// product id on invoice items — so billing needs to translate id -> code before
// deducting stock.
//
// Returns a map keyed by the product id (as a string):
//   { "111": "P001", "112": "P002" }
// Ids with no matching product are simply absent from the map.
//
// No JWT — service-to-service only, secured by network placement.
// ---------------------------------------------------------------------------
const resolveProductCodes = async (req, res) => {
  const { businessId, productIds } = req.body;

  if (!businessId || !Number.isInteger(Number(businessId)) || Number(businessId) <= 0) {
    return res.status(400).json({
      status: "error",
      statusMessage: "businessId must be a positive integer",
      displayMessage: "Please provide a valid business ID",
    });
  }

  if (!Array.isArray(productIds)) {
    return res.status(400).json({
      status: "error",
      statusMessage: "productIds must be an array",
      displayMessage: "Please provide an array of product IDs",
    });
  }

  // Empty list is a valid no-op.
  if (productIds.length === 0) {
    return res.status(200).json({
      status: "success",
      statusMessage: "No product IDs provided",
      displayMessage: "No codes to resolve",
      codes: {},
    });
  }

  // Keep only values that are valid positive integer ids.
  const numericIds = productIds
    .map((pid) => parseInt(pid, 10))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (numericIds.length === 0) {
    return res.status(200).json({
      status: "success",
      statusMessage: "No valid product IDs provided",
      displayMessage: "No codes to resolve",
      codes: {},
    });
  }

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

    return res.status(200).json({
      status: "success",
      statusMessage: "Product codes resolved successfully",
      displayMessage: "Product codes resolved",
      codes, // map: { [productId]: productCode }
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      statusMessage: err.message,
      displayMessage: "Failed to resolve product codes",
    });
  }
};

module.exports = { resolveProductCodes };
