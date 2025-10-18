import { test, expect } from '../fixtures/auth';
import { authenticatedRequest, login } from '../fixtures/auth';

/**
 * Finance Module End-to-End Tests
 *
 * Full workflow tests that cover:
 * 1. User authentication
 * 2. Viewing envelopes page
 * 3. Creating expenses
 * 4. Verifying budget updates
 * 5. Verifying envelope updates
 *
 * These tests simulate real user journeys through the Finance module
 */

test.describe('Finance Module - Full Workflow', () => {
  test('complete expense tracking workflow', async ({ authenticatedPage: page, request, authenticatedContext }) => {
    // Step 1: Login
    const token = await login(request);
    expect(token).toBeTruthy();

    // Step 2: Get initial budget state
    const initialBudget = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const initialBudgetResponseData = await initialBudget.json();
    expect(initialBudget.ok()).toBeTruthy();
    expect(initialBudgetResponseData.success).toBe(true);
    const initialBudgetData = initialBudgetResponseData.data;

    const initialSpentToday = initialBudgetData.spentToday;
    const initialRemainingToday = initialBudgetData.remainingToday;

    // Step 3: Get initial envelope state
    const initialEnvelopes = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const initialEnvelopesResponseData = await initialEnvelopes.json();
    expect(initialEnvelopes.ok()).toBeTruthy();
    expect(initialEnvelopesResponseData.success).toBe(true);
    const initialEnvelopesData = initialEnvelopesResponseData.data;

    const groceriesEnvelopeBefore = initialEnvelopesData.envelopes.find(
      (env: any) => env.category === 'groceries'
    );
    const initialGroceriesSpent = groceriesEnvelopeBefore.spent;

    // Step 4: Navigate to envelopes page (UI)
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    const heading = page.getByRole('heading', { name: /budget enveloppen/i });
    await expect(heading).toBeVisible();

    // Verify budget summary is displayed
    const totalBudgetElement = page.getByTestId('total-budget');
    await expect(totalBudgetElement).toBeVisible();

    // Step 5: Create a new expense via API
    const newExpense = {
      description: 'E2E Test - Weekly groceries',
      amount: 42.50,
      category: 'groceries',
      date: new Date().toISOString(),
      paymentMethod: 'debit_card',
      merchantName: 'Carrefour',
      tags: ['e2e-test', 'groceries'],
    };

    const createResponse = await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: newExpense }
    );
    expect(createResponse.ok()).toBeTruthy();
    const createdExpenseResponseData = await createResponse.json();
    expect(createdExpenseResponseData.success).toBe(true);
    const createdExpense = createdExpenseResponseData.data;
    expect(createdExpense).toHaveProperty('id');

    // Step 6: Refresh page to see updates
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 7: Verify budget updated (via API)
    const updatedBudget = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const updatedBudgetResponseData = await updatedBudget.json();
    expect(updatedBudgetResponseData.success).toBe(true);
    const updatedBudgetData = updatedBudgetResponseData.data;

    // Verify spent today increased by expense amount
    expect(updatedBudgetData.spentToday).toBeCloseTo(
      initialSpentToday + newExpense.amount,
      2
    );

    // Verify remaining today decreased by expense amount
    expect(updatedBudgetData.remainingToday).toBeCloseTo(
      initialRemainingToday - newExpense.amount,
      2
    );

    // Step 8: Verify envelope updated (via API)
    const updatedEnvelopes = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const updatedEnvelopesResponseData = await updatedEnvelopes.json();
    expect(updatedEnvelopesResponseData.success).toBe(true);
    const updatedEnvelopesData = updatedEnvelopesResponseData.data;

    const groceriesEnvelopeAfter = updatedEnvelopesData.envelopes.find(
      (env: any) => env.category === 'groceries'
    );

    // Verify groceries envelope spent increased
    expect(groceriesEnvelopeAfter.spent).toBeCloseTo(
      initialGroceriesSpent + newExpense.amount,
      2
    );

    // Verify expense appears in recent transactions
    const recentTransaction = groceriesEnvelopeAfter.recentTransactions.find(
      (tx: any) => tx.description === newExpense.description
    );
    expect(recentTransaction).toBeTruthy();
    expect(recentTransaction.amount).toBe(newExpense.amount);

    // Step 9: Verify UI reflects changes
    const groceriesCard = page.getByTestId('envelope-groceries');
    await expect(groceriesCard).toBeVisible();

    // Click on groceries envelope to see details
    await groceriesCard.click();

    // Verify transaction is visible in UI
    const transactionElement = page.getByText(newExpense.description);
    await expect(transactionElement).toBeVisible();
  });

  test('budget status indicator workflow', async ({ authenticatedPage: page, request, authenticatedContext }) => {
    // Step 1: Login and navigate
    await login(request);
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    // Step 2: Get current budget
    const budgetResponse = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const budgetResponseData = await budgetResponse.json();
    expect(budgetResponseData.success).toBe(true);
    const budgetData = budgetResponseData.data;

    // Step 3: Verify TODAY view shows correct information
    const remainingElement = page.getByTestId('remaining-today');
    await expect(remainingElement).toBeVisible();

    const onTrackIndicator = page.getByTestId('on-track-indicator');
    await expect(onTrackIndicator).toBeVisible();

    // Verify on-track status matches data
    if (budgetData.onTrack) {
      await expect(onTrackIndicator).toHaveClass(/green/);
    } else {
      await expect(onTrackIndicator).toHaveClass(/red|yellow/);
    }

    // Step 4: Create expense that affects on-track status
    const largeExpense = {
      description: 'E2E Test - Large purchase',
      amount: budgetData.dailyLimit * 0.8, // 80% of daily limit
      category: 'shopping',
      date: new Date().toISOString(),
      paymentMethod: 'credit_card',
    };

    await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: largeExpense }
    );

    // Step 5: Refresh and verify update
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Get updated budget
    const updatedBudgetResponse = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const updatedBudgetResponseData = await updatedBudgetResponse.json();
    expect(updatedBudgetResponseData.success).toBe(true);
    const updatedBudgetData = updatedBudgetResponseData.data;

    // Verify percent used increased
    expect(updatedBudgetData.percentUsed).toBeGreaterThan(budgetData.percentUsed);
  });

  test('envelope status transitions workflow', async ({ authenticatedPage: page, request, authenticatedContext }) => {
    // Step 1: Login
    await login(request);

    // Step 2: Get initial envelopes
    const initialEnvelopes = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const initialResponseData = await initialEnvelopes.json();
    expect(initialResponseData.success).toBe(true);
    const initialData = initialResponseData.data;

    // Find an envelope with 'good' status
    const goodEnvelope = initialData.envelopes.find(
      (env: any) => env.status === 'good' && env.planned > 0
    );

    if (!goodEnvelope) {
      test.skip();
      return;
    }

    const category = goodEnvelope.category;
    const initialStatus = goodEnvelope.status;

    // Step 3: Navigate to envelopes page
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    // Verify initial status
    const statusElement = page.getByTestId(`envelope-${category}-status`);
    await expect(statusElement).toBeVisible();

    // Step 4: Create expenses to push envelope into warning/danger
    const expenseAmount = goodEnvelope.planned * 0.5; // 50% of planned

    const expense = {
      description: `E2E Test - ${category} expense`,
      amount: expenseAmount,
      category,
      date: new Date().toISOString(),
      paymentMethod: 'cash',
    };

    await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: expense }
    );

    // Step 5: Refresh and verify status change
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Get updated envelope
    const updatedEnvelopes = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const updatedResponseData = await updatedEnvelopes.json();
    expect(updatedResponseData.success).toBe(true);
    const updatedData = updatedResponseData.data;
    const updatedEnvelope = updatedData.envelopes.find(
      (env: any) => env.category === category
    );

    // Verify status changed (good -> warning or warning -> danger)
    if (initialStatus === 'good') {
      expect(['warning', 'danger']).toContain(updatedEnvelope.status);
    }
  });

  test('multiple categories expense workflow', async ({ authenticatedPage: page, request, authenticatedContext }) => {
    // Step 1: Login
    await login(request);

    // Step 2: Get initial state
    const initialEnvelopes = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const initialResponseData = await initialEnvelopes.json();
    expect(initialResponseData.success).toBe(true);
    const initialData = initialResponseData.data;
    const initialTotalSpent = initialData.totalSpent;

    // Step 3: Create expenses in multiple categories
    const expenses = [
      {
        description: 'E2E Test - Groceries',
        amount: 30.00,
        category: 'groceries',
      },
      {
        description: 'E2E Test - Gas',
        amount: 45.00,
        category: 'transportation',
      },
      {
        description: 'E2E Test - Restaurant',
        amount: 25.00,
        category: 'dining',
      },
    ];

    const totalExpenseAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    for (const expense of expenses) {
      await authenticatedRequest(
        authenticatedContext,
        'POST',
        '/finance/expenses',
        {
          data: {
            ...expense,
            date: new Date().toISOString(),
            paymentMethod: 'debit_card',
          },
        }
      );
    }

    // Step 4: Navigate to envelopes page
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    // Step 5: Verify all envelopes updated
    const updatedEnvelopes = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const updatedResponseData = await updatedEnvelopes.json();
    expect(updatedResponseData.success).toBe(true);
    const updatedData = updatedResponseData.data;

    // Verify total spent increased correctly
    expect(updatedData.totalSpent).toBeCloseTo(
      initialTotalSpent + totalExpenseAmount,
      2
    );

    // Verify each category envelope updated
    for (const expense of expenses) {
      const envelope = updatedData.envelopes.find(
        (env: any) => env.category === expense.category
      );
      expect(envelope).toBeTruthy();

      // Verify UI shows the envelope
      const envelopeCard = page.getByTestId(`envelope-${expense.category}`);
      await expect(envelopeCard).toBeVisible();
    }
  });

  test('daily budget reset workflow', async ({ authenticatedPage: page, request, authenticatedContext }) => {
    // This test verifies that daily budget calculations work correctly
    // Note: Actual reset happens at midnight, so we just verify calculations

    // Step 1: Login
    await login(request);

    // Step 2: Get budget
    const budgetResponse = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const budgetResponseData = await budgetResponse.json();
    expect(budgetResponseData.success).toBe(true);
    const budgetData = budgetResponseData.data;

    // Step 3: Verify daily calculations
    expect(budgetData.dayOfMonth).toBeGreaterThanOrEqual(1);
    expect(budgetData.dayOfMonth).toBeLessThanOrEqual(budgetData.daysInMonth);

    // Daily limit should be total budget divided by days in month
    const expectedDailyLimit = budgetData.totalBudget / budgetData.daysInMonth;
    expect(budgetData.dailyLimit).toBeCloseTo(expectedDailyLimit, 2);

    // Remaining should be dailyLimit - spentToday
    expect(budgetData.remainingToday).toBeCloseTo(
      budgetData.dailyLimit - budgetData.spentToday,
      2
    );

    // Step 4: Navigate to TODAY view
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    // Verify UI shows correct information
    const dailyLimitElement = page.getByTestId('daily-limit');
    await expect(dailyLimitElement).toBeVisible();
    await expect(dailyLimitElement).toContainText(budgetData.dailyLimit.toFixed(2));
  });

  test('complete user journey: login to expense tracking', async ({ authenticatedPage: page, request, authenticatedContext }) => {
    // This test simulates a complete user journey through the Finance module

    // Step 1: Login via API
    const token = await login(request);
    expect(token).toBeTruthy();

    // Step 2: Navigate to finance home
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');

    // Verify user is on finance page
    await expect(page).toHaveURL(/\/finance/);

    // Step 3: View TODAY budget
    const todayResponse = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const todayResponseData = await todayResponse.json();
    expect(todayResponse.ok()).toBeTruthy();
    expect(todayResponseData.success).toBe(true);
    const todayData = todayResponseData.data;

    // Step 4: Navigate to envelopes
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /budget enveloppen/i });
    await expect(heading).toBeVisible();

    // Step 5: View envelope details
    const envelopesResponse = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const envelopesResponseData = await envelopesResponse.json();
    expect(envelopesResponse.ok()).toBeTruthy();
    expect(envelopesResponseData.success).toBe(true);
    const envelopesData = envelopesResponseData.data;
    expect(envelopesData.envelopes.length).toBeGreaterThan(0);

    // Step 6: Create new expense
    const newExpense = {
      description: 'E2E Journey - Test expense',
      amount: 19.99,
      category: 'entertainment',
      date: new Date().toISOString(),
      paymentMethod: 'credit_card',
      merchantName: 'Cinema',
      tags: ['e2e', 'journey'],
    };

    const createResponse = await authenticatedRequest(
      authenticatedContext,
      'POST',
      '/finance/expenses',
      { data: newExpense }
    );
    expect(createResponse.ok()).toBeTruthy();

    // Step 7: Verify expense appears in envelope
    await page.reload();
    await page.waitForLoadState('networkidle');

    const entertainmentEnvelope = page.getByTestId('envelope-entertainment');
    await entertainmentEnvelope.click();

    const transaction = page.getByText(newExpense.description);
    await expect(transaction).toBeVisible();

    // Step 8: Verify budget updated
    const finalBudgetResponse = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const finalBudgetResponseData = await finalBudgetResponse.json();
    expect(finalBudgetResponseData.success).toBe(true);
    const finalBudgetData = finalBudgetResponseData.data;

    expect(finalBudgetData.spentToday).toBeGreaterThanOrEqual(todayData.spentToday);
  });
});
