const { EntitySchema } = require("typeorm");

const Business = new EntitySchema({
  name: "Business",
  tableName: "business",
  columns: {
    id: { primary: true, type: "int", generated: true },
    userId: { type: "int" },
    name: { type: "varchar" },
    address: { type: "varchar", nullable: true },
    gstNumber: { type: "varchar", nullable: true },
    contactNumber: { type: "varchar", nullable: true },
  },
});

module.exports = { Business };
