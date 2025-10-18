# E2E Tests - Quick Reference

## Run Commands

```bash
# Run all tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Debug mode (step through)
pnpm test:e2e:debug

# View last report
pnpm test:e2e:report

# Run specific file
pnpm test:e2e finance/auth.spec.ts

# Run specific test suite
pnpm test:e2e --grep "Authentication"

# Run specific browser
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

## Test Credentials

```typescript
{
  email: 'test@example.com',
  password: 'Password123'
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | User login |
| `/finance/budget/today` | GET | Today's budget status |
| `/finance/budget/envelopes` | GET | All budget envelopes |
| `/finance/budget/check-affordability` | POST | Check if purchase is affordable |
| `/finance/expenses` | POST | Create expense |

## Test Fixtures Usage

### Basic Test
```typescript
import { test, expect } from '../fixtures/auth';

test('my test', async ({ authenticatedContext }) => {
  const response = await authenticatedRequest(
    authenticatedContext,
    'GET',
    '/finance/budget/today'
  );
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
});
```

### Page Test
```typescript
import { test, expect } from '../fixtures/auth';

test('page test', async ({ page }) => {
  await page.goto('/finance/envelopes');
  await page.waitForLoadState('networkidle');

  const heading = page.getByRole('heading', { name: /envelopes/i });
  await expect(heading).toBeVisible();
});
```

### Combined API + Page Test
```typescript
import { test, expect } from '../fixtures/auth';
import { authenticatedRequest } from '../fixtures/auth';

test('combined test', async ({ page, authenticatedContext }) => {
  // Create data via API
  const response = await authenticatedRequest(
    authenticatedContext,
    'POST',
    '/finance/expenses',
    { data: { ... } }
  );

  // Verify in UI
  await page.goto('/finance/envelopes');
  await page.waitForLoadState('networkidle');
  // ... verify UI
});
```

## Expense Categories

- `housing`
- `utilities`
- `groceries`
- `transportation`
- `healthcare`
- `insurance`
- `entertainment`
- `dining`
- `shopping`
- `education`
- `savings`
- `debt_payment`
- `investments`
- `gifts`
- `other`

## Payment Methods

- `cash`
- `credit_card`
- `debit_card`
- `bank_transfer`
- `mobile_payment`
- `other`

## Envelope Status

| Status | Condition | Color |
|--------|-----------|-------|
| `good` | ≤ 80% used | Green |
| `warning` | 81-100% used | Yellow |
| `danger` | > 100% used | Red |

## Common Assertions

```typescript
// Response success
expect(response.ok()).toBeTruthy();
expect(response.status()).toBe(200);

// Data structure
expect(data).toHaveProperty('field');
expect(data.field).toBe(value);
expect(typeof data.field).toBe('number');

// Arrays
expect(Array.isArray(data.items)).toBe(true);
expect(data.items.length).toBeGreaterThan(0);

// Numbers
expect(data.amount).toBeGreaterThan(0);
expect(data.amount).toBeCloseTo(42.50, 2);

// UI elements
await expect(element).toBeVisible();
await expect(element).toContainText('text');
await expect(page).toHaveURL(/pattern/);

// Classes
expect(className).toContain('green');
```

## Test Data Examples

### Valid Expense
```typescript
{
  description: 'Weekly groceries',
  amount: 45.50,
  category: 'groceries',
  date: new Date().toISOString(),
  paymentMethod: 'debit_card',
  merchantName: 'Delhaize',
  notes: 'Weekly shopping',
  tags: ['food', 'weekly'],
}
```

### Recurring Expense
```typescript
{
  description: 'Monthly gym membership',
  amount: 30.00,
  category: 'healthcare',
  date: new Date().toISOString(),
  paymentMethod: 'bank_transfer',
  isRecurring: true,
  recurrenceIntervalDays: 30,
}
```

## UI Test IDs

```typescript
// Envelopes page
page.getByTestId('envelope-groceries')
page.getByTestId('envelope-groceries-status')
page.getByTestId('envelope-groceries-progress')
page.getByTestId('envelope-detail-panel')
page.getByTestId('total-budget')
page.getByTestId('total-spent')
page.getByTestId('total-remaining')
page.getByTestId('budget-month')

// TODAY view
page.getByTestId('remaining-today')
page.getByTestId('daily-limit')
page.getByTestId('on-track-indicator')
page.getByTestId('percent-used')
```

## Debugging Tips

1. **Add screenshots**
   ```typescript
   await page.screenshot({ path: 'debug.png' });
   ```

2. **Pause execution**
   ```typescript
   await page.pause();
   ```

3. **Console logs**
   ```typescript
   console.log('Data:', JSON.stringify(data, null, 2));
   ```

4. **Trace viewer**
   ```bash
   pnpm test:e2e --trace on
   playwright show-trace trace.zip
   ```

5. **Headed mode**
   ```bash
   pnpm test:e2e:headed
   ```

## Common Issues

### 401 Unauthorized
- Check API server is running on port 4000
- Verify test user exists
- Check token is being passed

### Element not found
- Use `waitForSelector` or `waitForLoadState`
- Add explicit waits
- Verify test ID is correct

### Flaky tests
- Increase timeout
- Use `networkidle` instead of `load`
- Add retry logic in CI

### Data not updating
- Check expense date is today
- Verify budget calculations
- Ensure database is seeded correctly

## File Structure

```
e2e/
├── fixtures/
│   └── auth.ts              # Auth helpers & fixtures
├── finance/
│   ├── auth.spec.ts         # Authentication tests
│   ├── budget-today.spec.ts # Budget Today endpoint
│   ├── envelopes.spec.ts    # Envelopes page
│   ├── expenses.spec.ts     # Expense creation
│   └── end-to-end.spec.ts   # Full workflows
├── README.md                # Full documentation
└── QUICK_REFERENCE.md       # This file
```

## Test Coverage

- ✅ Authentication (7 tests)
- ✅ Budget Today API (10 tests)
- ✅ Envelopes Page (16 tests)
- ✅ Expense Creation (15 tests)
- ✅ End-to-End Workflows (6 tests)

**Total: 54+ tests**
