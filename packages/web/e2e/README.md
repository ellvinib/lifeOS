# LifeOS Finance Module - E2E Tests

Comprehensive Playwright E2E test suite for the Finance module.

## Overview

This test suite provides complete end-to-end coverage of the Finance module, including:

- **Authentication**: Login flow, token management, and authenticated requests
- **Budget Today**: Daily budget tracking and calculations
- **Envelopes**: Budget envelope system with 9 expense categories
- **Expenses**: Expense creation, validation, and tracking
- **End-to-End Workflows**: Complete user journeys through the Finance module

## Test Files

### 1. `fixtures/auth.ts`
Authentication fixtures and helpers for all tests.

**Features:**
- Test user credentials management
- Login helper function
- Auth token storage and retrieval
- Authenticated API request helper
- Extended test fixtures with auto-authentication

**Usage:**
```typescript
import { test, expect } from '../fixtures/auth';

test('my test', async ({ authenticatedContext }) => {
  const response = await authenticatedRequest(
    authenticatedContext,
    'GET',
    '/finance/budget/today'
  );
  expect(response.ok()).toBeTruthy();
});
```

### 2. `finance/auth.spec.ts`
Authentication flow tests.

**Tests:**
- ✓ Login with valid credentials
- ✓ Login failure with invalid credentials
- ✓ Token storage and retrieval
- ✓ Authenticated API calls
- ✓ Unauthorized requests without token
- ✓ Token reuse across requests
- ⏭ Token refresh (skipped, not implemented yet)

**Run:**
```bash
pnpm test:e2e finance/auth.spec.ts
```

### 3. `finance/budget-today.spec.ts`
Budget Today endpoint tests (`GET /api/finance/budget/today`).

**Tests:**
- ✓ Returns valid response structure
- ✓ Correct data types for all fields
- ✓ Valid daily limit calculation
- ✓ Valid expense tracking
- ✓ Valid monthly tracking
- ✓ Correct on-track status indicator
- ✓ Consistent across multiple requests
- ✓ Fails without authentication
- ✓ Includes all UI-required fields

**Response Structure:**
```typescript
{
  remainingToday: number;
  dailyLimit: number;
  spentToday: number;
  percentUsed: number;
  totalBudget: number;
  spentThisMonth: number;
  daysInMonth: number;
  dayOfMonth: number;
  onTrack: boolean;
  projectedEndOfMonthTotal: number;
}
```

**Run:**
```bash
pnpm test:e2e finance/budget-today.spec.ts
```

### 4. `finance/envelopes.spec.ts`
Envelopes page and API tests (`GET /api/finance/budget/envelopes`).

**Tests:**
- ✓ Page loads successfully
- ✓ Displays all 9 expense categories
- ✓ Fetches envelopes data from API
- ✓ Correct envelope structure
- ✓ Status indicators (good/warning/danger)
- ✓ Progress bars with percentages
- ✓ Recent transactions display
- ✓ Budget summary calculations
- ✓ Envelope selection
- ✓ Correct status calculation based on percentage
- ✓ Current month display
- ✓ Transaction formatting

**Expense Categories:**
1. Housing
2. Utilities
3. Groceries
4. Transportation
5. Healthcare
6. Entertainment
7. Dining
8. Shopping
9. Other

**Status Rules:**
- `good`: ≤ 80% of planned budget used
- `warning`: 81-100% of planned budget used
- `danger`: > 100% of planned budget used

**Run:**
```bash
pnpm test:e2e finance/envelopes.spec.ts
```

### 5. `finance/expenses.spec.ts`
Expense creation tests (`POST /api/finance/expenses`).

**Tests:**
- ✓ Create expense with valid data
- ✓ Create recurring expense
- ✓ Validate required fields
- ✓ Validate positive amount
- ✓ Validate category
- ✓ Validate payment method
- ✓ Validate recurring interval
- ✓ Budget updates after expense creation
- ✓ Envelope updates after expense creation
- ✓ Expense appears in recent transactions
- ✓ Tags normalized to lowercase
- ✓ Optional fields handling
- ✓ Fails without authentication
- ✓ Multiple expenses tracked correctly

**Valid Categories:**
- `housing`, `utilities`, `groceries`, `transportation`, `healthcare`,
  `insurance`, `entertainment`, `dining`, `shopping`, `education`,
  `savings`, `debt_payment`, `investments`, `gifts`, `other`

**Valid Payment Methods:**
- `cash`, `credit_card`, `debit_card`, `bank_transfer`, `mobile_payment`, `other`

**Run:**
```bash
pnpm test:e2e finance/expenses.spec.ts
```

