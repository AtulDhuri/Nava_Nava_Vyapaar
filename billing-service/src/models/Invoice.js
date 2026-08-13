const { EntitySchema } = require("typeorm");

const Invoice = new EntitySchema({
  name: "Invoice",
  tableName: "invoices",
  columns: {
    id: { primary: true, type: "int", generated: true },
    billNo: { type: "varchar", unique: true },
    customerName: { type: "varchar" },
    customerMobile: { type: "varchar", nullable: true },
    customerAddress: { type: "varchar", nullable: true },
    totalPrice: { type: "decimal", precision: 12, scale: 2 },
    discount: { type: "decimal", precision: 12, scale: 2, default: 0 },
    received: { type: "decimal", precision: 12, scale: 2, default: 0 },
    balance: { type: "decimal", precision: 12, scale: 2, default: 0 },
    status: { type: "varchar", default: "Unpaid" },
    date: { type: "timestamp", createDate: true },
  },
  relations: {
    items: {
      type: "one-to-many",
      target: "InvoiceItem",
      inverseSide: "invoice",
      cascade: true,
    },
  },
});

module.exports = { Invoice };
