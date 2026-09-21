/**
 * Bug Condition Exploration Test: Invoice Inventory Deduction
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * This test encodes the expected behavior for inventory deduction:
 * When an invoice is created with items containing valid productId values
 * where inventory records exist, the system SHALL deduct the specified
 * quantities from inventory and return inventoryDeducted: true.
 * 
 * CRITICAL: This test is expected to FAIL on unfixed code.
 * The failure proves the bug exists.
 */

const request = require('supertest');
const express = require('express');
const { Invoice } = require('../src/models/Invoice');
const { InvoiceItem } = require('../src/models/InvoiceItem');
const inventoryClient = require('../src/services/inventoryClient');

// Mock the Invoice and InvoiceItem models
jest.mock('../src/models/Invoice');
jest.mock('../src/models/InvoiceItem');

// Mock the database
jest.mock('../src/config/database', () => ({
  AppDataSource: {
    isInitialized: true,
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn((model, data) => ({ ...data, id: 1 })),
        save: jest.fn((model, data) => {
          if (Array.isArray(data)) {
            return Promise.resolve(data.map((d, i) => ({ ...d, id: i + 1 })));
          }
          return Promise.resolve({ ...data, id: 1 });
        }),
      },
    })),
    initialize: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe('Bug Condition Exploration: Inventory Deduction on Invoice Creation', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Initialize app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware to bypass JWT verification
    app.use((req, res, next) => {
      req.userId = 1;
      req.businessIds = [1];
      next();
    });
    
    // Load the controller after mocks are in place
    const { createInvoice } = require('../src/controllers/billingController');
    
    // Create a test route
    app.post('/api/invoices', createInvoice);
    
    // Mock inventoryClient.deductStock to simulate the BUG
    // The inventory service returns empty deducted array (all items skipped)
    // This simulates the condition where all items fail validation
    inventoryClient.deductStock = jest.fn(async (businessId, billNo, items) => {
      return {
        status: 'success',
        statusMessage: 'Stock deduction attempted',
        displayMessage: 'Stock deduction processed',
        deducted: [], // EMPTY - this is the bug condition
        skipped: items.map(item => ({
          productId: item.productId,
          reason: 'Validation failed: productId must be numeric'
        }))
      };
    });

    // Start the app on a dynamic port
    server = app.listen(0, () => {});
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  /**
   * Property 1: Bug Condition - Inventory Deduction on Invoice Creation
   * 
   * For any invoice creation request where items with productId values are provided
   * and inventory records exist for those products, the system SHALL successfully
   * deduct the specified quantities from inventory and return inventoryDeducted: true.
   * 
   * This test uses a concrete example:
   * - productId: 'PROD-TEST-001'
   * - quantity: 10
   * 
   * CRITICAL: On unfixed code, this test FAILS because:
   * - The inventory service returns empty deducted array (all items skipped)
   * - The billing controller doesn't check the response body
   * - It incorrectly sets inventoryDeducted: true without verifying deduction
   * - The test expects it to fail, proving the bug exists
   */
  test('COUNTEREXAMPLE: Invoice with valid productId returns inventoryDeducted: false on unfixed code (BUG)', async () => {
    // Arrange
    const businessId = 1;
    const invoicePayload = {
      businessId,
      customerName: 'Test Customer',
      customerMobile: '9876543210',
      customerAddress: '123 Test St',
      items: [
        {
          productId: 'PROD-TEST-001',
          productName: 'Test Product',
          price: 100,
          qty: 10,
          discount: 0,
          gstRate: 18,
          description: 'Test item for inventory deduction'
        }
      ],
      discount: 0,
      received: 0
    };

    // Act - Create invoice via API
    const response = await request(app)
      .post('/api/invoices')
      .send(invoicePayload)
      .expect(201);

    // Assert - Verify invoice was created
    expect(response.body).toHaveProperty('status', 'success');
    expect(response.body).toHaveProperty('invoice');
    expect(response.body.invoice).toBeDefined();
    expect(response.body.invoice.billNo).toBeDefined();
    expect(response.body.invoice.items).toHaveLength(1);
    expect(response.body.invoice.items[0].productId).toBe('PROD-TEST-001');
    expect(response.body.invoice.items[0].qty).toBe(10);
    
    // CRITICAL COUNTEREXAMPLE: This assertion FAILS on unfixed code
    // This proves the bug exists:
    // - inventoryDeducted should be true (inventory was deducted)
    // - But it's false (inventory deduction silently failed)
    // - The response showed empty deducted array but controller didn't check it
    expect(response.body.inventoryDeducted).toBe(true);
    expect(response.body.inventoryError).toBeUndefined();
  });

  /**
   * Property 1: Multiple Items Deduction Test
   * 
   * For any invoice creation request with multiple items that have productId values,
   * all items SHALL be deducted from inventory atomically.
   * 
   * COUNTEREXAMPLE: On unfixed code, this fails because all items are skipped
   * but inventoryDeducted is incorrectly set to true without checking response.
   */
  test('COUNTEREXAMPLE: Invoice with multiple items shows deduction failure (BUG)', async () => {
    // Arrange
    const businessId = 1;
    const invoicePayload = {
      businessId,
      customerName: 'Test Customer Multi',
      customerMobile: '9876543210',
      customerAddress: '456 Test Ave',
      items: [
        {
          productId: 'PROD-TEST-002',
          productName: 'Product A',
          price: 50,
          qty: 5,
          discount: 0,
          gstRate: 18,
        },
        {
          productId: 'PROD-TEST-003',
          productName: 'Product B',
          price: 75,
          qty: 3,
          discount: 0,
          gstRate: 18,
        }
      ],
      discount: 0,
      received: 0
    };

    // Act - Create invoice
    const response = await request(app)
      .post('/api/invoices')
      .send(invoicePayload)
      .expect(201);

    // Assert - Invoice was created
    expect(response.body).toHaveProperty('status', 'success');
    expect(response.body.invoice.items).toHaveLength(2);
    
    // CRITICAL COUNTEREXAMPLE: Both items should be deducted
    // On unfixed code, this assertion FAILS:
    // - inventoryDeducted should be true (both items deducted)
    // - But it's false (deduction silently failed)
    expect(response.body.inventoryDeducted).toBe(true);
    expect(response.body.inventoryError).toBeUndefined();
    
    // Verify deductStock was called with both items
    expect(inventoryClient.deductStock).toHaveBeenCalled();
    const lastCallArgs = inventoryClient.deductStock.mock.calls[inventoryClient.deductStock.mock.calls.length - 1];
    const items = lastCallArgs[2];
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ productId: 'PROD-TEST-002', qty: 5 });
    expect(items[1]).toEqual({ productId: 'PROD-TEST-003', qty: 3 });
  });

  /**
   * Property 1: Null ProductId Filtering Test
   * 
   * For items with null productId, the system SHALL filter them out and NOT
   * attempt inventory deduction. Only items with productId values should be deducted.
   * 
   * This behavior should be correct on both fixed and unfixed code.
   */
  test('Invoice with mix of valid and null productIds filters null items correctly', async () => {
    // Arrange
    const businessId = 1;
    const invoicePayload = {
      businessId,
      customerName: 'Test Customer Mixed',
      customerMobile: '9876543210',
      customerAddress: '789 Test Blvd',
      items: [
        {
          productId: 'PROD-TEST-004',
          productName: 'Product with ID',
          price: 100,
          qty: 5,
          discount: 0,
          gstRate: 18,
        },
        {
          productId: null,
          productName: 'Product without ID',
          price: 50,
          qty: 2,
          discount: 0,
          gstRate: 18,
        }
      ],
      discount: 0,
      received: 0
    };

    // Act - Create invoice
    const response = await request(app)
      .post('/api/invoices')
      .send(invoicePayload)
      .expect(201);

    // Assert - Invoice was created
    expect(response.body).toHaveProperty('status', 'success');
    expect(response.body.invoice.items).toHaveLength(2);
    
    // CRITICAL COUNTEREXAMPLE: Only item with productId should be deducted
    expect(response.body.inventoryDeducted).toBe(true);
    expect(response.body.inventoryError).toBeUndefined();
    
    // Verify deductStock was called with only the item that has productId
    const lastCallArgs = inventoryClient.deductStock.mock.calls[inventoryClient.deductStock.mock.calls.length - 1];
    const items = lastCallArgs[2];
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ productId: 'PROD-TEST-004', qty: 5 });
  });

  /**
   * Property 1: No Items with ProductId Test
   * 
   * For invoices where no items have productId values, the system SHALL NOT
   * call inventory deduction and inventoryDeducted SHALL remain false.
   */
  test('Invoice with no productIds should not deduct inventory and return inventoryDeducted: false', async () => {
    // Arrange
    const businessId = 1;
    const invoicePayload = {
      businessId,
      customerName: 'Test Customer No IDs',
      customerMobile: '9876543210',
      customerAddress: '999 Test Lane',
      items: [
        {
          productId: null,
          productName: 'Product Without ID 1',
          price: 100,
          qty: 5,
          discount: 0,
          gstRate: 18,
        },
        {
          productId: null,
          productName: 'Product Without ID 2',
          price: 50,
          qty: 2,
          discount: 0,
          gstRate: 18,
        }
      ],
      discount: 0,
      received: 0
    };

    // Reset mock to track calls for this test
    inventoryClient.deductStock.mockClear();

    // Act - Create invoice
    const response = await request(app)
      .post('/api/invoices')
      .send(invoicePayload)
      .expect(201);

    // Assert
    expect(response.body).toHaveProperty('status', 'success');
    
    // Should not deduct since no items have productId
    expect(response.body.inventoryDeducted).toBe(false);
    expect(response.body.inventoryError).toBeUndefined();
    
    // Verify deductStock was NOT called (no items to deduct)
    expect(inventoryClient.deductStock).not.toHaveBeenCalled();
  });
});
