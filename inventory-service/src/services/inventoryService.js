/**
 * inventoryService.js
 * Encapsulates all database operations for the inventory-service.
 * Controllers call these functions and only handle HTTP concerns.
 */

const { AppDataSource } = require("../config/database");
const { Inventory } = require("../models/Inventory");
const { InventoryTransaction } = require("../models/InventoryTransaction");

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

  let record = await manager.findOne(Inventory, {
    where: { businessId: parseInt(businessId), productId: parseInt(productId) },
  });

  if (!record) {
    record = manager.create(Inventory, {
      businessId: parseInt(businessId),
      productId: parseInt(productId),
      currentStock: parseFloat(quantity),
      lowStockThreshold: lowStockThreshold != null ? parseFloat(lowStockThreshold) : 0,
      uom: uom || null,
    });
  } else {
    record.currentStock = parseFloat(record.currentStock) + parseFloat(quantity);
    if (lowStockThreshold != null) record.lowStockThreshold = parseFloat(lowStockThreshold);
    if (uom !== undefined) record.uom = uom;
  }

  const saved = await manager.save(Inventory, record);

  await manager.insert(InventoryTransaction, {
    businessId: parseInt(businessId),
    productId: parseInt(productId),
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
  const records = await inventoryRepo().find({ where: { businessId: parseInt(businessId) } });
  return records.map((r) => ({ ...r, isLowStock: computeIsLowStock(r) }));
};

/** Get low-stock records for a business. */
const getLowStock = async (businessId) => {
  return inventoryRepo()
    .createQueryBuilder("inventory")
    .where("inventory.businessId = :businessId", { businessId: parseInt(businessId) })
    .andWhere("inventory.lowStockThreshold > 0")
    .andWhere("inventory.currentStock <= inventory.lowStockThreshold")
    .andWhere("inventory.currentStock >= 0")
    .getMany();
};

/** Get a single inventory record by (businessId, productId). */
const getByProduct = async (businessId, productId) => {
  const record = await inventoryRepo().findOne({
    where: { businessId: parseInt(businessId), productId: parseInt(productId) },
  });
  if (!record) return null;
  return { ...record, isLowStock: computeIsLowStock(record) };
};

/** Update lowStockThreshold on a record found by (businessId, productId). */
const setThreshold = async (businessId, productId, threshold) => {
  const repo = inventoryRepo();
  const record = await repo.findOne({
    where: { businessId: parseInt(businessId), productId: parseInt(productId) },
  });
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
  const updated = [];

  for (const item of items) {
    const record = await repo.findOne({
      where: { id: parseInt(item.id), businessId: parseInt(businessId) },
    });
    if (!record) return { notFound: item.id };

    const prevStock = parseFloat(record.currentStock);
    if (item.uom !== undefined) record.uom = item.uom;
    if (item.lowStockThreshold != null) record.lowStockThreshold = parseFloat(item.lowStockThreshold);
    if (item.currentStock != null) record.currentStock = parseFloat(item.currentStock);

    const saved = await repo.save(record);

    if (item.currentStock != null && parseFloat(item.currentStock) !== prevStock) {
      await txRepo.insert({
        businessId: parseInt(businessId),
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
  const deleted = [];

  for (const item of items) {
    const record = await repo.findOne({
      where: { id: parseInt(item.id), businessId: parseInt(businessId) },
    });
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

    for (const item of items) {
      if (item.productId == null) {
        skipped.push({ productId: null, reason: "No productId provided" });
        continue;
      }

      const record = await queryRunner.manager.findOne(Inventory, {
        where: { businessId: parseInt(businessId), productId: parseInt(item.productId) },
      });

      if (!record) {
        skipped.push({ productId: item.productId, reason: "No inventory record found" });
        continue;
      }

      const qtyDeducted = parseFloat(item.qty);
      record.currentStock = parseFloat(record.currentStock) - qtyDeducted;
      await queryRunner.manager.save(Inventory, record);

      await queryRunner.manager.insert(InventoryTransaction, {
        businessId: parseInt(businessId),
        productId: parseInt(item.productId),
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
