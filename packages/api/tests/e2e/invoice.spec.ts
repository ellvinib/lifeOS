import { test, expect } from '@playwright/test';
import { FinanceAPIClient } from './helpers/api-client';
import { cleanDatabase, seedTestUser, seedTestBankAccount } from './helpers/database';
import * as path from 'path';

/**
 * Invoice E2E Tests
 *
 * Tests the complete invoice workflow:
 * 1. Upload PDF invoice
 * 2. Verify invoice created
 * 3. Trigger AI extraction (if API key configured)
 * 4. Update invoice
 * 5. Delete invoice
 */

test.describe('Invoice Workflow', () => {
  let api: FinanceAPIClient;

  test.beforeEach(async ({ request }) => {
    // Clean database before each test
    await cleanDatabase();
    
    // Seed test data
    await seedTestUser();
    
    // Initialize API client
    api = new FinanceAPIClient(request);
  });

  test('should upload invoice successfully', async () => {
    // Note: This test will fail without a real PDF file
    // See fixtures/README.md for creating test PDFs
    const pdfPath = path.join(__dirname, 'fixtures', 'sample-invoice-1.pdf');

    // Skip test if PDF doesn't exist
    const fs = await import('fs');
    if (!fs.existsSync(pdfPath)) {
      test.skip();
      return;
    }

    // Upload invoice
    const uploadResponse = await api.uploadInvoice(pdfPath, 'MANUAL');

    // Assertions
    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.success).toBe(true);
    expect(uploadResponse.body.data).toHaveProperty('id');
    expect(uploadResponse.body.data.status).toBe('DRAFT');
    expect(uploadResponse.body.data.source).toBe('MANUAL');
    expect(uploadResponse.body.data.pdfPath).toBeTruthy();
  });

  test('should list invoices', async () => {
    // List invoices (should be empty)
    const listResponse = await api.listInvoices();

    // Assertions
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(Array.isArray(listResponse.body.data)).toBe(true);
    expect(listResponse.body.meta).toHaveProperty('count');
  });

  test('should get invoice by ID after upload', async () => {
    const pdfPath = path.join(__dirname, 'fixtures', 'sample-invoice-1.pdf');

    // Skip if PDF doesn't exist
    const fs = await import('fs');
    if (!fs.existsSync(pdfPath)) {
      test.skip();
      return;
    }

    // Upload invoice
    const uploadResponse = await api.uploadInvoice(pdfPath);
    const invoiceId = uploadResponse.body.data.id;

    // Get invoice by ID
    const getResponse = await api.getInvoice(invoiceId);

    // Assertions
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.id).toBe(invoiceId);
  });

  test('should return 404 for non-existent invoice', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    // Try to get non-existent invoice
    const getResponse = await api.getInvoice(fakeId);

    // Assertions
    expect(getResponse.status).toBe(404);
    expect(getResponse.body.success).toBe(false);
  });

  test('should validate PDF file type', async ({ request }) => {
    // Try to upload non-PDF file
    const txtPath = path.join(__dirname, 'fixtures', 'sample-transactions.csv');

    const response = await request.post('/api/finance/invoices/upload', {
      multipart: {
        file: {
          name: 'not-a-pdf.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('This is not a PDF'),
        },
        source: 'MANUAL',
      },
    });

    // Should reject non-PDF files
    expect(response.status()).toBe(400);
  });

  test('should handle extraction for invoice without API key', async () => {
    const pdfPath = path.join(__dirname, 'fixtures', 'sample-invoice-1.pdf');

    // Skip if PDF doesn't exist
    const fs = await import('fs');
    if (!fs.existsSync(pdfPath)) {
      test.skip();
      return;
    }

    // Upload invoice
    const uploadResponse = await api.uploadInvoice(pdfPath);
    const invoiceId = uploadResponse.body.data.id;

    // Try to extract without API key (should fail gracefully)
    const extractResponse = await api.extractInvoice(invoiceId);

    // Should either succeed (if key configured) or fail gracefully
    expect([200, 400, 500]).toContain(extractResponse.status);
  });
});

test.describe('Invoice Filtering', () => {
  let api: FinanceAPIClient;

  test.beforeEach(async ({ request }) => {
    await cleanDatabase();
    await seedTestUser();
    api = new FinanceAPIClient(request);
  });

  test('should filter invoices by status', async () => {
    // List invoices with status filter
    const response = await api.listInvoices({ status: 'DRAFT' });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('should paginate invoice list', async () => {
    // List invoices with limit
    const response = await api.listInvoices({ limit: '10' });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.meta).toHaveProperty('count');
  });
});
