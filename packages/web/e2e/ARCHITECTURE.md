# E2E Test Architecture

## Test Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TEST SUITES LAYER                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │  Budget  │  │Envelopes │  │ Expenses │   │
│  │  Tests   │  │  Today   │  │  Tests   │  │  Tests   │   │
│  │          │  │  Tests   │  │          │  │          │   │
│  │ 7 tests  │  │ 10 tests │  │ 16 tests │  │ 15 tests │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │              │         │
│       └─────────────┴──────────────┴──────────────┘         │
│                            │                                │
│                  ┌─────────▼──────────┐                     │
│                  │  End-to-End Tests  │                     │
│                  │   6 Workflows      │                     │
│                  └─────────┬──────────┘                     │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    FIXTURES LAYER                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              auth.ts (Fixtures)                     │   │
│  │                                                      │   │
│  │  ┌──────────────────┐  ┌──────────────────────┐   │   │
│  │  │  Authentication  │  │  API Helpers         │   │   │
│  │  │  • login()       │  │  • authenticatedReq()│   │   │
│  │  │  • getToken()    │  │  • API_CONFIG        │   │   │
│  │  │  • setToken()    │  │                      │   │   │
│  │  └──────────────────┘  └──────────────────────┘   │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │        Extended Test Fixtures                │  │   │
│  │  │  • authenticatedContext (auto-login)         │  │   │
│  │  │  • authToken (provides token)                │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  APPLICATION LAYER                          │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │   API Server     │              │    Web App       │    │
│  │  localhost:4000  │              │  localhost:3000  │    │
│  │                  │              │                  │    │
│  │  Endpoints:      │              │  Routes:         │    │
│  │  • /auth/login   │              │  • /finance      │    │
│  │  • /budget/today │              │  • /envelopes    │    │
│  │  • /envelopes    │              │                  │    │
│  │  • /expenses     │              │                  │    │
│  └────────┬─────────┘              └────────┬─────────┘    │
└───────────┼──────────────────────────────────┼──────────────┘
            │                                  │
┌───────────▼──────────────────────────────────▼──────────────┐
│                     DATA LAYER                              │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │    Database      │              │   Test User      │    │
│  │   PostgreSQL     │              │                  │    │
│  │                  │              │  Email:          │    │
│  │  Tables:         │              │   test@ex.com    │    │
│  │  • users         │              │  Password:       │    │
│  │  • budgets       │◄─────────────│   Password123    │    │
│  │  • expenses      │              │                  │    │
│  │  • envelopes     │              │  Budget: 2000€   │    │
│  └──────────────────┘              └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Test Flow Diagram

```
┌──────────────┐
│  Test Suite  │
│   Starts     │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Use auth fixture │ ─────► authenticatedContext
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  login() called  │ ─────► Checks token cache
└──────┬───────────┘
       │
       ▼
┌──────────────────┐        No token cached
│  Token cached?   │───────────────────┐
└──────┬───────────┘                   │
       │                               ▼
       │ Yes                    ┌──────────────────┐
       │                        │ POST /auth/login │
       │                        │  with test user  │
       │                        └──────┬───────────┘
       │                               │
       │                               ▼
       │                        ┌──────────────────┐
       │                        │  Store token in  │
       │                        │  memory cache    │
       │                        └──────┬───────────┘
       │                               │
       └───────────────────────────────┘
                    │
                    ▼
          ┌─────────────────┐
          │ Test executes   │
          │ with auth token │
          └─────────┬───────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌────────────────┐
│   API Calls   │      │   Page Tests   │
│ (with token)  │      │ (authenticated)│
└───────┬───────┘      └────────┬───────┘
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
          ┌─────────────────┐
          │  Assertions     │
          │   Validate:     │
          │  • Response     │
          │  • Data         │
          │  • UI State     │
          └─────────────────┘
```

## Test Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  CREATE EXPENSE TEST                        │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
    ┌──────────────────┐
    │ 1. Get Initial   │
    │    Budget State  │────► spentToday = 100€
    └────────┬─────────┘      remainingToday = 50€
             │
             ▼
    ┌──────────────────┐
    │ 2. Get Initial   │
    │ Envelope State   │────► groceries.spent = 250€
    └────────┬─────────┘      groceries.remaining = 150€
             │
             ▼
    ┌──────────────────┐
    │ 3. Create        │
    │    Expense       │────► amount = 25€
    └────────┬─────────┘      category = groceries
             │
             ▼
    ┌──────────────────┐
    │ 4. Verify Budget │
    │    Updated       │────► spentToday = 125€ (100 + 25)
    └────────┬─────────┘      remainingToday = 25€ (50 - 25)
             │
             ▼
    ┌──────────────────┐
    │ 5. Verify        │
    │ Envelope Updated │────► groceries.spent = 275€ (250 + 25)
    └────────┬─────────┘      groceries.remaining = 125€ (150 - 25)
             │
             ▼
    ┌──────────────────┐
    │ 6. Verify UI     │
    │    Shows Change  │────► Transaction appears
    └──────────────────┘      Progress bar updates
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                      TEST COMPONENTS                        │
└─────────────────────────────────────────────────────────────┘

auth.spec.ts                     Uses: login(), setToken()
    │
    ├─► Tests authentication     Verifies: Token storage
    │                                      API authorization
    │
    └─► Outputs: Valid auth token


