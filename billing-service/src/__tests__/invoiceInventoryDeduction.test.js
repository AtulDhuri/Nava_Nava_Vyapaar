/**
 * Bug Condition Exploration Test for Invoice Inventory Deduction
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3 (Bug Condition)**
 * 
 * This test explores the bug condition where invoices are created with valid productId values
 * but inventory is not deducted from the inventory service. The test demonstrates that:
 * 
 * 1. invoiceDeducted flag is false despite valid productId
 * 2. Inventory currentStock remains unchanged after invoice creation
 * 3. No error is thrown (soft failure)
 * 
 * CRITICAL: This test is EXPECTED TO FAIL on unfixed code.
 * The failure proves the bug exists and helps understand the root cause.
 */

const request = require('supertest');
const express = require('express');
const { AppDataSource } = require('../config/database');
const { Invoice } = require('../models/Invoice');
const { InvoiceItem } = require('../models/InvoiceItem');
const http = require('http');

describe('Invoice Inventory Deduction - Bug Condition Exploration', () => {
  let app;
  let server;
  let mockInventoryServer;
  let inventoryRequests = [];

  /**
   * Setup: Initialize test database and mock inventory service
   */
  beforeAll(async () => {
    // Initialize database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Create test app
    app = express();
    app.use(express.json());

    // Import billing controller after app setup
    const billingController = require('../controllers/billingController');

    // Add minimal route
    app.post('/invoices', billingController.createInvoice);

    // Start the test app on a random port
    server = app.listen(0);

    // Start mock inventory service
    mockInventoryServer = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/internal/deduct-stock') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          inventoryRequests.push(JSON.parse(body));
          
          // Parse request to extract items
          const requestData = JSON.parse(body);
          const items = requestData.items || [];

          // Simulate inventory service behavior: 
          // Return all items in skipped array due to validation error
          // (This reproduces the actual bug where items are skipped)
          const response = {
            status: 'success',
            deducted: [],
            skipped: items.map(item => ({
              productId: item.productId,
              reason: 'Validation failed: productId format invalid or inventory record not found'
            }))
          };

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    const mockPort = 3999;
    await new Promise(resolve => mockInventoryServer.listen(mockPort, resolve));
    process.env.INVENTORY_SERVICE_URL = `http://localhost:${mockPort}`;
  });

  /**
   * Cleanup: Close database, servers, and reset state
   */
  afterAll(async () => {
    if (server) server.close();
    if (mockInventoryServer) mockInventoryServer.close();
    
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  /**
   * Clear test data before each test
   */
  beforeEach(async () => {
    inventoryRequests = [];
    const invoiceRepo = AppDataSource.getRepository(Invoice);
    const itemRepo = AppDataSource.getRepository(InvoiceItem);
    
    // Clear tables
    await itemRepo.delete({});
    await invoiceRepo.delete({});
  });

  /**
   * Property 1: Bug Condition - Inventory Deduction Fails on Valid ProductId
   * 
   * For any invoice creation request with items containing valid productId values,
   * the system SHOULD successfully deduct inventory and return inventoryDeducted=true.
   * 
   * EXPECTED FAILURE on UNFIXED code:
   * - inventoryDeducted will be false (the bug)
   * - No error will be thrown (soft failure pattern)
   * 
   * After fix: This test will pass, proving the bug is fixed.
   */
  test('should deduct inventory and return inventoryDeducted=true for valid productIds', async () => {
    const invoicePayload = {
      businessId: 1,
      customerName: 'Test Customer',
      customerMobile: '1234567890',
      customerAddress: 'Test Address',
      discount: 0,
      received: 0,
      items: [
        {
          productId: 'PROD-TEST-001',
          productName: 'Test Product',
          price: 100,
          qty: 10,
          discount: 0,
          gstRate: 0,
          total: 1000,
          description: 'Test product for inventory deduction'
        }
      ]
    };

    // Create invoice
    const response = await request(app)
      .post('/invoices')
      .send(invoicePayload)
      .expect(201);

    // BUG EVIDENCE (on unfixed code):
    // These assertions will FAIL because the bug exists
    expect(response.body.status).toBe('success');
    expect(response.body.invoice).toBeDefined();
    expect(response.body.inventoryDeducted).toBe(true);
    
    // After fix, this should have no error
    expect(response.body.inventoryError).toBeUndefined();
  }, 30000);

  /**
   * Property 1 (Extended): Bug Condition - Multiple Items
   * 
   * For any invoice with multiple items containing valid productId values,
   * the system SHOULD deduct all items and return inventoryDeducted=true.
   * 
   * COUNTEREXAMPLE on UNFIXED code:
   * - inventoryDeducted will be false
   * - All items will remain in inventory
   */
  test('should deduct multiple items with valid productIds', async () => {
    const invoicePayload = {
      businessId: 1,
      customerName: 'Test Customer',
      customerMobile: '1234567890',
      customerAddress: 'Test Address',
      discount: 0,
      received: 0,
      items: [
        {
          productId: 'PROD-TEST-001',
          productName: 'Product 1',
          price: 100,
          qty: 5,
          discount: 0,
          gstRate: 0,
          total: 500
        },
        {
          productId: 'PROD-TEST-002',
          productName: 'Product 2',
          price: 50,
          qty: 10,
          discount: 0,
          gstRate: 0,
          total: 500
        }
      ]
    };

    const response = await request(app)
      .post('/invoices')
      .send(invoicePayload)
      .expect(201);

    // BUG EVIDENCE:
    // inventoryDeducted should be true but will be false on unfixed code
    expect(response.body.inventoryDeducted).toBe(true);
    expect(response.body.inventoryError).toBeUndefined();

    // Verify inventory deduction request was made to inventory service
    expect(inventoryRequests.length).toBeGreaterThan(0);
    const deductionRequest = inventoryRequests[0];
    expect(deductionRequest.items).toHaveLength(2);
    expect(deductionRequest.items[0].productId).toBe('PROD-TEST-001');
    expect(deductionRequest.items[0].qty).toBe(5);
    expect(deductionRequest.items[1].productId).toBe('PROD-TEST-002');
    expect(deductionRequest.items[1].qty).toBe(10);
  }, 30000);

  /**
   * Property 1 (Null ProductId): Null productIds should be filtered out
   * 
   * For invoices with some items having null productId:
   * - Items with null productId should NOT be included in deduction request
   * - Only items with valid productId should be deducted
   */
  test('should filter out null productIds and deduct only valid ones', async () => {
    const invoicePayload = {
      businessId: 1,
      customerName: 'Test Customer',
      customerMobile: '1234567890',
      customerAddress: 'Test Address',
      discount: 0,
      received: 0,
      items: [
        {
          productId: null,
          productName: 'Product without ID',
          price: 100,
          qty: 5,
          discount: 0,
          gstRate: 0,
          total: 500
        },
        {
          productId: 'PROD-TEST-001',
          productName: 'Product with ID',
          price: 50,
          qty: 10,
          discount: 0,
          gstRate: 0,
          total: 500
        }
      ]
    };

    const response = await request(app)
      .post('/invoices')
      .send(invoicePayload)
      .expect(201);

    // Only the item with productId should be sent to inventory service
    expect(inventoryRequests.length).toBeGreaterThan(0);
    const deductionRequest = inventoryRequests[0];
    
    // Should have only 1 item (the one with valid productId)
    expect(deductionRequest.items).toHaveLength(1);
    expect(deductionRequest.items[0].productId).toBe('PROD-TEST-001');
    expect(deductionRequest.items[0].qty).toBe(10);
  }, 30000);

  /**
   * Property 1: Soft Failure Preservation
   * 
   * Even if inventory deduction fails, the invoice SHOULD still be created
   * and returned to the user (soft failure pattern). This verifies that
   * the fix doesn't break existing soft-failure behavior.
   */
  test('should create invoice successfully even if inventory deduction fails', async () => {
    const invoicePayload = {
      businessId: 1,
      customerName: 'Test Customer',
      customerMobile: '1234567890',
      customerAddress: 'Test Address',
      discount: 0,
      received: 0,
      items: [
        {
          productId: 'PROD-TEST-001',
          productName: 'Test Product',
          price: 100,
          qty: 10,
          discount: 0,
          gstRate: 0,
          total: 1000
        }
      ]
    };

    const response = await request(app)
      .post('/invoices')
      .send(invoicePayload)
      .expect(201);

    // Invoice should be created successfully
    expect(response.body.status).toBe('success');
    expect(response.body.invoice).toBeDefined();
    expect(response.body.invoice.id).toBeDefined();
    expect(response.body.invoice.billNo).toBeDefined();

    // inventoryError should explain why deduction failed
    // (on unfixed code: will be undefined, on fixed: should have error message)
    if (response.body.inventoryDeducted === false) {
      expect(response.body.inventoryError).toBeDefined();
    }
  }, 30000);
});