### 6. `finance/end-to-end.spec.ts`
Complete workflow tests simulating real user journeys.

**Tests:**
- ✓ Complete expense tracking workflow
- ✓ Budget status indicator workflow
- ✓ Envelope status transitions workflow
- ✓ Multiple categories expense workflow
- ✓ Daily budget reset workflow
- ✓ Complete user journey: login to expense tracking

**Workflow Example:**
1. User logs in
2. Views TODAY budget
3. Navigates to envelopes page
4. Creates new expense
5. Budget and envelopes update automatically
6. Expense appears in recent transactions

**Run:**
```bash
pnpm test:e2e finance/end-to-end.spec.ts
```

## Configuration

### Test Credentials
```typescript
{
  email: 'test@example.com',
  password: 'Password123'
}
```

### API Endpoints
- **Base URL**: `http://localhost:4000/api`
- **Auth**: `POST /auth/login`
- **Budget Today**: `GET /finance/budget/today`
- **Envelopes**: `GET /finance/budget/envelopes`
- **Expenses**: `POST /finance/expenses`

### Web App
- **Base URL**: `http://localhost:3000`
- **Finance Home**: `/finance`
- **Envelopes Page**: `/finance/envelopes`

## Running Tests

### All Tests
```bash
pnpm test:e2e
```

### Specific Test File
```bash
pnpm test:e2e finance/auth.spec.ts
```

### Specific Test Suite
```bash
pnpm test:e2e --grep "Authentication"
```

### With UI (Debug Mode)
```bash
pnpm test:e2e --ui
```

### In Headed Mode
```bash
pnpm test:e2e --headed
```

### Specific Browser
```bash
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

### Watch Mode
```bash
pnpm test:e2e --watch
```

## CI/CD Integration

Tests are configured to run in CI with:
- **Retries**: 2 attempts for flaky tests
- **Workers**: 1 (sequential execution)
- **Reporter**: HTML report generated
- **Screenshots**: Only on failure
- **Traces**: On first retry

## Test Data Management

### Test Isolation
Each test is independent and can be run in any order. Tests use:
- Fresh authentication token per test file
- API calls for data verification
- No shared state between tests

### Cleanup
Tests are read-only where possible. When creating test data:
- Use descriptive names (e.g., "E2E Test - ...")
- Tag expenses with `e2e-test` tag
- Tests don't clean up data (allows manual verification)

## Best Practices

1. **Always authenticate**: Use `authenticatedContext` fixture
2. **Verify via API**: Don't rely solely on UI assertions
3. **Use test IDs**: Add `data-testid` attributes to UI components
4. **Be specific**: Use specific selectors, not generic ones
5. **Wait properly**: Use `waitForLoadState` or `waitForSelector`
6. **Assert meaningfully**: Check actual values, not just existence
7. **Test independence**: Each test should work in isolation

## UI Test IDs

Add these `data-testid` attributes to UI components:

### Envelopes Page
- `envelope-{category}`: Envelope card
- `envelope-{category}-status`: Status indicator
- `envelope-{category}-progress`: Progress bar
- `envelope-detail-panel`: Detail panel
- `total-budget`: Total budget display
- `total-spent`: Total spent display
- `total-remaining`: Total remaining display
- `budget-month`: Current month display

### TODAY View
- `remaining-today`: Remaining amount
- `daily-limit`: Daily limit
- `on-track-indicator`: On-track status
- `percent-used`: Percentage used

## Troubleshooting

### Tests fail with "401 Unauthorized"
- Ensure API server is running on port 4000
- Verify test user exists in database
- Check auth token is being stored correctly

### Tests fail with "Page not found"
- Ensure web app is running on port 3000
- Check route paths are correct
- Verify Next.js dev server is started

### Tests are flaky
- Increase timeout in `playwright.config.ts`
- Use `waitForLoadState('networkidle')`
- Add explicit waits for async operations

### API returns unexpected data
- Check database seed data
- Verify test user has budget configured
- Ensure expenses are being created in correct date range

## Future Enhancements

- [ ] Add visual regression tests
- [ ] Add performance benchmarks
- [ ] Add accessibility tests (a11y)
- [ ] Add mobile viewport tests
- [ ] Add cross-browser screenshot comparisons
- [ ] Add API mocking for edge cases
- [ ] Add database cleanup scripts
- [ ] Add test data factories
- [ ] Add GraphQL API tests
- [ ] Add WebSocket real-time tests

## Contributing

When adding new tests:

1. Follow existing patterns in `fixtures/auth.ts`
2. Add descriptive test names
3. Include comments explaining what's being tested
4. Verify test runs independently
5. Update this README with new test coverage
6. Add necessary UI test IDs

## License

MIT