budget-today.spec.ts            Uses: authenticatedRequest()
    │
    ├─► Tests GET /budget/today  Verifies: Daily calculations
    │                                      Monthly tracking
    │                                      On-track status
    │
    └─► Outputs: Budget validation


envelopes.spec.ts               Uses: authenticatedRequest()
    │                                   page.goto()
    ├─► Tests GET /envelopes     Verifies: 9 categories
    │        + UI page                     Status indicators
    │                                      Progress bars
    │                                      Recent transactions
    │
    └─► Outputs: Envelope validation


expenses.spec.ts                Uses: authenticatedRequest()
    │
    ├─► Tests POST /expenses     Verifies: Validation rules
    │                                      Budget updates
    │                                      Envelope updates
    │
    └─► Outputs: Expense creation + side effects


end-to-end.spec.ts              Uses: All above components
    │
    ├─► Tests full workflows     Verifies: Complete user journeys
    │                                      State transitions
    │                                      Multi-step processes
    │
    └─► Outputs: Integration validation
```

## Test Execution Flow

```
Start Test Run
      │
      ▼
┌──────────────┐
│ playwright.  │
│  config.ts   │───► Loads configuration
└──────┬───────┘     Sets base URLs
       │             Configures browsers
       │
       ▼
┌──────────────┐
│  Start Web   │───► npm run dev
│   Server      │     (if not running)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Load Fixture │───► Import fixtures/auth.ts
│   auth.ts    │     Set up test context
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Run Test    │
│   Suite 1    │───► auth.spec.ts (7 tests)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Run Test    │
│   Suite 2    │───► budget-today.spec.ts (10 tests)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Run Test    │
│   Suite 3    │───► envelopes.spec.ts (16 tests)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Run Test    │
│   Suite 4    │───► expenses.spec.ts (15 tests)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Run Test    │
│   Suite 5    │───► end-to-end.spec.ts (6 workflows)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Generate    │
│   Report     │───► HTML report
└──────────────┘     Test results
                     Screenshots (on failure)
                     Traces (on retry)
```

## Authentication Flow

```
┌────────────────────────────────────────────────────────────┐
│              AUTHENTICATION MECHANISM                      │
└────────────────────────────────────────────────────────────┘

 Test Start
      │
      ▼
┌─────────────┐
│ First API   │
│ Call Needed │
└──────┬──────┘
       │
       ▼
┌─────────────────┐        ┌──────────────┐
│ Token exists in │───Yes──│ Use cached   │
│ memory cache?   │        │    token     │
└──────┬──────────┘        └──────┬───────┘
       │                          │
       No                         │
       │                          │
       ▼                          │
┌─────────────────┐              │
│ POST /auth/     │              │
│ login           │              │
│                 │              │
│ Body:           │              │
│  email: test@   │              │
│  password: P123 │              │
└──────┬──────────┘              │
       │                          │
       ▼                          │
┌─────────────────┐              │
│ Response:       │              │
│ { token: "..." }│              │
└──────┬──────────┘              │
       │                          │
       ▼                          │
┌─────────────────┐              │
│ Store in memory │              │
│ cache (global)  │              │
└──────┬──────────┘              │
       │                          │
       └──────────────────────────┘
                   │
                   ▼
          ┌────────────────┐
          │ Add to headers │
          │ Authorization: │
          │ Bearer {token} │
          └────────┬───────┘
                   │
                   ▼
          ┌────────────────┐
          │ Make API Call  │
          └────────────────┘
```

## Parallel Test Execution

```
┌────────────────────────────────────────────────────────────┐
│            PARALLEL EXECUTION (Default Mode)               │
└────────────────────────────────────────────────────────────┘

                    Test Runner
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐     ┌─────────┐     ┌─────────┐
   │ Worker 1│     │ Worker 2│     │ Worker 3│
   │         │     │         │     │         │
   │ auth    │     │ budget  │     │envelope │
   │ .spec   │     │ -today  │     │ .spec   │
   │         │     │ .spec   │     │         │
   │ 7 tests │     │10 tests │     │16 tests │
   └────┬────┘     └────┬────┘     └────┬────┘
        │               │               │
        │  All tests    │  All tests    │  All tests
        │  independent  │  independent  │  independent
        │  & rerunnable │  & rerunnable │  & rerunnable
        │               │               │
        └───────────────┴───────────────┘
                        │
                        ▼
                  Test Results
                   Combined

Note: Each worker gets its own:
- Browser context
- Auth token (cached independently)
- Network state
- Storage state
```

## File Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                   FILE DEPENDENCIES                         │
└─────────────────────────────────────────────────────────────┘

auth.spec.ts
    │
    └──► fixtures/auth.ts
           │
           └──► @playwright/test

budget-today.spec.ts
    │
    ├──► fixtures/auth.ts
    │      │
    │      └──► authenticatedRequest()
    │
    └──► @playwright/test

envelopes.spec.ts
    │
    ├──► fixtures/auth.ts
    │      │
    │      ├──► authenticatedRequest()
    │      └──► test (extended)
    │
    └──► @playwright/test

expenses.spec.ts
    │
    ├──► fixtures/auth.ts
    │      │
    │      └──► authenticatedRequest()
    │
    └──► @playwright/test

end-to-end.spec.ts
    │
    ├──► fixtures/auth.ts
    │      │
    │      ├──► login()
    │      ├──► authenticatedRequest()
    │      └──► test (extended)
    │
    └──► @playwright/test
```

---

**Last Updated:** 2025-10-18
