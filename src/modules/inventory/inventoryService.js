/**
 * inventoryService.js
 * Encapsulates all database operations for the inventory module.
 * Controllers call these functions and only handle HTTP concerns.
 *
 * In the monolith, the business and billing modules also import these functions
 * directly (deductStock, getByProducts) instead of making HTTP calls.
 */

const { AppDataSource } = require("../../config/database");
const { Inventory } = require("./models/Inventory");
const { InventoryTransaction } = require("./models/InventoryTransaction");
const { validateNumericId, validateAlphanumericId } = require("./utils/validate");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inventoryRepo = () => AppDataSource.getRepository(Inventory);
const transactionRepo = () => AppDataSource.getRepository(InventoryTransaction);

/**
 * Compute isLowStock boolean for a single inventory record.
 * Rule: currentStock >= 0 AND currentStock <= lowStockThreshold AND lowStockThreshold > 0
 */
const computeIsLowStock = (record) => {
  const stock = parseFloat(record.currentStock);
  const threshold = parseFloat(record.lowStockThreshold);
  return stock >= 0 && stock <= threshold && threshold > 0;
};

/**
 * Normalize a saved/fetched inventory record for API responses.
 * Decimal columns are returned by the driver as strings; coerce numeric fields
 * to Number so responses always expose them as numbers, not strings.
 */
const normalizeRecord = (record) => {
  if (!record) return record;
  return {
    ...record,
    currentStock: Number(record.currentStock) || 0,
    lowStockThreshold: Number(record.lowStockThreshold) || 0,
  };
};

/**
 * Upsert a single inventory record and log a transaction.
 * Uses the provided TypeORM manager (supports both regular repo and queryRunner).
 */
const upsertRecord = async (manager, entry, transactionType) => {
  const { productId, businessId, quantity, uom, lowStockThreshold, note } = entry;

  try {
    var validBusinessId = validateNumericId(businessId, 'businessId');
    var validProductId = validateAlphanumericId(productId, 'productId');
  } catch (validationError) {
    throw new Error(`Validation failed: ${validationError.message}`);
  }

  const repo = manager.getRepository ? manager.getRepository(Inventory) : manager;

  let record = await repo
    .createQueryBuilder('inventory')
    .where('inventory.businessId = :businessId', { businessId: validBusinessId })
    .andWhere('inventory.productId = :productId', { productId: validProductId })
    .getOne();

  if (!record) {
    record = repo.create({
      businessId: validBusinessId,
      productId: validProductId,
      currentStock: parseFloat(quantity),
      lowStockThreshold: lowStockThreshold != null ? parseFloat(lowStockThreshold) : 0,
      uom: uom || null,
    });
  } else {
    record.currentStock = parseFloat(record.currentStock) + parseFloat(quantity);
    if (lowStockThreshold != null) record.lowStockThreshold = parseFloat(lowStockThreshold);
    if (uom !== undefined) record.uom = uom;
  }

  const saved = await repo.save(record);

  const txRepo = repo.manager ? repo.manager.getRepository(InventoryTransaction) : manager.getRepository(InventoryTransaction);
  await txRepo.insert({
    businessId: validBusinessId,
    productId: validProductId,
    type: transactionType,
    quantity: parseFloat(quantity),
    referenceId: null,
    note: note || null,
  });

  return saved;
};

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

/** Add stock for a single entry. */
const addSingle = async (entry) => {
  return normalizeRecord(await upsertRecord(inventoryRepo(), entry, "ADD"));
};

/** Add stock for multiple entries atomically. */
const addBulk = async (entries) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const results = [];
    for (const entry of entries) {
      results.push(normalizeRecord(await upsertRecord(queryRunner.manager, entry, "BULK_UPLOAD")));
    }
    await queryRunner.commitTransaction();
    return results;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
};

/** Get all inventory records for a business, with isLowStock computed. */
const getAll = async (businessId) => {
  try {
    var validBusinessId = validateNumericId(businessId, 'businessId');
  } catch (validationError) {
    throw new Error(`Validation failed: ${validationError.message}`);
  }

  const records = await inventoryRepo().find({ where: { businessId: validBusinessId } });
  return records.map((r) => ({ ...normalizeRecord(r), isLowStock: computeIsLowStock(r) }));
};

