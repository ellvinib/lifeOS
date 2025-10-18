import { test as base, expect, APIRequestContext } from '@playwright/test';

/**
 * Test User Credentials
 *
 * These are hardcoded test credentials used for authentication
 * in all E2E tests
 */
export const TEST_USER = {
  email: 'test@example.com',
  password: 'Password123',
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  baseURL: 'http://localhost:4000/api',
  timeout: 10000,
};

/**
 * Authentication Token Storage
 *
 * Stores the auth token in memory for the duration of the test session
 */
let authToken: string | null = null;

/**
 * Get stored auth token
 */
export function getAuthToken(): string | null {
  return authToken;
}

/**
 * Set auth token
 */
export function setAuthToken(token: string): void {
  authToken = token;
}

/**
 * Clear auth token
 */
export function clearAuthToken(): void {
  authToken = null;
}

/**
 * Login Helper
 *
 * Performs login via API and stores the auth token
 *
 * @param request - Playwright API request context
 * @returns Auth token
 */
export async function login(request: APIRequestContext): Promise<string> {
  // If we already have a token, return it
  if (authToken) {
    return authToken;
  }

  // Perform login
  const response = await request.post(`${API_CONFIG.baseURL}/auth/login`, {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });

  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(data).toHaveProperty('tokens');
  expect(data.tokens).toHaveProperty('accessToken');

  // Store the token
  authToken = data.tokens.accessToken;

  return authToken;
}

/**
 * Make Authenticated API Request
 *
 * Helper to make API requests with authentication header
 *
 * @param request - Playwright API request context
 * @param method - HTTP method
 * @param path - API endpoint path (relative to base URL)
 * @param options - Request options
 */
export async function authenticatedRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options: {
    data?: any;
    params?: Record<string, string>;
  } = {}
) {
  // Ensure we have a token
  if (!authToken) {
    await login(request);
  }

  const url = `${API_CONFIG.baseURL}${path}`;

  return request.fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    data: options.data,
    params: options.params,
  });
}

/**
 * Extended Test Fixtures with Authentication
 *
 * Provides automatic authentication setup for tests
 */
type AuthFixtures = {
  authenticatedContext: APIRequestContext;
  authToken: string;
  authenticatedPage: any;
};

export const test = base.extend<AuthFixtures>({
  /**
   * Authenticated API context fixture
   *
   * Automatically logs in before each test and provides
   * an authenticated request context
   */
  authenticatedContext: async ({ request }, use) => {
    // Login before test
    await login(request);

    // Provide the request context to the test
    await use(request);

    // Cleanup after test (optional)
    // We keep the token for performance, but you could clear it here
  },

  /**
   * Auth token fixture
   *
   * Provides the auth token directly to tests
   */
  authToken: async ({ request }, use) => {
    const token = await login(request);
    await use(token);
  },

  /**
   * Authenticated Page fixture
   *
   * Provides a browser page with authentication tokens set in localStorage
   * This allows navigation to protected routes without being redirected to login
   */
  authenticatedPage: async ({ page, request }, use) => {
    // Login via API to get tokens
    const response = await request.post(`${API_CONFIG.baseURL}/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    const data = await response.json();
    const accessToken = data.tokens.accessToken;
    const refreshToken = data.tokens.refreshToken;

    // Navigate to the base URL first (required to set localStorage)
    await page.goto('http://localhost:3000');

    // Set tokens in localStorage
    await page.evaluate(
      ({ accessToken, refreshToken }) => {
        localStorage.setItem('lifeos_access_token', accessToken);
        localStorage.setItem('lifeos_refresh_token', refreshToken);
      },
      { accessToken, refreshToken }
    );

    // Provide the authenticated page to the test
    await use(page);

    // Cleanup: clear localStorage after test
    await page.evaluate(() => {
      localStorage.removeItem('lifeos_access_token');
      localStorage.removeItem('lifeos_refresh_token');
    });
  },
});

export { expect };
