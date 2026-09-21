const { EntitySchema } = require("typeorm");

const Inventory = new EntitySchema({
  name: "Inventory",
  tableName: "inventory",
  columns: {
    id:                { primary: true, type: "int", generated: true },
    businessId:        { type: "int", nullable: false },
    productId:         { type: "varchar", length: 100, nullable: false },
    currentStock:      { type: "decimal", precision: 12, scale: 3, default: 0 },
    lowStockThreshold: { type: "decimal", precision: 12, scale: 3, default: 0 },
    uom:               { type: "varchar", nullable: true },
    lastUpdatedAt:     { type: "timestamp", updateDate: true },
    createdAt:         { type: "timestamp", createDate: true },
  },
  uniques: [
    { columns: ["businessId", "productId"] }
  ],
});

module.exports = { Inventory };