/** Get low-stock records for a business. */
const getLowStock = async (businessId) => {
  try {
    var validBusinessId = validateNumericId(businessId, 'businessId');
  } catch (validationError) {
    throw new Error(`Validation failed: ${validationError.message}`);
  }

  const records = await inventoryRepo()
    .createQueryBuilder("inventory")
    .where("inventory.businessId = :businessId", { businessId: validBusinessId })
    .andWhere("inventory.lowStockThreshold > 0")
    .andWhere("inventory.currentStock <= inventory.lowStockThreshold")
    .andWhere("inventory.currentStock >= 0")
    .getMany();
  return records.map((r) => normalizeRecord(r));
};

/** Get a single inventory record by (businessId, productId). */
const getByProduct = async (businessId, productId) => {
  try {
    var validBusinessId = validateNumericId(businessId, 'businessId');
    var validProductId = validateAlphanumericId(productId, 'productId');
  } catch (validationError) {
    throw new Error(`Validation failed: ${validationError.message}`);
  }

  const record = await inventoryRepo()
    .createQueryBuilder('inventory')
    .where('inventory.businessId = :businessId', { businessId: validBusinessId })
    .andWhere('inventory.productId = :productId', { productId: validProductId })
    .getOne();
  if (!record) return null;
  return { ...normalizeRecord(record), isLowStock: computeIsLowStock(record) };
};

/**
 * Get inventory records for MANY products in a single query.
 * Used by the business module to enrich a product list.
 * Returns a map keyed by productId.
 */
const getByProducts = async (businessId, productIds) => {
  try {
    var validBusinessId = validateNumericId(businessId, 'businessId');
  } catch (validationError) {
    throw new Error(`Validation failed: ${validationError.message}`);
  }

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return {};
  }

  const validProductIds = [];
  for (const pid of productIds) {
    try {
      validProductIds.push(validateAlphanumericId(pid, 'productId'));
    } catch {
      // skip invalid id — it just won't be enriched
    }
  }
  if (validProductIds.length === 0) return {};

  const records = await inventoryRepo()
    .createQueryBuilder('inventory')
    .where('inventory.businessId = :businessId', { businessId: validBusinessId })
    .andWhere('inventory.productId IN (:...productIds)', { productIds: validProductIds })
    .getMany();

  const map = {};
  for (const r of records) {
    map[r.productId] = {
      currentStock: Number(r.currentStock) || 0,
      lowStockThreshold: Number(r.lowStockThreshold) || 0,
      uom: r.uom,
      isLowStock: computeIsLowStock(r),
    };
  }
  return map;
};

/** Update lowStockThreshold on a record found by (businessId, productId). */
const setThreshold = async (businessId, productId, threshold) => {
  const repo = inventoryRepo();
  try {
    var validBusinessId = validateNumericId(businessId, 'businessId');
    var validProductId = validateAlphanumericId(productId, 'productId');
  } catch (validationError) {
    throw new Error(`Validation failed: ${validationError.message}`);
  }

  const record = await repo
    .createQueryBuilder('inventory')
    .where('inventory.businessId = :businessId', { businessId: validBusinessId })
    .andWhere('inventory.productId = :productId', { productId: validProductId })
    .getOne();
  if (!record) return null;
  record.lowStockThreshold = parseFloat(threshold);
  return normalizeRecord(await repo.save(record));
};

/**
 * Update inventory records by id.
 * Logs an ADJUSTMENT transaction if currentStock changed.
 */
const updateById = async (businessId, items) => {
  const repo = inventoryRepo();
  const txRepo = transactionRepo();
  try {
    var validBusinessId = validateNumericId(businessId, 'businessId');
  } catch (validationError) {
    throw new Error(`Validation failed: ${validationError.message}`);
  }

  const updated = [];

  for (const item of items) {
    const record = await repo
      .createQueryBuilder('inventory')
      .where('inventory.id = :id', { id: parseInt(item.id) })
      .andWhere('inventory.businessId = :businessId', { businessId: validBusinessId })
      .getOne();
    if (!record) return { notFound: item.id };

    const prevStock = parseFloat(record.currentStock);
    if (item.uom !== undefined) record.uom = item.uom;
    if (item.lowStockThreshold != null) record.lowStockThreshold = parseFloat(item.lowStockThreshold);
    if (item.currentStock != null) record.currentStock = parseFloat(item.currentStock);

    const saved = await repo.save(record);

    if (item.currentStock != null && parseFloat(item.currentStock) !== prevStock) {
      await txRepo.insert({
        businessId: validBusinessId,
        productId: record.productId,
        type: "ADJUSTMENT",
        quantity: Math.abs(parseFloat(item.currentStock) - prevStock),
        referenceId: null,
        note: item.note || null,
      });
    }

    updated.push(normalizeRecord(saved));
  }

  return { updated };
};

