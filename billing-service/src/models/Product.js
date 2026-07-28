const { EntitySchema } = require("typeorm");

// Reference entity - mirrors products table owned by business-service
const Product = new EntitySchema({
  name: "Product",
  tableName: "products",
  synchronize: false,
  columns: {
    id: { primary: true, type: "int", generated: true },
    productCode: { type: "varchar", unique: true },
    name: { type: "varchar" },
    category: { type: "varchar", nullable: true },
    price: { type: "decimal", precision: 10, scale: 2 },
    uom: { type: "varchar" },
    gstRate: { type: "decimal", precision: 5, scale: 2 },
  },
});

module.exports = { Product };
