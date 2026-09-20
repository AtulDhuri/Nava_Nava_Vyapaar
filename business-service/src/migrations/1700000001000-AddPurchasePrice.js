const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddPurchasePrice1700000001000 {
    name = 'AddPurchasePrice1700000001000'

    async up(queryRunner) {
        // Add purchasePrice column to products table
        await queryRunner.query(`
            ALTER TABLE "products" 
            ADD COLUMN "purchasePrice" DECIMAL(10,2) NULL
        `);
        
        console.log('✅ Added purchasePrice column to products table');
    }

    async down(queryRunner) {
        // Remove purchasePrice column from products table
        await queryRunner.query(`
            ALTER TABLE "products" 
            DROP COLUMN "purchasePrice"
        `);
        
        console.log('✅ Removed purchasePrice column from products table');
    }
}