/** Delete inventory records by id. */
const deleteById = async (businessId, items) => {
  const repo = inventoryRepo();
  try {
    var validBusinessId = validateNumericId(businessId, 'businessId');
  } catch (validationError) {
    throw new Error(`Validation failed: ${validationError.message}`);
  }

  const deleted = [];

  for (const item of items) {
    const record = await repo
      .createQueryBuilder('inventory')
      .where('inventory.id = :id', { id: parseInt(item.id) })
      .andWhere('inventory.businessId = :businessId', { businessId: validBusinessId })
      .getOne();
    if (!record) return { notFound: item.id };
    await repo.remove(record);
    deleted.push(item.id);
  }

  return { deletedIds: deleted };
};

/**
 * Deduct stock atomically for a list of items (called by the billing module).
 * Returns { deducted, skipped }.
 */
const deductStock = async (businessId, billNo, items) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const deducted = [];
    const skipped = [];

    let validBusinessId;
    try {
      validBusinessId = validateNumericId(businessId, 'businessId');
    } catch (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    const inventoryRepoTx = queryRunner.manager.getRepository(Inventory);
    const transactionRepoTx = queryRunner.manager.getRepository(InventoryTransaction);

    for (const item of items) {
      if (item.productId == null) {
        skipped.push({ productId: null, reason: "No productId provided" });
        continue;
      }

      let validProductId;
      try {
        validProductId = validateAlphanumericId(item.productId, 'productId');
      } catch (validationError) {
        skipped.push({ productId: item.productId, reason: `Validation failed: ${validationError.message}` });
        continue;
      }

      const record = await inventoryRepoTx
        .createQueryBuilder('inventory')
        .where('inventory.businessId = :businessId', { businessId: validBusinessId })
        .andWhere('inventory.productId = :productId', { productId: validProductId })
        .getOne();

      if (!record) {
        console.warn(`[INVENTORY_LOOKUP_FAILED] No inventory found for businessId=${validBusinessId}, productId=${validProductId}`);
        skipped.push({ productId: item.productId, reason: "No inventory record found" });
        continue;
      }

      const qtyDeducted = parseFloat(item.qty);
      record.currentStock = parseFloat(record.currentStock) - qtyDeducted;

      try {
        await inventoryRepoTx.save(record);
      } catch (saveErr) {
        skipped.push({ productId: item.productId, reason: `Failed to update stock: ${saveErr.message}` });
        continue;
      }

      try {
        await transactionRepoTx.insert({
          businessId: validBusinessId,
          productId: validProductId,
          type: "DEDUCT",
          quantity: qtyDeducted,
          referenceId: billNo,
          note: null,
        });
      } catch (insertErr) {
        console.error(`[TRANSACTION_INSERT_ERROR]`, {
          productId: validProductId,
          businessId: validBusinessId,
          error: insertErr.message,
          errorCode: insertErr.code,
          errorDetail: insertErr.detail
        });
        console.warn(`[WARNING] Failed to insert transaction record for ${validProductId}:`, insertErr.message);
      }

      deducted.push({ productId: item.productId, qtyDeducted, remainingStock: record.currentStock });
    }

    await queryRunner.commitTransaction();
    return { deducted, skipped };
  } catch (err) {
    try {
      await queryRunner.rollbackTransaction();
      throw { status: 500, message: err.message };
    } catch (rollbackErr) {
      throw { status: 503, message: `Rollback failed: ${rollbackErr.message}` };
    }
  } finally {
    await queryRunner.release();
  }
};

module.exports = {
  addSingle,
  addBulk,
  getAll,
  getLowStock,
  getByProduct,
  getByProducts,
  setThreshold,
  updateById,
  deleteById,
  deductStock,
};
