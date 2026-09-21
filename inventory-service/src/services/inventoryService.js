/**
 * inventoryService.js
 * Encapsulates all database operations for the inventory-service.
 * Controllers call these functions and only handle HTTP concerns.
 */

const { AppDataSource } = require("../config/database");
const { Inventory } = require("../models/Inventory");
const { InventoryTransaction } = require("../models/InventoryTransaction");
const { validateNumericId, validateAlphanumericId } = require("../utils/validate");

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
 * Upsert a single inventory record and log a transaction.
 * Uses the provided TypeORM manager (supports both regular repo and queryRunner).
 */
const upsertRecord = async (manager, entry, transactionType) => {
  const { productId, businessId, quantity, uom, lowStockThreshold, note } = entry;

  // Validate IDs before database operations - throws descriptive errors if invalid
  try {
    var validBusinessId = validateNumericId(businessId, 'businessId');
    var validProductId = validateAlphanumericId(productId, 'productId');
  } catch (validationError) {
    throw new Error(`Validation failed: ${validationError.message}`);
  }

  console.log('DEBUG upsertRecord:', { validBusinessId, validProductId, transactionType });

  // Get repository from manager (works with both regular repo and queryRunner manager)
  const repo = manager.getRepository ? manager.getRepository(Inventory) : manager;

  // TypeORM findOne with guaranteed valid where conditions
  // Use query builder for EntitySchema compatibility
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

  const transactionRepo = repo.manager ? repo.manager.getRepository(InventoryTransaction) : manager.getRepository(InventoryTransaction);
  await transactionRepo.insert({
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

/**
 * Add stock for a single entry (array of 1).
 * Uses plain repo — no wrapping transaction needed for one record.
 */
const addSingle = async (entry) => {
  return upsertRecord(inventoryRepo(), entry, "ADD");
};

/**
 * Add stock for multiple entries atomically.
 * Wraps all upserts in one DB transaction — all succeed or all roll back.
 */
const addBulk = async (entries) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const results = [];
    for (const entry of entries) {
      results.push(await upsertRecord(queryRunner.manager, entry, "BULK_UPLOAD"));
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
  return records.map((r) => ({ ...r, isLowStock: computeIsLowStock(r) }));
};

/** Get low-stock records for a business. */
const getLowStock = async (businessId) => {
  try {
    var validBusinessId = validateNumericId(businessId, 'businessId');
  } catch (validationError) {
    throw new Error(`Validation failed: ${validationError.message}`);
  }

  return inventoryRepo()
    .createQueryBuilder("inventory")
    .where("inventory.businessId = :businessId", { businessId: validBusinessId })
    .andWhere("inventory.lowStockThreshold > 0")
    .andWhere("inventory.currentStock <= inventory.lowStockThreshold")
    .andWhere("inventory.currentStock >= 0")
    .getMany();
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
  return { ...record, isLowStock: computeIsLowStock(record) };
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
  return repo.save(record);
};

/**
 * Update inventory records by id.
 * Directly sets uom, lowStockThreshold, currentStock.
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

    updated.push(saved);
  }

  return { updated };
};

/**
 * Delete inventory records by id.
 * Returns { deletedIds } or { notFound: id } on first missing record.
 */
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
 * Deduct stock atomically for a list of items (called by billing-service).
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

    // Get repositories from queryRunner manager
    const inventoryRepo = queryRunner.manager.getRepository(Inventory);
    const transactionRepo = queryRunner.manager.getRepository(InventoryTransaction);

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

      const record = await inventoryRepo
        .createQueryBuilder('inventory')
        .where('inventory.businessId = :businessId', { businessId: validBusinessId })
        .andWhere('inventory.productId = :productId', { productId: validProductId })
        .getOne();

      if (!record) {
        skipped.push({ productId: item.productId, reason: "No inventory record found" });
        continue;
      }

      const qtyDeducted = parseFloat(item.qty);
      record.currentStock = parseFloat(record.currentStock) - qtyDeducted;
      await inventoryRepo.save(record);

      await transactionRepo.insert({
        businessId: validBusinessId,
        productId: validProductId,
        type: "DEDUCT",
        quantity: qtyDeducted,
        referenceId: billNo,
        note: null,
      });

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
  setThreshold,
  updateById,
  deleteById,
  deductStock,
};
