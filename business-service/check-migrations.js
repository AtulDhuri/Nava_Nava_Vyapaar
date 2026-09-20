// Script to check migration status
require('dotenv').config();
require('reflect-metadata');
const { AppDataSource } = require('./src/config/database');

async function checkMigrations() {
    try {
        console.log('🔍 Initializing database connection...');
        await AppDataSource.initialize();
        
        console.log('📋 Checking migration status...');
        const executedMigrations = await AppDataSource.query(`
            SELECT * FROM migrations ORDER BY timestamp DESC
        `);
        
        console.log('\n✅ Executed Migrations:');
        if (executedMigrations.length === 0) {
            console.log('   No migrations found in database');
        } else {
            executedMigrations.forEach(migration => {
                console.log(`   - ${migration.name} (${migration.timestamp})`);
            });
        }
        
        console.log('\n📁 Available Migration Files:');
        const fs = require('fs');
        const path = require('path');
        const migrationFiles = fs.readdirSync('./src/migrations');
        migrationFiles.forEach(file => {
            console.log(`   - ${file}`);
        });
        
        // Check if purchasePrice column exists
        console.log('\n🔍 Checking if purchasePrice column exists...');
        try {
            const columns = await AppDataSource.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'products' 
                AND column_name = 'purchasePrice'
            `);
            
            if (columns.length > 0) {
                console.log('   ✅ purchasePrice column EXISTS in products table');
            } else {
                console.log('   ❌ purchasePrice column MISSING from products table');
                console.log('   💡 Run: npm run migration:run');
            }
        } catch (error) {
            console.log('   ❌ Error checking column:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await AppDataSource.destroy();
        process.exit(0);
    }
}

checkMigrations();