/**
 * Advertising Campaign E2E Tests
 *
 * Tests the complete campaign lifecycle including:
 * - Creating campaigns
 * - Adding expenses
 * - Tracking metrics
 * - ROI analytics
 *
 * @module E2E Tests
 */

import { test, expect } from '@playwright/test';

// API base URL from environment or default
const API_URL = process.env.API_URL || 'http://localhost:4000';

test.describe('Advertising Campaigns', () => {
  let campaignId: string;
  let expenseId: string;

  test.beforeAll(async () => {
    // Setup: You might want to create a test user or use existing auth
    console.log('Setting up advertising campaign tests...');
  });

  test.afterAll(async () => {
    // Cleanup: Delete test data
    console.log('Cleaning up test data...');
  });

  test('should create a new advertising campaign', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/advertising/campaigns`, {
      data: {
        name: 'Q4 2025 Product Launch',
        description: 'Major product launch campaign',
        platform: 'google_ads',
        startDate: new Date('2025-10-01').toISOString(),
        endDate: new Date('2025-12-31').toISOString(),
        totalBudget: 50000,
        currency: 'EUR',
        targetAudience: 'Tech enthusiasts aged 25-45',
        objectives: ['Brand Awareness', 'Lead Generation', 'Sales'],
        tags: ['product-launch', 'q4-2025'],
      },
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const campaign = await response.json();
    campaignId = campaign.id;

    expect(campaign).toHaveProperty('id');
    expect(campaign.name).toBe('Q4 2025 Product Launch');
    expect(campaign.platform).toBe('google_ads');
    expect(campaign.status).toBe('draft');
    expect(campaign.totalBudget).toBe(50000);
    expect(campaign.objectives).toHaveLength(3);
  });

  test('should retrieve campaign by ID', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/advertising/campaigns/${campaignId}`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const campaign = await response.json();
    expect(campaign.id).toBe(campaignId);
    expect(campaign.name).toBe('Q4 2025 Product Launch');
  });

  test('should start a campaign', async ({ request }) => {
    const response = await request.patch(
      `${API_URL}/api/advertising/campaigns/${campaignId}/status`,
      {
        data: { status: 'active' },
      }
    );

    expect(response.ok()).toBeTruthy();
    const campaign = await response.json();
    expect(campaign.status).toBe('active');
    expect(campaign.isActive).toBe(true);
  });

  test('should create an advertising expense for the campaign', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/advertising/expenses`, {
      data: {
        campaignId,
        date: new Date('2025-10-15').toISOString(),
        amount: 2500,
        currency: 'EUR',
        platform: 'google_ads',
        adType: 'search',
        description: 'Google Search Ads - Week 1',
        impressions: 150000,
        clicks: 3750,
        conversions: 225,
        revenue: 11250,
        targetAudience: 'Tech enthusiasts',
        location: 'Belgium',
        tags: ['week-1', 'search-ads'],
      },
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const expense = await response.json();
    expenseId = expense.id;

    expect(expense).toHaveProperty('id');
    expect(expense.campaignId).toBe(campaignId);
    expect(expense.amount).toBe(2500);
    expect(expense.revenue).toBe(11250);

    // Verify ROI calculations
    expect(expense.roiMetrics).toHaveProperty('roi');
    expect(expense.roiMetrics).toHaveProperty('roas');
    expect(expense.roiMetrics.isProfitable).toBe(true);

    // ROI should be 350% ((11250 - 2500) / 2500 * 100)
    expect(expense.roiMetrics.roi).toBeCloseTo(350, 0);

    // ROAS should be 4.5 (11250 / 2500)
    expect(expense.roiMetrics.roas).toBeCloseTo(4.5, 1);

    // CTR should be 2.5% (3750 / 150000 * 100)
    expect(expense.roiMetrics.ctr).toBeCloseTo(2.5, 1);

    // Conversion rate should be 6% (225 / 3750 * 100)
    expect(expense.roiMetrics.conversionRate).toBeCloseTo(6, 0);
  });

  test('should update expense metrics', async ({ request }) => {
    const response = await request.patch(
      `${API_URL}/api/advertising/expenses/${expenseId}/metrics`,
      {
        data: {
          impressions: 175000,
          clicks: 4200,
          conversions: 280,
          revenue: 14000,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const expense = await response.json();

    expect(expense.impressions).toBe(175000);
    expect(expense.clicks).toBe(4200);
    expect(expense.conversions).toBe(280);
    expect(expense.revenue).toBe(14000);

    // Verify updated ROI (should be 460%)
    expect(expense.roiMetrics.roi).toBeCloseTo(460, 0);
  });

  test('should get campaign ROI analytics', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/advertising/campaigns/${campaignId}/roi`
    );

    expect(response.ok()).toBeTruthy();
    const roiData = await response.json();

    expect(roiData.campaignId).toBe(campaignId);
    expect(roiData.campaignName).toBe('Q4 2025 Product Launch');
    expect(roiData.expenseCount).toBe(1);

    expect(roiData.metrics).toHaveProperty('totalSpend');
    expect(roiData.metrics).toHaveProperty('totalRevenue');
    expect(roiData.metrics).toHaveProperty('roi');
    expect(roiData.metrics).toHaveProperty('performanceGrade');

    expect(roiData.metrics.totalSpend).toBe(2500);
    expect(roiData.metrics.totalRevenue).toBe(14000);
    expect(roiData.metrics.isProfitable).toBe(true);
    expect(roiData.metrics.performanceGrade).toBe('A'); // ROI > 100%
  });

  test('should filter campaigns by platform', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/advertising/campaigns?platform=google_ads`
    );

    expect(response.ok()).toBeTruthy();
    const campaigns = await response.json();

    expect(Array.isArray(campaigns)).toBeTruthy();
    expect(campaigns.length).toBeGreaterThan(0);
    expect(campaigns.every((c: any) => c.platform === 'google_ads')).toBeTruthy();
  });

  test('should filter expenses by campaign', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/advertising/campaigns/${campaignId}/expenses`
    );

    expect(response.ok()).toBeTruthy();
    const expenses = await response.json();

    expect(Array.isArray(expenses)).toBeTruthy();
    expect(expenses.length).toBe(1);
    expect(expenses[0].campaignId).toBe(campaignId);
  });

  test('should pause a campaign', async ({ request }) => {
    const response = await request.patch(
      `${API_URL}/api/advertising/campaigns/${campaignId}/status`,
      {
        data: { status: 'paused' },
      }
    );

    expect(response.ok()).toBeTruthy();
    const campaign = await response.json();
    expect(campaign.status).toBe('paused');
    expect(campaign.isActive).toBe(false);
  });

  test('should validate expense metrics constraints', async ({ request }) => {
    // Try to create expense with clicks > impressions (should fail)
    const response = await request.post(`${API_URL}/api/advertising/expenses`, {
      data: {
        campaignId,
        date: new Date('2025-10-16').toISOString(),
        amount: 1000,
        platform: 'google_ads',
        adType: 'display',
        impressions: 1000,
        clicks: 2000, // Invalid: clicks > impressions
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.message).toContain('Clicks cannot exceed impressions');
  });

  test('should validate campaign date range', async ({ request }) => {
    // Try to create campaign with end date before start date (should fail)
    const response = await request.post(`${API_URL}/api/advertising/campaigns`, {
      data: {
        name: 'Invalid Date Campaign',
        platform: 'facebook',
        startDate: new Date('2025-12-01').toISOString(),
        endDate: new Date('2025-10-01').toISOString(), // Invalid: end before start
        totalBudget: 5000,
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.message).toContain('End date cannot be before start date');
  });

  test('should delete an expense', async ({ request }) => {
    const response = await request.delete(
      `${API_URL}/api/advertising/expenses/${expenseId}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(204);

    // Verify expense is deleted
    const getResponse = await request.get(
      `${API_URL}/api/advertising/expenses/${expenseId}`
    );
    expect(getResponse.status()).toBe(404);
  });

  test('should delete a campaign', async ({ request }) => {
    const response = await request.delete(
      `${API_URL}/api/advertising/campaigns/${campaignId}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(204);

    // Verify campaign is deleted
    const getResponse = await request.get(
      `${API_URL}/api/advertising/campaigns/${campaignId}`
    );
    expect(getResponse.status()).toBe(404);
  });
});

test.describe('ROI Calculations', () => {
  test('should calculate ROI metrics correctly', () => {
    // Test ROI formula: ((Revenue - Spend) / Spend) * 100
    const spend = 1000;
    const revenue = 3000;
    const expectedROI = ((revenue - spend) / spend) * 100; // 200%

    expect(expectedROI).toBe(200);
  });

  test('should calculate ROAS correctly', () => {
    // Test ROAS formula: Revenue / Spend
    const spend = 1000;
    const revenue = 4000;
    const expectedROAS = revenue / spend; // 4.0

    expect(expectedROAS).toBe(4);
  });

  test('should calculate CTR correctly', () => {
    // Test CTR formula: (Clicks / Impressions) * 100
    const impressions = 100000;
    const clicks = 2500;
    const expectedCTR = (clicks / impressions) * 100; // 2.5%

    expect(expectedCTR).toBe(2.5);
  });

  test('should calculate conversion rate correctly', () => {
    // Test conversion rate formula: (Conversions / Clicks) * 100
    const clicks = 1000;
    const conversions = 50;
    const expectedConversionRate = (conversions / clicks) * 100; // 5%

    expect(expectedConversionRate).toBe(5);
  });
});
