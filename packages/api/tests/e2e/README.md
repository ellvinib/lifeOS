# E2E Tests

End-to-end tests for LifeOS Finance module using Playwright.

## Overview

These tests validate the complete Finance module workflow:
- **Invoice Management** - Upload, extraction, CRUD operations
- **Transaction Import** - CSV import, duplicate detection, categorization
- **Smart Matching** - Suggestion algorithm, match confirmation, unmatch
- **System Integration** - Health checks, error handling, module loading

## Test Structure

```
tests/e2e/
├── fixtures/             # Test data
│   ├── sample-transactions.csv
│   ├── sample-invoice-*.pdf (create these)
│   └── README.md
├── helpers/              # Test utilities
│   ├── api-client.ts    # Finance API wrapper
│   └── database.ts      # Database helpers
├── global-setup.ts      # Before all tests
├── global-teardown.ts   # After all tests
├── invoice.spec.ts      # Invoice tests (8 tests)
├── transaction.spec.ts  # Transaction tests (9 tests)
├── matching.spec.ts     # Matching tests (11 tests)
└── system.spec.ts       # System tests (12 tests)
```

**Total: 40 E2E tests**

## Prerequisites

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Test Database

```bash
# Option A: Use Docker
docker-compose up -d postgres redis

# Option B: Use local PostgreSQL
# Ensure PostgreSQL is running on localhost:5432
```

### 3. Configure Environment

```bash
# Create .env file
cp .env.example .env

# Required:
DATABASE_URL=postgresql://lifeos:lifeos_dev_password@localhost:5432/lifeos_test
REDIS_URL=redis://localhost:6379

# Optional (for AI extraction tests):
GEMINI_API_KEY=your-key-here

# Optional (for email webhook tests):
MAILGUN_SIGNING_KEY=your-key-here
```

### 4. Run Migrations

```bash
cd packages/api
npm run db:migrate
npm run db:generate
```

### 5. Create Test Fixtures

**Important:** Some tests require PDF invoice files. See `fixtures/README.md` for:
- Creating sample PDFs
- Generating test invoices
- Using real invoices (anonymized)

## Running Tests

### All Tests

```bash
# Run all E2E tests
npm run test:e2e

# With UI (interactive mode)
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed
```

### Specific Test Files

```bash
# Invoice tests only
npx playwright test invoice.spec.ts

# Transaction tests only
npx playwright test transaction.spec.ts

# Matching tests only
npx playwright test matching.spec.ts

# System tests only
npx playwright test system.spec.ts
```

### Specific Tests

```bash
# Run tests matching pattern
npx playwright test -g "should import transactions"

# Run single test file with specific test
npx playwright test invoice.spec.ts -g "should upload invoice"
```

### Debug Mode

```bash
# Debug specific test
npx playwright test --debug invoice.spec.ts

# Debug with headed browser
npx playwright test --headed --debug
```

## Test Reports

### View HTML Report

```bash
npm run test:e2e:report
```

Opens interactive HTML report with:
- Test results and timings
- Screenshots on failures
- Traces for debugging
- Detailed logs

### CI Integration

Tests are configured for GitHub Actions:
- Automatic retries on failure
- Parallel execution disabled for consistency
- HTML report uploaded as artifact

## Test Coverage

### Invoice Tests (8 tests)
- ✅ Upload PDF invoice
- ✅ List invoices
- ✅ Get invoice by ID
- ✅ 404 for non-existent invoice
- ✅ Validate PDF file type
- ✅ Handle extraction errors
- ✅ Filter by status
- ✅ Pagination

### Transaction Tests (9 tests)
- ✅ Import Belgian bank CSV
- ✅ Detect duplicates on re-import
- ✅ List imported transactions
- ✅ Filter by reconciliation status
- ✅ Auto-categorize transactions
- ✅ Get transaction by ID
- ✅ 404 for non-existent transaction
- ✅ Get unreconciled transactions
- ✅ Preview CSV without saving

