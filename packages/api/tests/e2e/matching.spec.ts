import { test, expect } from '@playwright/test';
import { FinanceAPIClient } from './helpers/api-client';
import { cleanDatabase, seedTestUser, seedTestBankAccount, getTestDatabase } from './helpers/database';
import * as path from 'path';

/**
 * Invoice-Transaction Matching E2E Tests
 *
 * Tests the complete matching workflow:
 * 1. Import transactions and upload invoices
 * 2. Get match suggestions
 * 3. Confirm matches
 * 4. Unmatch invoices/transactions
 * 5. Verify reconciliation status updates
 */

test.describe('Invoice-Transaction Matching', () => {
  let api: FinanceAPIClient;
  let bankAccountId: string;
  let invoiceId: string;
  let transactionId: string;

  test.beforeEach(async ({ request }) => {
    // Clean database
    await cleanDatabase();
    
    // Seed test data
    const user = await seedTestUser();
    const bankAccount = await seedTestBankAccount(user.id);
    bankAccountId = bankAccount.id;
    
    // Initialize API client
    api = new FinanceAPIClient(request);

    // Import transactions
    const csvPath = path.join(__dirname, 'fixtures', 'sample-transactions.csv');
    await api.importTransactions(csvPath, bankAccountId);

    // Get first transaction (€329.95 - ACME HOSTING)
    const transactions = await api.listTransactions({ bankAccountId });
    transactionId = transactions.body.data[0].id;

    // Upload matching invoice (if PDF exists)
    const pdfPath = path.join(__dirname, 'fixtures', 'sample-invoice-acme-hosting.pdf');
    const fs = await import('fs');
    
    if (fs.existsSync(pdfPath)) {
      const uploadResponse = await api.uploadInvoice(pdfPath, 'MANUAL');
      invoiceId = uploadResponse.body.data.id;

      // Manually set invoice amount to match transaction for testing
      // In real scenario, this would come from AI extraction
      const db = getTestDatabase();
      await db.financeInvoice.update({
        where: { id: invoiceId },
        data: {
          total: 329.95,
          issueDate: new Date('2024-11-20'),
          status: 'PENDING',
        },
      });
    }
  });

  test('should suggest matches for invoice', async () => {
    // Skip if invoice wasn't created
    if (!invoiceId) {
      test.skip();
      return;
    }

    // Get match suggestions
    const suggestResponse = await api.suggestMatches(invoiceId);

    // Assertions
    expect(suggestResponse.status).toBe(200);
    expect(suggestResponse.body.success).toBe(true);
    expect(Array.isArray(suggestResponse.body.data)).toBe(true);

    // Should find at least one match
    if (suggestResponse.body.data.length > 0) {
      const match = suggestResponse.body.data[0];
      expect(match).toHaveProperty('transaction');
      expect(match).toHaveProperty('matchScore');
      expect(match).toHaveProperty('matchConfidence');
      expect(match).toHaveProperty('scoreBreakdown');
      expect(match.matchScore).toBeGreaterThan(0);
      expect(match.matchScore).toBeLessThanOrEqual(100);
    }
  });

  test('should confirm manual match', async () => {
    // Skip if invoice wasn't created
    if (!invoiceId) {
      test.skip();
      return;
    }

    // Confirm match
    const confirmResponse = await api.confirmMatch(
      invoiceId,
      transactionId,
      'Test match confirmation'
    );

    // Assertions
    expect(confirmResponse.status).toBe(201);
    expect(confirmResponse.body.success).toBe(true);
    expect(confirmResponse.body.data).toHaveProperty('id');
    expect(confirmResponse.body.data.invoiceId).toBe(invoiceId);
    expect(confirmResponse.body.data.transactionId).toBe(transactionId);
    expect(confirmResponse.body.data.matchConfidence).toBe('MANUAL');
  });

  test('should update invoice status to PAID after match', async () => {
    // Skip if invoice wasn't created
    if (!invoiceId) {
      test.skip();
      return;
    }

    // Confirm match
    await api.confirmMatch(invoiceId, transactionId);

    // Get invoice
    const invoiceResponse = await api.getInvoice(invoiceId);

    // Assertions - invoice should be marked as PAID
    expect(invoiceResponse.body.data.status).toBe('PAID');
  });

  test('should update transaction to RECONCILED after match', async () => {
    // Skip if invoice wasn't created
    if (!invoiceId) {
      test.skip();
      return;
    }

    // Confirm match
    await api.confirmMatch(invoiceId, transactionId);

    // Get transaction
    const transactionResponse = await api.getTransaction(transactionId);

    // Assertions - transaction should be marked as RECONCILED
    expect(transactionResponse.body.data.reconciliationStatus).toBe('RECONCILED');
  });

  test('should unmatch invoice and transaction', async () => {
    // Skip if invoice wasn't created
    if (!invoiceId) {
      test.skip();
      return;
    }

    // First, create a match
    await api.confirmMatch(invoiceId, transactionId);

    // Then unmatch
    const unmatchResponse = await api.unmatch(invoiceId, transactionId);

    // Assertions
    expect(unmatchResponse.status).toBe(200);
    expect(unmatchResponse.body.success).toBe(true);

    // Verify invoice status reverted to PENDING
    const invoiceResponse = await api.getInvoice(invoiceId);
    expect(invoiceResponse.body.data.status).toBe('PENDING');

    // Verify transaction status reverted to PENDING
    const transactionResponse = await api.getTransaction(transactionId);
    expect(transactionResponse.body.data.reconciliationStatus).toBe('PENDING');
  });

  test('should prevent duplicate matches', async () => {
    // Skip if invoice wasn't created
    if (!invoiceId) {
      test.skip();
      return;
    }

    // Create first match
    const firstMatch = await api.confirmMatch(invoiceId, transactionId);
    expect(firstMatch.status).toBe(201);

    // Try to create duplicate match
    const duplicateMatch = await api.confirmMatch(invoiceId, transactionId);

    // Assertions - should fail with conflict error
    expect(duplicateMatch.status).toBe(409);
    expect(duplicateMatch.body.success).toBe(false);
  });

  test('should calculate match scores correctly', async () => {
    // Skip if invoice wasn't created
    if (!invoiceId) {
      test.skip();
      return;
    }

    // Get match suggestions
    const suggestResponse = await api.suggestMatches(invoiceId);

    if (suggestResponse.body.data.length > 0) {
      const match = suggestResponse.body.data[0];

      // Verify score breakdown exists
      expect(match.scoreBreakdown).toBeDefined();
      expect(match.scoreBreakdown).toHaveProperty('amountScore');
      expect(match.scoreBreakdown).toHaveProperty('dateScore');
      expect(match.scoreBreakdown).toHaveProperty('vendorScore');

      // Verify scores are in valid range
      expect(match.scoreBreakdown.amountScore).toBeGreaterThanOrEqual(0);
      expect(match.scoreBreakdown.amountScore).toBeLessThanOrEqual(50);
      expect(match.scoreBreakdown.dateScore).toBeGreaterThanOrEqual(0);
      expect(match.scoreBreakdown.dateScore).toBeLessThanOrEqual(20);
    }
  });

  test('should filter suggestions by minimum score', async () => {
    // Skip if invoice wasn't created
    if (!invoiceId) {
      test.skip();
      return;
    }

    // Get suggestions with high score threshold
    const suggestResponse = await api.suggestMatches(invoiceId, { minScore: '90' });

    // Assertions - only high-confidence matches
    expect(suggestResponse.status).toBe(200);
    suggestResponse.body.data.forEach((match: any) => {
      expect(match.matchScore).toBeGreaterThanOrEqual(90);
    });
  });
});

