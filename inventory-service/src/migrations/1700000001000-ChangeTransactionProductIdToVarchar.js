const { MigrationInterface, QueryRunner } = require("typeorm");

class ChangeTransactionProductIdToVarchar1700000001000 {
  async up(queryRunner) {
    // PostgreSQL specific: Change productId column from int to varchar in inventory_transactions table
    await queryRunner.query(`
      ALTER TABLE inventory_transactions
      ALTER COLUMN "productId" TYPE varchar(100);
    `);
  }

  async down(queryRunner) {
    // Rollback: Change productId column back to int
    await queryRunner.query(`
      ALTER TABLE inventory_transactions
      ALTER COLUMN "productId" TYPE int USING ("productId"::integer);
    `);
  }
}

module.exports = { ChangeTransactionProductIdToVarchar1700000001000 };
