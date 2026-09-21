const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddProductDescription1700000000000 {
    name = 'AddProductDescription1700000000000'

    async up(queryRunner) {
        // Add description column to products table
        await queryRunner.query(`
            ALTER TABLE "products" 
            ADD COLUMN "description" TEXT DEFAULT NULL
        `);
        
        console.log('✅ Added description column to products table');
    }

    async down(queryRunner) {
        // Rollback: Remove description column from products table
        await queryRunner.query(`
            ALTER TABLE "products" 
            DROP COLUMN "description"
        `);
        
        console.log('✅ Removed description column from products table (rollback)');
    }
}