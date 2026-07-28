const { EntitySchema } = require("typeorm");

const User = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: { primary: true, type: "int", generated: true },
    firstName: { type: "varchar" },
    lastName: { type: "varchar" },
    mobileNo: { type: "varchar", unique: true },
    password: { type: "varchar" },
    createdAt: { type: "timestamp", createDate: true },
    updatedAt: { type: "timestamp", updateDate: true },
  },
});

module.exports = { User };
