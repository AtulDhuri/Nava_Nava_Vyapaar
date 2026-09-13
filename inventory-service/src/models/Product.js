const { EntitySchema } = require("typeorm");

const Product = new EntitySchema({
  name: "Product",
  tableName: "products",
  synchronize: false,
  columns: {
    id:          { primary: true, type: "int" },
    businessId:  { type: "int" },
    productCode: { type: "varchar" },
    name:        { type: "varchar" },
    uom:         { type: "varchar", nullable: true },
  },
});

module.exports = { Product };
