const { MigrationInterface, QueryRunner } = require("typeorm");

class ChangeProductIdToVarchar1700000000000 {
  async up(queryRunner) {
    // PostgreSQL specific: Change productId column from int to varchar
    await queryRunner.query(`
      ALTER TABLE inventory
      DROP CONSTRAINT IF EXISTS "UQ_inventory_businessId_productId";
    `);

    await queryRunner.query(`
      ALTER TABLE inventory
      ALTER COLUMN "productId" TYPE varchar(100);
    `);

    await queryRunner.query(`
      ALTER TABLE inventory
      ADD CONSTRAINT "UQ_inventory_businessId_productId" 
      UNIQUE ("businessId", "productId");
    `);
  }

  async down(queryRunner) {
    // Rollback: Change productId column back to int
    await queryRunner.query(`
      ALTER TABLE inventory
      DROP CONSTRAINT IF EXISTS "UQ_inventory_businessId_productId";
    `);

    await queryRunner.query(`
      ALTER TABLE inventory
      ALTER COLUMN "productId" TYPE int USING ("productId"::integer);
    `);

    await queryRunner.query(`
      ALTER TABLE inventory
      ADD CONSTRAINT "UQ_inventory_businessId_productId" 
      UNIQUE ("businessId", "productId");
    `);
  }
}

module.exports = { ChangeProductIdToVarchar1700000000000 };
