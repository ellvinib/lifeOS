import { test, expect } from '../fixtures/auth';
import { authenticatedRequest } from '../fixtures/auth';

/**
 * Expense Creation E2E Tests
 *
 * Tests the expense creation flow including:
 * - POST /api/finance/expenses endpoint
 * - Data validation
 * - Budget calculations updates
 * - Envelope amount updates
 */

test.describe('Expense Creation', () => {
  test('should create expense with valid data', async ({ authenticatedContext }) => {
    // Create a new expense
    const expenseData = {
      description: 'Grocery shopping',
      amount: 45.50,
      category: 'groceries',
      date: new Date().toISOString(),
      paymentMethod: 'debit_card',
      merchantName: 'Delhaize',
      notes: 'Weekly groceries',
      tags: ['food', 'weekly'],
    };

    const response = await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: expenseData }
    );

    // Verify successful creation
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    // Verify response body
    const responseData = await response.json();
    expect(responseData).toHaveProperty('success');
    expect(responseData.success).toBe(true);
    expect(responseData).toHaveProperty('data');

    const data = responseData.data;
    expect(data).toHaveProperty('id');
    expect(data.description).toBe(expenseData.description);
    expect(data.amount).toBe(expenseData.amount);
    expect(data.category).toBe(expenseData.category);
    expect(data.paymentMethod).toBe(expenseData.paymentMethod);
    expect(data.merchantName).toBe(expenseData.merchantName);
    expect(data.notes).toBe(expenseData.notes);
    expect(data.tags).toEqual(expenseData.tags);
    expect(data.isRecurring).toBe(false);

    // Verify timestamps
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('updatedAt');
  });

  test('should create recurring expense', async ({ authenticatedContext }) => {
    const expenseData = {
      description: 'Monthly gym membership',
      amount: 30.00,
      category: 'healthcare',
      date: new Date().toISOString(),
      paymentMethod: 'bank_transfer',
      isRecurring: true,
      recurrenceIntervalDays: 30,
    };

    const response = await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: expenseData }
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    expect(data.isRecurring).toBe(true);
    expect(data.recurrenceIntervalDays).toBe(30);
  });

  test('should validate required fields', async ({ authenticatedContext }) => {
    // Missing required fields
    const invalidData = {
      description: 'Test expense',
      // Missing amount, category, date, paymentMethod
    };

    const response = await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: invalidData }
    );

    // Should return validation error
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toBeTruthy();
  });

  test('should validate amount is positive', async ({ authenticatedContext }) => {
    const invalidData = {
      description: 'Invalid expense',
      amount: -10.00,
      category: 'groceries',
      date: new Date().toISOString(),
      paymentMethod: 'cash',
    };

    const response = await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: invalidData }
    );

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });

  test('should validate category is valid', async ({ authenticatedContext }) => {
    const invalidData = {
      description: 'Test expense',
      amount: 10.00,
      category: 'invalid_category',
      date: new Date().toISOString(),
      paymentMethod: 'cash',
    };

    const response = await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: invalidData }
    );

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });

  test('should validate payment method is valid', async ({ authenticatedContext }) => {
    const invalidData = {
      description: 'Test expense',
      amount: 10.00,
      category: 'groceries',
      date: new Date().toISOString(),
      paymentMethod: 'invalid_payment',
    };

    const response = await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: invalidData }
    );

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });

  test('should validate recurring expense has interval', async ({ authenticatedContext }) => {
    const invalidData = {
      description: 'Recurring expense',
      amount: 10.00,
      category: 'groceries',
      date: new Date().toISOString(),
      paymentMethod: 'cash',
      isRecurring: true,
      // Missing recurrenceIntervalDays
    };

    const response = await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: invalidData }
    );

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });

  test('should update budget calculations after expense creation', async ({ authenticatedContext }) => {
    // Get current budget
    const budgetBefore = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const beforeResponseData = await budgetBefore.json();
    expect(beforeResponseData.success).toBe(true);
    const beforeData = beforeResponseData.data;

    // Create expense
    const expenseData = {
      description: 'Test expense for budget',
      amount: 25.00,
      category: 'groceries',
      date: new Date().toISOString(),
      paymentMethod: 'cash',
    };

    await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: expenseData }
    );

    // Get updated budget
    const budgetAfter = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const afterResponseData = await budgetAfter.json();
    expect(afterResponseData.success).toBe(true);
    const afterData = afterResponseData.data;

    // Verify spent today increased
    expect(afterData.spentToday).toBeGreaterThan(beforeData.spentToday);

    // Verify spent increased by expense amount
    const spentDifference = afterData.spentToday - beforeData.spentToday;
    expect(spentDifference).toBeCloseTo(expenseData.amount, 2);

    // Verify remaining decreased (unless it was already 0)
    if (beforeData.remainingToday > 0) {
      expect(afterData.remainingToday).toBeLessThanOrEqual(beforeData.remainingToday);
    }

    // Verify percent used increased
    expect(afterData.percentUsed).toBeGreaterThan(beforeData.percentUsed);
  });

  test('should update envelope amounts after expense creation', async ({ authenticatedContext }) => {
    const category = 'groceries';

    // Get current envelopes
    const envelopesBefore = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const beforeResponseData = await envelopesBefore.json();
    expect(beforeResponseData.success).toBe(true);
    const beforeData = beforeResponseData.data;
    const envelopeBefore = beforeData.envelopes.find((env: any) => env.category === category);

    // Create expense in this category
    const expenseData = {
      description: 'Test expense for envelope',
      amount: 15.00,
      category,
      date: new Date().toISOString(),
      paymentMethod: 'debit_card',
    };

    await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: expenseData }
    );

    // Get updated envelopes
    const envelopesAfter = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const afterResponseData = await envelopesAfter.json();
    expect(afterResponseData.success).toBe(true);
    const afterData = afterResponseData.data;
    const envelopeAfter = afterData.envelopes.find((env: any) => env.category === category);

    // Verify spent increased
    expect(envelopeAfter.spent).toBeGreaterThan(envelopeBefore.spent);

    // Verify spent increased by expense amount
    const spentDifference = envelopeAfter.spent - envelopeBefore.spent;
    expect(spentDifference).toBeCloseTo(expenseData.amount, 2);

    // Verify remaining decreased (unless it was already 0)
    if (envelopeBefore.remaining > 0) {
      expect(envelopeAfter.remaining).toBeLessThanOrEqual(envelopeBefore.remaining);
    }

    // Verify percentage increased
    expect(envelopeAfter.percentage).toBeGreaterThan(envelopeBefore.percentage);
  });

  test('should add expense to recent transactions', async ({ authenticatedContext }) => {
    const category = 'dining';
    const description = 'Test restaurant expense';

    // Create expense
    const expenseData = {
      description,
      amount: 35.00,
      category,
      date: new Date().toISOString(),
      paymentMethod: 'credit_card',
      merchantName: 'Test Restaurant',
    };

    await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: expenseData }
    );

    // Get envelopes
    const envelopesResponse = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const responseData = await envelopesResponse.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;
    const envelope = data.envelopes.find((env: any) => env.category === category);

    // Verify expense appears in recent transactions
    const recentTransaction = envelope.recentTransactions.find(
      (tx: any) => tx.description === description
    );
    expect(recentTransaction).toBeTruthy();
    expect(recentTransaction.amount).toBe(expenseData.amount);
    expect(recentTransaction.merchantName).toBe(expenseData.merchantName);
  });

  test('should normalize tags to lowercase', async ({ authenticatedContext }) => {
    const expenseData = {
      description: 'Test expense with tags',
      amount: 10.00,
      category: 'shopping',
      date: new Date().toISOString(),
      paymentMethod: 'cash',
      tags: ['UPPERCASE', 'MixedCase', 'lowercase'],
    };

    const response = await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: expenseData }
    );

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // All tags should be lowercase
    expect(data.tags).toEqual(['uppercase', 'mixedcase', 'lowercase']);
  });

  test('should handle optional fields', async ({ authenticatedContext }) => {
    // Create expense without optional fields
    const expenseData = {
      description: 'Minimal expense',
      amount: 10.00,
      category: 'other',
      date: new Date().toISOString(),
      paymentMethod: 'cash',
    };

    const response = await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: expenseData }
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Optional fields should have default values
    expect(data.isRecurring).toBe(false);
    expect(data.tags).toEqual([]);
    expect(data.merchantName).toBeUndefined();
    expect(data.notes).toBeUndefined();
    expect(data.receiptUrl).toBeUndefined();
  });

  test('should fail without authentication', async ({ request }) => {
    const expenseData = {
      description: 'Unauthorized expense',
      amount: 10.00,
      category: 'groceries',
      date: new Date().toISOString(),
      paymentMethod: 'cash',
    };

    const response = await request.post('http://localhost:4000/api/finance/expenses', {
      data: expenseData,
    });

    // Should return 401 Unauthorized
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(401);
  });

  test('should create multiple expenses and track total correctly', async ({ authenticatedContext }) => {
    const category = 'transportation';

    // Get initial state
    const initialBudget = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const initialResponseData = await initialBudget.json();
    expect(initialResponseData.success).toBe(true);
    const initialData = initialResponseData.data;
    const initialSpent = initialData.spentToday;

    // Create multiple expenses
    const expenses = [
      { description: 'Bus ticket', amount: 2.50 },
      { description: 'Train ticket', amount: 8.00 },
      { description: 'Parking', amount: 5.00 },
    ];

    for (const expense of expenses) {
      await authenticatedRequest(
        authenticatedContext,
        'POST',
        '/finance/expenses',
        {
          data: {
            ...expense,
            category,
            date: new Date().toISOString(),
            paymentMethod: 'debit_card',
          },
        }
      );
    }

    // Get final state
    const finalBudget = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const finalResponseData = await finalBudget.json();
    expect(finalResponseData.success).toBe(true);
    const finalData = finalResponseData.data;

    // Verify total increase
    const totalExpenseAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const actualIncrease = finalData.spentToday - initialSpent;
    expect(actualIncrease).toBeCloseTo(totalExpenseAmount, 2);
  });
});
