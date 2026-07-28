const { EntitySchema } = require("typeorm");

const InvoiceItem = new EntitySchema({
  name: "InvoiceItem",
  tableName: "invoice_items",
  columns: {
    id: { primary: true, type: "int", generated: true },
    productId: { type: "int", nullable: true },
    productName: { type: "varchar" },
    price: { type: "decimal", precision: 10, scale: 2 },
    qty: { type: "int" },
    discount: { type: "decimal", precision: 10, scale: 2, default: 0 },
    gstRate: { type: "decimal", precision: 5, scale: 2 },
    total: { type: "decimal", precision: 12, scale: 2 },
  },
  relations: {
    invoice: {
      type: "many-to-one",
      target: "Invoice",
      inverseSide: "items",
      onDelete: "CASCADE",
      joinColumn: { name: "invoiceId" },
    },
  },
});

module.exports = { InvoiceItem };
