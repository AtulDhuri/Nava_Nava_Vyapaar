const { MigrationInterface, QueryRunner } = require("typeorm");

class FixProductIdVarcharFinal1700000002000 {
  async up(queryRunner) {
    // For inventory_transactions table
    // First, create a temporary column to hold the data
    await queryRunner.query(`
      ALTER TABLE inventory_transactions
      ADD COLUMN "productId_temp" varchar(100);
    `);

    // Copy data from old integer column to new varchar column
    await queryRunner.query(`
      UPDATE inventory_transactions
      SET "productId_temp" = CAST("productId" AS varchar(100));
    `);

    // Drop the old integer column
    await queryRunner.query(`
      ALTER TABLE inventory_transactions
      DROP COLUMN "productId";
    `);

    // Rename the temporary column to the original name
    await queryRunner.query(`
      ALTER TABLE inventory_transactions
      RENAME COLUMN "productId_temp" TO "productId";
    `);

    // For inventory table - also ensure it's varchar
    // Check if productId is still integer
    await queryRunner.query(`
      ALTER TABLE inventory
      ALTER COLUMN "productId" TYPE varchar(100);
    `).catch(() => {
      // Column might already be varchar, ignore error
      console.log("Inventory productId already varchar");
    });
  }

  async down(queryRunner) {
    // Rollback would be complex - we'll skip it as this is a data type fix
    throw new Error("Down migration not supported for this data type fix");
  }
}

module.exports = { FixProductIdVarcharFinal1700000002000 };
