import { test, expect } from '../fixtures/auth';
import { authenticatedRequest } from '../fixtures/auth';

/**
 * Budget Today Endpoint E2E Tests
 *
 * Tests the GET /api/finance/budget/today endpoint which powers
 * the TODAY view in the Finance UI
 *
 * This endpoint returns:
 * - Daily budget limit
 * - Amount spent today
 * - Remaining amount for today
 * - Monthly budget tracking
 * - On-track indicator
 */

test.describe('Budget Today Endpoint', () => {
  test('should return today budget with valid token', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );

    // Verify successful response
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Verify response body structure
    const responseData = await response.json();
    expect(responseData).toHaveProperty('success');
    expect(responseData.success).toBe(true);
    expect(responseData).toHaveProperty('data');

    const data = responseData.data;
    expect(data).toBeTruthy();

    // Verify all required fields are present
    expect(data).toHaveProperty('remainingToday');
    expect(data).toHaveProperty('dailyLimit');
    expect(data).toHaveProperty('spentToday');
    expect(data).toHaveProperty('percentUsed');
    expect(data).toHaveProperty('totalBudget');
    expect(data).toHaveProperty('spentThisMonth');
    expect(data).toHaveProperty('daysInMonth');
    expect(data).toHaveProperty('dayOfMonth');
    expect(data).toHaveProperty('onTrack');
    expect(data).toHaveProperty('projectedEndOfMonthTotal');
  });

  test('should return correct data types for all fields', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Verify number fields
    expect(typeof data.remainingToday).toBe('number');
    expect(typeof data.dailyLimit).toBe('number');
    expect(typeof data.spentToday).toBe('number');
    expect(typeof data.percentUsed).toBe('number');
    expect(typeof data.totalBudget).toBe('number');
    expect(typeof data.spentThisMonth).toBe('number');
    expect(typeof data.daysInMonth).toBe('number');
    expect(typeof data.dayOfMonth).toBe('number');
    expect(typeof data.projectedEndOfMonthTotal).toBe('number');

    // Verify boolean field
    expect(typeof data.onTrack).toBe('boolean');
  });

  test('should have valid daily limit calculation', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Daily limit should be positive
    expect(data.dailyLimit).toBeGreaterThan(0);

    // Daily limit should be reasonable (not more than total budget)
    expect(data.dailyLimit).toBeLessThanOrEqual(data.totalBudget);

    // Daily limit should roughly equal totalBudget / daysInMonth
    const expectedDailyLimit = data.totalBudget / data.daysInMonth;
    const tolerance = 1; // Allow 1 euro tolerance for rounding
    expect(Math.abs(data.dailyLimit - expectedDailyLimit)).toBeLessThanOrEqual(tolerance);
  });

  test('should have valid expense tracking', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Spent today should be non-negative
    expect(data.spentToday).toBeGreaterThanOrEqual(0);

    // Remaining should equal dailyLimit - spentToday
    expect(data.remainingToday).toBeCloseTo(data.dailyLimit - data.spentToday, 2);

    // Percent used should be between 0 and 100+
    expect(data.percentUsed).toBeGreaterThanOrEqual(0);

    // If spent today is 0, percent should be 0
    if (data.spentToday === 0) {
      expect(data.percentUsed).toBe(0);
    }
  });

  test('should have valid monthly tracking', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Total budget should be positive
    expect(data.totalBudget).toBeGreaterThan(0);

    // Spent this month should be non-negative
    expect(data.spentThisMonth).toBeGreaterThanOrEqual(0);

    // Days in month should be between 28 and 31
    expect(data.daysInMonth).toBeGreaterThanOrEqual(28);
    expect(data.daysInMonth).toBeLessThanOrEqual(31);

    // Day of month should be between 1 and days in month
    expect(data.dayOfMonth).toBeGreaterThanOrEqual(1);
    expect(data.dayOfMonth).toBeLessThanOrEqual(data.daysInMonth);

    // Projected total should be calculated based on current spending rate
    // projectedTotal = spentThisMonth * (daysInMonth / dayOfMonth)
    if (data.dayOfMonth > 0) {
      const expectedProjection = data.spentThisMonth * (data.daysInMonth / data.dayOfMonth);
      const tolerance = 1; // Allow 1 euro tolerance for rounding
      expect(Math.abs(data.projectedEndOfMonthTotal - expectedProjection)).toBeLessThanOrEqual(tolerance);
    }
  });

  test('should correctly indicate on-track status', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // On-track should be boolean
    expect(typeof data.onTrack).toBe('boolean');

    // If projected total is less than or equal to budget, should be on track
    if (data.projectedEndOfMonthTotal <= data.totalBudget) {
      expect(data.onTrack).toBe(true);
    } else {
      // If projected total exceeds budget, should not be on track
      expect(data.onTrack).toBe(false);
    }
  });

  test('should handle multiple requests consistently', async ({ authenticatedContext }) => {
    // Make multiple requests
    const response1 = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const responseData1 = await response1.json();
    expect(responseData1.success).toBe(true);
    const data1 = responseData1.data;

    const response2 = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );
    const responseData2 = await response2.json();
    expect(responseData2.success).toBe(true);
    const data2 = responseData2.data;

    // Data should be consistent across requests (within same second)
    expect(data1.totalBudget).toBe(data2.totalBudget);
    expect(data1.dailyLimit).toBe(data2.dailyLimit);
    expect(data1.daysInMonth).toBe(data2.daysInMonth);
    expect(data1.dayOfMonth).toBe(data2.dayOfMonth);

    // These might change if expenses are added between requests,
    // but should be close
    expect(Math.abs(data1.spentToday - data2.spentToday)).toBeLessThanOrEqual(1);
  });

  test('should fail without authentication', async ({ request }) => {
    const response = await request.get('http://localhost:4000/api/finance/budget/today');

    // Should return 401 Unauthorized
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(401);
  });

  test('should include all fields required by UI', async ({ authenticatedContext }) => {
    const response = await authenticatedRequest(
      authenticatedContext,
      'GET',
      '/finance/budget/today'
    );

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    const data = responseData.data;

    // Fields needed for TODAY view UI component
    const requiredFields = [
      'remainingToday',      // Main display
      'dailyLimit',          // Reference amount
      'spentToday',          // Progress tracking
      'percentUsed',         // Progress bar
      'totalBudget',         // Context
      'spentThisMonth',      // Monthly context
      'daysInMonth',         // Calendar context
      'dayOfMonth',          // Calendar context
      'onTrack',             // Status indicator
      'projectedEndOfMonthTotal', // Projection
    ];

    for (const field of requiredFields) {
      expect(data).toHaveProperty(field);
      expect(data[field]).not.toBeNull();
      expect(data[field]).not.toBeUndefined();
    }
  });
});
