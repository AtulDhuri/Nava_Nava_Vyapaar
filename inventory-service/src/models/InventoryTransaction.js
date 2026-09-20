const { EntitySchema } = require("typeorm");

const InventoryTransaction = new EntitySchema({
  name: "InventoryTransaction",
  tableName: "inventory_transactions",
  columns: {
    id:          { primary: true, type: "int", generated: true },
    businessId:  { type: "int", nullable: false },
    productId:   { type: "int", nullable: false },
    type:        { type: "varchar", nullable: false },
    quantity:    { type: "decimal", precision: 12, scale: 3, nullable: false },
    referenceId: { type: "varchar", nullable: true },
    note:        { type: "varchar", nullable: true },
    createdAt:   { type: "timestamp", createDate: true },
  },
});

module.exports = { InventoryTransaction };
