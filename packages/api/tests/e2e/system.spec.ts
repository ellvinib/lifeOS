import { test, expect } from '@playwright/test';
import { FinanceAPIClient } from './helpers/api-client';

/**
 * System Integration Tests
 *
 * Tests the overall system health and integration:
 * 1. Health checks
 * 2. API availability
 * 3. Module loading
 * 4. Error handling
 */

test.describe('System Health', () => {
  test('should return healthy status from main health endpoint', async ({ request }) => {
    const response = await request.get('/health');
    const body = await response.json();

    // Assertions
    expect(response.status()).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
    expect(body.uptime).toBeGreaterThan(0);
  });

  test('should return API info from root endpoint', async ({ request }) => {
    const response = await request.get('/api');
    const body = await response.json();

    // Assertions
    expect(response.status()).toBe(200);
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('environment');
    expect(body.name).toBe('LifeOS API');
  });

  test('should return 404 for non-existent routes', async ({ request }) => {
    const response = await request.get('/api/non-existent-route');
    const body = await response.json();

    // Assertions
    expect(response.status()).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toHaveProperty('message');
    expect(body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

test.describe('Finance Module Health', () => {
  let api: FinanceAPIClient;

  test.beforeEach(async ({ request }) => {
    api = new FinanceAPIClient(request);
  });

  test('should return finance module health status', async () => {
    const healthResponse = await api.financeHealthCheck();

    // Assertions
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body).toHaveProperty('module');
    expect(healthResponse.body.module).toBe('finance');
    expect(healthResponse.body).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(healthResponse.body.status);
    expect(healthResponse.body).toHaveProperty('checks');
    expect(healthResponse.body).toHaveProperty('timestamp');
  });

  test('should check database connectivity', async () => {
    const healthResponse = await api.financeHealthCheck();

    // Assertions
    expect(healthResponse.body.checks).toHaveProperty('database');
    expect(healthResponse.body.checks.database).toHaveProperty('status');
    expect(['pass', 'warn', 'fail']).toContain(healthResponse.body.checks.database.status);
  });

  test('should check file storage accessibility', async () => {
    const healthResponse = await api.financeHealthCheck();

    // Assertions
    expect(healthResponse.body.checks).toHaveProperty('storage');
    expect(healthResponse.body.checks.storage).toHaveProperty('status');
  });

  test('should check Gemini API configuration', async () => {
    const healthResponse = await api.financeHealthCheck();

    // Assertions
    expect(healthResponse.body.checks).toHaveProperty('gemini_api');
    expect(healthResponse.body.checks.gemini_api).toHaveProperty('status');
    
    // Status should be 'pass' if API key configured, 'warn' otherwise
    expect(['pass', 'warn']).toContain(healthResponse.body.checks.gemini_api.status);
  });

  test('should include feature flags in metadata', async () => {
    const healthResponse = await api.financeHealthCheck();

    // Assertions
    expect(healthResponse.body).toHaveProperty('metadata');
    expect(healthResponse.body.metadata).toHaveProperty('features');
    expect(healthResponse.body.metadata.features).toHaveProperty('invoice_management');
    expect(healthResponse.body.metadata.features).toHaveProperty('transaction_import');
    expect(healthResponse.body.metadata.features).toHaveProperty('smart_matching');
  });
});

test.describe('Error Handling', () => {
  test('should handle validation errors gracefully', async ({ request }) => {
    // Try to upload invoice without file
    const response = await request.post('/api/finance/invoices/upload', {
      data: {
        source: 'MANUAL',
      },
    });

    const body = await response.json();

    // Assertions
    expect(response.status()).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toHaveProperty('message');
  });

  test('should handle malformed JSON gracefully', async ({ request }) => {
    const response = await request.post('/api/finance/invoices', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: 'this is not valid JSON{{{',
    });

    // Should return 400 Bad Request
    expect([400, 500]).toContain(response.status());
  });

  test('should handle missing required parameters', async ({ request }) => {
    const response = await request.post('/api/finance/matches/confirm', {
      data: {
        // Missing invoiceId and transactionId
      },
    });

    const body = await response.json();

    // Assertions
    expect(response.status()).toBe(400);
    expect(body.success).toBe(false);
  });
});

test.describe('Module Integration', () => {
  test('should have Finance module routes mounted', async ({ request }) => {
    // Test that all main route groups exist
    const routes = [
      '/api/finance/invoices',
      '/api/finance/transactions',
      '/api/finance/matches',
      '/api/finance/webhooks/mailgun',
    ];

    for (const route of routes) {
      const response = await request.get(route);
      
      // Should not return 404
      expect(response.status()).not.toBe(404);
    }
  });

  test('should accept requests with CORS headers', async ({ request }) => {
    const response = await request.get('/health', {
      headers: {
        Origin: 'http://localhost:3001',
      },
    });

    // Should include CORS headers
    const headers = response.headers();
    expect(headers).toHaveProperty('access-control-allow-origin');
  });
});