### Matching Tests (11 tests)
- ✅ Suggest matches for invoice
- ✅ Confirm manual match
- ✅ Update invoice to PAID
- ✅ Update transaction to RECONCILED
- ✅ Unmatch and revert statuses
- ✅ Prevent duplicate matches
- ✅ Calculate match scores
- ✅ Filter by minimum score
- ✅ Bulk match suggestions
- ✅ Get auto-matchable items
- ✅ Match statistics

### System Tests (12 tests)
- ✅ Main health endpoint
- ✅ API info endpoint
- ✅ 404 for non-existent routes
- ✅ Finance module health
- ✅ Database connectivity
- ✅ File storage accessibility
- ✅ Gemini API configuration
- ✅ Feature flags in metadata
- ✅ Validation error handling
- ✅ Malformed JSON handling
- ✅ Missing parameters handling
- ✅ Module routes mounted

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';
import { FinanceAPIClient } from './helpers/api-client';
import { cleanDatabase, seedTestUser } from './helpers/database';

test.describe('Feature Name', () => {
  let api: FinanceAPIClient;

  test.beforeEach(async ({ request }) => {
    // Clean database before each test
    await cleanDatabase();
    
    // Seed test data
    await seedTestUser();
    
    // Initialize API client
    api = new FinanceAPIClient(request);
  });

  test('should do something', async () => {
    // Arrange
    const data = { /* test data */ };

    // Act
    const response = await api.someMethod(data);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Best Practices

1. **Clean State** - Always clean database before each test
2. **Seed Data** - Create minimal required data
3. **Descriptive Names** - Test names should describe expected behavior
4. **AAA Pattern** - Arrange, Act, Assert structure
5. **Assertions** - Multiple specific assertions > one general assertion
6. **Skip Gracefully** - Skip tests that depend on missing fixtures

## Troubleshooting

### Tests Failing

**Database Connection**
```bash
# Check PostgreSQL is running
docker-compose ps

# Check connection string in .env
DATABASE_URL=postgresql://lifeos:lifeos_dev_password@localhost:5432/lifeos_test
```

**API Server Not Starting**
```bash
# Check logs
docker-compose logs api

# Verify health endpoint
curl http://localhost:3000/health
```

**Missing Fixtures**
```bash
# Some tests require PDF files
# See fixtures/README.md for setup
ls packages/api/tests/e2e/fixtures/*.pdf
```

### Slow Tests

```bash
# Run with more workers (parallel)
npx playwright test --workers=4

# Run specific slow test to debug
npx playwright test --debug slow-test.spec.ts
```

### Debugging Failures

```bash
# View trace for failed test
npx playwright show-trace trace.zip

# Run with video recording
npx playwright test --video=on

# Run with inspector
npx playwright test --debug
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Docker-based Testing

```bash
# Run tests in Docker container
docker-compose run --rm api npm run test:e2e
```

## Performance

### Execution Time

- **Invoice tests**: ~10-20 seconds
- **Transaction tests**: ~15-25 seconds
- **Matching tests**: ~20-30 seconds
- **System tests**: ~5-10 seconds

**Total**: ~50-85 seconds (without PDF fixtures)

### Optimization

- Tests run sequentially (more reliable)
- Database cleaned before each test
- Parallel execution disabled for consistency
- Retries enabled on CI

## Future Improvements

- [ ] Add webhook simulation tests (Mailgun)
- [ ] Add PDF generation for fixtures
- [ ] Add visual regression tests
- [ ] Add performance benchmarks
- [ ] Add load testing
- [ ] Add security tests (SQL injection, XSS)
- [ ] Add accessibility tests

## Support

- **Playwright Docs**: https://playwright.dev/
- **LifeOS Docs**: See `/docs` directory
- **Issues**: GitHub Issues

---

Last updated: 2025-01-21
