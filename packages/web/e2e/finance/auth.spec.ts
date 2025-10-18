import { test, expect } from '@playwright/test';
import {
  TEST_USER,
  API_CONFIG,
  login,
  setAuthToken,
  clearAuthToken,
  getAuthToken,
} from '../fixtures/auth';

/**
 * Authentication E2E Tests
 *
 * Tests the authentication flow including:
 * - Login with valid credentials
 * - Token storage and retrieval
 * - Authenticated API requests
 * - Token refresh (if implemented)
 */

test.describe('Authentication', () => {
  // Clear auth token before each test to ensure clean state
  test.beforeEach(() => {
    clearAuthToken();
  });

  test('should login successfully with valid credentials', async ({ request }) => {
    const response = await request.post(`${API_CONFIG.baseURL}/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    // Verify response is successful
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Verify response body contains tokens
    const data = await response.json();
    expect(data).toHaveProperty('tokens');
    expect(data.tokens).toHaveProperty('accessToken');
    expect(typeof data.tokens.accessToken).toBe('string');
    expect(data.tokens.accessToken.length).toBeGreaterThan(0);
    expect(data.tokens).toHaveProperty('refreshToken');

    // Verify user data is returned
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('email', TEST_USER.email);
  });

  test('should fail login with invalid credentials', async ({ request }) => {
    const response = await request.post(`${API_CONFIG.baseURL}/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: 'WrongPassword123',
      },
    });

    // Verify response is unsuccessful
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(401);
  });

  test('should store and retrieve auth token', async ({ request }) => {
    // Initially no token
    expect(getAuthToken()).toBeNull();

    // Login and get token
    const token = await login(request);

    // Verify token is stored
    expect(getAuthToken()).toBe(token);
    expect(token).toBeTruthy();

    // Clear token
    clearAuthToken();
    expect(getAuthToken()).toBeNull();

    // Set token manually
    setAuthToken('test-token-123');
    expect(getAuthToken()).toBe('test-token-123');
  });

  test('should make authenticated API calls with token', async ({ request }) => {
    // Login first
    const token = await login(request);
    expect(token).toBeTruthy();

    // Make authenticated request to protected endpoint
    const response = await request.get(`${API_CONFIG.baseURL}/finance/budget/today`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // Verify request is successful
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Verify response has expected structure
    const data = await response.json();
    expect(data).toBeTruthy();
  });

  test('should fail API calls without auth token', async ({ request }) => {
    // Make request without authentication
    const response = await request.get(`${API_CONFIG.baseURL}/finance/budget/today`);

    // Verify request is unauthorized
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(401);
  });

  test('should fail API calls with invalid token', async ({ request }) => {
    // Make request with invalid token
    const response = await request.get(`${API_CONFIG.baseURL}/finance/budget/today`, {
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
      },
    });

    // Verify request is unauthorized
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(401);
  });

  test('should reuse existing token for multiple requests', async ({ request }) => {
    // First login
    const token1 = await login(request);
    expect(token1).toBeTruthy();

    // Second login should return same token (from cache)
    const token2 = await login(request);
    expect(token2).toBe(token1);

    // Make multiple authenticated requests
    const response1 = await request.get(`${API_CONFIG.baseURL}/finance/budget/today`, {
      headers: { 'Authorization': `Bearer ${token1}` },
    });
    expect(response1.ok()).toBeTruthy();

    const response2 = await request.get(`${API_CONFIG.baseURL}/finance/budget/envelopes`, {
      headers: { 'Authorization': `Bearer ${token1}` },
    });
    expect(response2.ok()).toBeTruthy();
  });

  // TODO: Add token refresh test when implemented
  test.skip('should refresh expired token', async ({ request }) => {
    // This test is skipped until token refresh is implemented
    // When implemented, it should:
    // 1. Get an expired token
    // 2. Make a request that triggers refresh
    // 3. Verify new token is returned
    // 4. Verify new token works for subsequent requests
  });
});
