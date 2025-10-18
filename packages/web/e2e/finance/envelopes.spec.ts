import { test, expect } from '../fixtures/auth';
import { authenticatedRequest } from '../fixtures/auth';

/**
 * Envelopes E2E Tests
 *
 * Tests the envelopes page functionality including:
 * - GET /api/finance/budget/envelopes endpoint
 * - Envelope categories display
 * - Status indicators (good/warning/danger)
 * - Progress bars
 * - Recent transactions
 * - Budget summary calculations
 */

/**
 * Expected expense categories (9 total)
 */
const EXPECTED_CATEGORIES = [
  'housing',
  'utilities',
  'groceries',
  'transportation',
  'healthcare',
  'entertainment',
  'dining',
  'shopping',
  'other',
] as const;

test.describe('Envelopes Page', () => {
  test('should load envelopes page successfully', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/envelopes');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page title/heading
    const heading = page.getByRole('heading', { name: /budget enveloppen/i });
    await expect(heading).toBeVisible();
  });

  test('should display all 9 expense categories', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    // Verify each category is displayed
    for (const category of EXPECTED_CATEGORIES) {
      const categoryElement = page.getByTestId(`envelope-${category}`);
      await expect(categoryElement).toBeVisible();
    }
  });

  test('should fetch envelopes data from API', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );

    // Verify successful response
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Verify response structure
    const responseData = await response.json();
    expect(responseData).toHaveProperty('success');
    expect(responseData.success).toBe(true);
    expect(responseData).toHaveProperty('data');

    const data = responseData.data;
    expect(data).toBeTruthy();
    expect(data).toHaveProperty('envelopes');
    expect(data).toHaveProperty('totalBudget');
    expect(data).toHaveProperty('totalSpent');
    expect(data).toHaveProperty('totalRemaining');
    expect(data).toHaveProperty('month');

    // Verify envelopes is an array
    expect(Array.isArray(data.envelopes)).toBe(true);
  });

  test('should have correct envelope structure', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Verify at least one envelope exists
    expect(data.envelopes.length).toBeGreaterThan(0);

    // Verify each envelope has required fields
    for (const envelope of data.envelopes) {
      expect(envelope).toHaveProperty('category');
      expect(envelope).toHaveProperty('name');
      expect(envelope).toHaveProperty('emoji');
      expect(envelope).toHaveProperty('planned');
      expect(envelope).toHaveProperty('spent');
      expect(envelope).toHaveProperty('remaining');
      expect(envelope).toHaveProperty('percentage');
      expect(envelope).toHaveProperty('status');
      expect(envelope).toHaveProperty('recentTransactions');

      // Verify data types
      expect(typeof envelope.category).toBe('string');
      expect(typeof envelope.name).toBe('string');
      expect(typeof envelope.emoji).toBe('string');
      expect(typeof envelope.planned).toBe('number');
      expect(typeof envelope.spent).toBe('number');
      expect(typeof envelope.remaining).toBe('number');
      expect(typeof envelope.percentage).toBe('number');
      expect(['good', 'warning', 'danger']).toContain(envelope.status);
      expect(Array.isArray(envelope.recentTransactions)).toBe(true);
    }
  });

  test('should display envelope status indicators correctly', async ({ authenticatedPage: page, authenticatedContext }) => {
    // First get data from API to know expected statuses
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Navigate to page
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    // Verify each envelope has correct status indicator
    for (const envelope of data.envelopes) {
      const statusElement = page.getByTestId(`envelope-${envelope.category}-status`);
      await expect(statusElement).toBeVisible();

      // Verify status is reflected in the UI (color, icon, etc.)
      const className = await statusElement.getAttribute('class');
      if (envelope.status === 'good') {
        expect(className).toContain('green');
      } else if (envelope.status === 'warning') {
        expect(className).toContain('yellow');
      } else if (envelope.status === 'danger') {
        expect(className).toContain('red');
      }
    }
  });

  test('should display progress bars with correct percentages', async ({ authenticatedPage: page, authenticatedContext }) => {
    // Get data from API
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Navigate to page
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    // Verify progress bars
    for (const envelope of data.envelopes) {
      const progressBar = page.getByTestId(`envelope-${envelope.category}-progress`);
      await expect(progressBar).toBeVisible();

      // Verify progress bar width or aria-valuenow
      const ariaValue = await progressBar.getAttribute('aria-valuenow');
      if (ariaValue) {
        expect(parseFloat(ariaValue)).toBeCloseTo(envelope.percentage, 1);
      }
    }
  });

  test('should display recent transactions', async ({ authenticatedPage: page, authenticatedContext }) => {
    // Get data from API
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Navigate to page
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    // Find an envelope with recent transactions
    const envelopeWithTransactions = data.envelopes.find(
      (env: any) => env.recentTransactions.length > 0
    );

    if (envelopeWithTransactions) {
      // Click on envelope to see details
      const envelopeCard = page.getByTestId(`envelope-${envelopeWithTransactions.category}`);
      await envelopeCard.click();

      // Wait for detail panel to appear
      const detailPanel = page.getByTestId('envelope-detail-panel');
      await expect(detailPanel).toBeVisible();

      // Verify transactions are displayed in the detail panel
      for (const transaction of envelopeWithTransactions.recentTransactions.slice(0, 3)) {
        const transactionElement = detailPanel.getByText(transaction.description).first();
        await expect(transactionElement).toBeVisible();
      }
    }
  });

  test('should have correct budget summary calculations', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Verify numbers are valid
    expect(data.totalBudget).toBeGreaterThan(0);
    expect(data.totalSpent).toBeGreaterThanOrEqual(0);
    // totalRemaining can be negative if overspent
    expect(typeof data.totalRemaining).toBe('number');

    // Verify calculations
    // totalRemaining should equal totalBudget - totalSpent
    expect(data.totalRemaining).toBeCloseTo(data.totalBudget - data.totalSpent, 2);

    // Sum of all envelope planned amounts should equal total budget
    const sumPlanned = data.envelopes.reduce(
      (sum: number, env: any) => sum + env.planned,
      0
    );
    expect(sumPlanned).toBeCloseTo(data.totalBudget, 2);

    // Sum of all envelope spent amounts should equal total spent
    const sumSpent = data.envelopes.reduce(
      (sum: number, env: any) => sum + env.spent,
      0
    );
    expect(sumSpent).toBeCloseTo(data.totalSpent, 2);
  });

  test('should display budget summary on page', async ({ authenticatedPage: page, authenticatedContext }) => {
    // Get data from API
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Navigate to page
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    // Verify summary is displayed
    const totalBudgetElement = page.getByTestId('total-budget');
    await expect(totalBudgetElement).toBeVisible();
    await expect(totalBudgetElement).toContainText(data.totalBudget.toFixed(2));

    const totalSpentElement = page.getByTestId('total-spent');
    await expect(totalSpentElement).toBeVisible();
    await expect(totalSpentElement).toContainText(data.totalSpent.toFixed(2));

    const totalRemainingElement = page.getByTestId('total-remaining');
    await expect(totalRemainingElement).toBeVisible();
    await expect(totalRemainingElement).toContainText(data.totalRemaining.toFixed(2));
  });

  test('should allow envelope selection', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    // Click on first envelope
    const firstEnvelope = page.getByTestId(`envelope-${EXPECTED_CATEGORIES[0]}`);
    await firstEnvelope.click();

    // Verify envelope is selected (ring-2 ring-purple-500 indicates selection)
    const selectedClass = await firstEnvelope.getAttribute('class');
    expect(selectedClass).toContain('ring-2');
    expect(selectedClass).toContain('ring-purple-500');

    // Verify detail panel appears
    const detailPanel = page.getByTestId('envelope-detail-panel');
    await expect(detailPanel).toBeVisible();
  });

  test('should calculate envelope status correctly', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    for (const envelope of data.envelopes) {
      // Status should be based on percentage (API thresholds: 85% warning, 100% danger)
      if (envelope.percentage >= 100) {
        expect(envelope.status).toBe('danger');
      } else if (envelope.percentage >= 85) {
        expect(envelope.status).toBe('warning');
      } else {
        expect(envelope.status).toBe('good');
      }

      // Percentage should be (spent / planned) * 100
      if (envelope.planned > 0) {
        const expectedPercentage = Math.round((envelope.spent / envelope.planned) * 100);
        expect(envelope.percentage).toBe(expectedPercentage);
      }

      // Remaining should be planned - spent
      expect(envelope.remaining).toBeCloseTo(envelope.planned - envelope.spent, 2);
    }
  });

  test('should display current month', async ({ authenticatedPage: page, authenticatedContext }) => {
    // Get data from API
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Navigate to page
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    // Verify month is displayed
    const monthElement = page.getByTestId('budget-month');
    await expect(monthElement).toBeVisible();
    await expect(monthElement).toContainText(data.month);
  });

  test('should format recent transactions correctly', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/envelopes'
    );

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    for (const envelope of data.envelopes) {
      for (const transaction of envelope.recentTransactions) {
        // Verify transaction structure
        expect(transaction).toHaveProperty('date');
        expect(transaction).toHaveProperty('description');
        expect(transaction).toHaveProperty('amount');

        // Verify data types
        expect(typeof transaction.date).toBe('string');
        expect(typeof transaction.description).toBe('string');
        expect(typeof transaction.amount).toBe('number');

        // Verify date is ISO 8601 format
        const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        expect(transaction.date).toMatch(dateRegex);

        // Amount should be positive
        expect(transaction.amount).toBeGreaterThan(0);
      }
    }
  });

  test('should handle empty envelopes gracefully', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/envelopes');
    await page.waitForLoadState('networkidle');

    // Page should still load even if no data
    const heading = page.getByRole('heading', { name: /budget enveloppen/i });
    await expect(heading).toBeVisible();

    // Should show appropriate message or empty state
    // (This depends on your UI implementation)
  });

  test('should fail without authentication', async ({ request }) => {
    const response = await request.get('http://localhost:4000/api/finance/budget/envelopes');

    // Should return 401 Unauthorized
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(401);
  });
});
