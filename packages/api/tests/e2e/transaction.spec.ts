import { test, expect } from '@playwright/test';
import { FinanceAPIClient } from './helpers/api-client';
import { cleanDatabase, seedTestUser, seedTestBankAccount } from './helpers/database';
import * as path from 'path';

/**
 * Transaction E2E Tests
 *
 * Tests the complete transaction workflow:
 * 1. Import transactions from CSV
 * 2. Verify transactions created
 * 3. Check duplicate detection
 * 4. Update transaction category
 * 5. Mark as ignored/unignored
 */

test.describe('Transaction Import', () => {
  let api: FinanceAPIClient;
  let bankAccountId: string;

  test.beforeEach(async ({ request }) => {
    // Clean database
    await cleanDatabase();
    
    // Seed test data
    const user = await seedTestUser();
    const bankAccount = await seedTestBankAccount(user.id);
    bankAccountId = bankAccount.id;
    
    // Initialize API client
    api = new FinanceAPIClient(request);
  });

  test('should import transactions from Belgian bank CSV', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'sample-transactions.csv');

    // Import transactions
    const importResponse = await api.importTransactions(csvPath, bankAccountId);

    // Assertions
    expect(importResponse.status).toBe(201);
    expect(importResponse.body.success).toBe(true);
    expect(importResponse.body.data).toHaveProperty('imported');
    expect(importResponse.body.data).toHaveProperty('skipped');
    expect(importResponse.body.data).toHaveProperty('total');
    
    // Should import 10 transactions from sample CSV
    expect(importResponse.body.data.total).toBe(10);
    expect(importResponse.body.data.imported).toBe(10);
    expect(importResponse.body.data.skipped).toBe(0);
  });

  test('should detect duplicate transactions on re-import', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'sample-transactions.csv');

    // First import
    const firstImport = await api.importTransactions(csvPath, bankAccountId);
    expect(firstImport.body.data.imported).toBe(10);

    // Second import (same file)
    const secondImport = await api.importTransactions(csvPath, bankAccountId);

    // Assertions - should skip duplicates
    expect(secondImport.status).toBe(201);
    expect(secondImport.body.data.total).toBe(10);
    expect(secondImport.body.data.imported).toBe(0);
    expect(secondImport.body.data.skipped).toBe(10);
  });

  test('should list imported transactions', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'sample-transactions.csv');

    // Import transactions
    await api.importTransactions(csvPath, bankAccountId);

    // List transactions
    const listResponse = await api.listTransactions({ bankAccountId });

    // Assertions
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(Array.isArray(listResponse.body.data)).toBe(true);
    expect(listResponse.body.data.length).toBe(10);
    expect(listResponse.body.meta.count).toBe(10);
  });

  test('should filter transactions by reconciliation status', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'sample-transactions.csv');

    // Import transactions
    await api.importTransactions(csvPath, bankAccountId);

    // List unreconciled transactions
    const listResponse = await api.listTransactions({
      bankAccountId,
      reconciliationStatus: 'PENDING',
    });

    // Assertions - all imported transactions should be PENDING
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.length).toBe(10);
    listResponse.body.data.forEach((transaction: any) => {
      expect(transaction.reconciliationStatus).toBe('PENDING');
    });
  });

  test('should auto-categorize transactions', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'sample-transactions.csv');

    // Import transactions
    await api.importTransactions(csvPath, bankAccountId);

    // List transactions
    const listResponse = await api.listTransactions({ bankAccountId });

    // Assertions - some transactions should have auto-detected categories
    expect(listResponse.body.data.some((t: any) => t.category !== null)).toBe(true);
  });
});

test.describe('Transaction Operations', () => {
  let api: FinanceAPIClient;
  let bankAccountId: string;
  let transactionId: string;

  test.beforeEach(async ({ request }) => {
    // Clean and seed
    await cleanDatabase();
    const user = await seedTestUser();
    const bankAccount = await seedTestBankAccount(user.id);
    bankAccountId = bankAccount.id;
    
    api = new FinanceAPIClient(request);

    // Import transactions
    const csvPath = path.join(__dirname, 'fixtures', 'sample-transactions.csv');
    await api.importTransactions(csvPath, bankAccountId);

    // Get first transaction ID
    const listResponse = await api.listTransactions({ bankAccountId });
    transactionId = listResponse.body.data[0].id;
  });

  test('should get transaction by ID', async () => {
    const getResponse = await api.getTransaction(transactionId);

    // Assertions
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.id).toBe(transactionId);
  });

  test('should return 404 for non-existent transaction', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const getResponse = await api.getTransaction(fakeId);

    // Assertions
    expect(getResponse.status).toBe(404);
    expect(getResponse.body.success).toBe(false);
  });

  test('should get unreconciled transactions', async ({ request }) => {
    const user = await import('./helpers/database').then((m) => m.getTestDatabase());
    const testUser = await user.user.findFirst();

    const response = await request.get(
      `/api/finance/transactions/unreconciled?userId=${testUser?.id}`
    );

    const body = await response.json();

    // Assertions
    expect(response.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(10); // All imported transactions are unreconciled
  });
});

test.describe('Transaction CSV Preview', () => {
  let api: FinanceAPIClient;

  test.beforeEach(async ({ request }) => {
    await cleanDatabase();
    await seedTestUser();
    api = new FinanceAPIClient(request);
  });

  test('should preview CSV import without saving', async ({ request }) => {
    const csvPath = path.join(__dirname, 'fixtures', 'sample-transactions.csv');
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(csvPath);

    // Preview import
    const response = await request.post('/api/finance/transactions/import/preview', {
      multipart: {
        file: {
          name: 'transactions.csv',
          mimeType: 'text/csv',
          buffer: fileBuffer,
        },
      },
    });

    const body = await response.json();

    // Assertions
    expect(response.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('preview');
    expect(body.data).toHaveProperty('total');
    expect(body.data.total).toBe(10);
    expect(Array.isArray(body.data.preview)).toBe(true);
  });
});