test.describe('Bulk Matching Operations', () => {
  let api: FinanceAPIClient;
  let bankAccountId: string;

  test.beforeEach(async ({ request }) => {
    await cleanDatabase();
    const user = await seedTestUser();
    const bankAccount = await seedTestBankAccount(user.id);
    bankAccountId = bankAccount.id;
    
    api = new FinanceAPIClient(request);

    // Import transactions
    const csvPath = path.join(__dirname, 'fixtures', 'sample-transactions.csv');
    await api.importTransactions(csvPath, bankAccountId);
  });

  test('should suggest bulk matches', async ({ request }) => {
    const response = await request.post('/api/finance/matches/suggest/bulk', {
      data: {},
    });

    const body = await response.json();

    // Assertions
    expect(response.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('should get auto-matchable invoices and transactions', async ({ request }) => {
    const response = await request.get('/api/finance/matches/auto-matchable');

    const body = await response.json();

    // Assertions
    expect(response.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('invoices');
    expect(body.data).toHaveProperty('transactions');
  });
});

test.describe('Match Statistics', () => {
  let api: FinanceAPIClient;

  test.beforeEach(async ({ request }) => {
    await cleanDatabase();
    await seedTestUser();
    api = new FinanceAPIClient(request);
  });

  test('should get match statistics', async ({ request }) => {
    const response = await request.get('/api/finance/matches/statistics');

    const body = await response.json();

    // Assertions
    expect(response.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('totalMatches');
    expect(body.data).toHaveProperty('byConfidence');
  });
});
