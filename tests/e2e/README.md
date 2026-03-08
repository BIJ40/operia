# Operia E2E Tests

End-to-end tests using Playwright for critical user journeys.

## Setup

```bash
npm install -D @playwright/test
npx playwright install
```

## Running tests

```bash
npx playwright test                    # All tests
npx playwright test tests/e2e/auth     # Auth tests only
npx playwright test --headed           # With browser UI
```

## Test structure

```
tests/e2e/
├── auth.spec.ts          # Login/session tests
├── permissions.spec.ts   # Role-based access tests
├── tickets.spec.ts       # Ticket workflow tests
├── admin-users.spec.ts   # User management tests
├── backup.spec.ts        # Export tests (JSON, TXT)
├── fixtures/
│   └── test-helpers.ts   # Shared utilities
└── playwright.config.ts  # Configuration
```

## Notes

- PDF exports are excluded (too fragile for E2E).
- Tests require a running instance with test users seeded.
- Use `seed-test-users` edge function to create test accounts.
