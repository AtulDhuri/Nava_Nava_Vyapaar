const { EntitySchema } = require("typeorm");

const Product = new EntitySchema({
  name: "Product",
  tableName: "products",
  columns: {
    id: { primary: true, type: "int", generated: true },
    businessId: { type: "int" },
    productCode: { type: "varchar", unique: true },
    name: { type: "varchar" },
    category: { type: "varchar", nullable: true },
    price: { type: "decimal", precision: 10, scale: 2 },
    uom: { type: "varchar" },
    gstRate: { type: "decimal", precision: 5, scale: 2 },
  },
});

module.exports = { Product };
