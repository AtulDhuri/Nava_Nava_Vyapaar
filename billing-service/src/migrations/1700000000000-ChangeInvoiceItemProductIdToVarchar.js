const { MigrationInterface, QueryRunner } = require("typeorm");

class ChangeInvoiceItemProductIdToVarchar1700000000000 {
  async up(queryRunner) {
    // PostgreSQL specific: Change productId column from int to varchar in invoice_items table
    // First, create a temporary column to hold the data
    await queryRunner.query(`
      ALTER TABLE invoice_items
      ADD COLUMN "productId_temp" varchar(100);
    `).catch(() => {
      // Column might not exist, continue
      console.log("invoice_items table might not exist yet");
    });

    try {
      // Copy data from old integer column to new varchar column (if old column exists)
      await queryRunner.query(`
        UPDATE invoice_items
        SET "productId_temp" = CAST("productId" AS varchar(100))
        WHERE "productId" IS NOT NULL;
      `);

      // Drop the old integer column
      await queryRunner.query(`
        ALTER TABLE invoice_items
        DROP COLUMN "productId";
      `);

      // Rename the temporary column to the original name
      await queryRunner.query(`
        ALTER TABLE invoice_items
        RENAME COLUMN "productId_temp" TO "productId";
      `);
    } catch (err) {
      // Table might be newly created, just ensure column is varchar
      console.log("Migration note:", err.message);
      try {
        await queryRunner.query(`
          ALTER TABLE invoice_items
          ALTER COLUMN "productId" TYPE varchar(100);
        `);
      } catch (innerErr) {
        console.log("Column already varchar or table structure differs");
      }
    }
  }

  async down(queryRunner) {
    // Rollback would be complex - we'll skip it as this is a data type fix
    throw new Error("Down migration not supported for this data type fix");
  }
}

module.exports = { ChangeInvoiceItemProductIdToVarchar1700000000000 };
