# Operia E2E Tests

End-to-end tests using Playwright for critical user journeys.

## Setup

```bash
# 1. Install Playwright (dev dependency already in package.json)
npm install

# 2. Install browsers
npx playwright install chromium

# 3. Seed test users (requires running Supabase + superadmin)
# The edge function seed-test-users creates 3 accounts:
#   - test-base@operia.dev      (base_user)
#   - test-admin@operia.dev     (franchisee_admin)
#   - test-platform@operia.dev  (platform_admin)
# 
# Execute via Supabase dashboard or curl:
# curl -X POST https://<project>.supabase.co/functions/v1/seed-test-users \
#   -H "Authorization: Bearer <admin_jwt>" \
#   -H "Content-Type: application/json"
```

## Running tests

```bash
# Start dev server first
npm run dev

# In another terminal:
npm run test:e2e                       # All tests
npx playwright test tests/e2e/auth     # Auth tests only
npx playwright test --headed           # With browser UI
npx playwright test --ui               # Interactive UI mode

# With custom base URL (e.g. staging):
E2E_BASE_URL=https://staging.operia.app npm run test:e2e
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BASE_URL` | `http://localhost:5173` | App URL to test against |
| `CI` | — | Set in CI to enable retries (2) and forbid `.only` |

## Test structure

```
tests/e2e/
├── auth.spec.ts          # Login/session tests
├── permissions.spec.ts   # Role-based access tests
├── tickets.spec.ts       # Ticket workflow tests
├── admin-users.spec.ts   # User management tests
├── backup.spec.ts        # Export tests (JSON, TXT)
├── fixtures/
│   └── test-helpers.ts   # Shared utilities (login, assertions)
└── playwright.config.ts  # Configuration
```

## Prerequisites checklist

Before running E2E tests:

- [ ] `npm install` done (Playwright in devDependencies)
- [ ] `npx playwright install chromium` done
- [ ] Dev server running (`npm run dev`)
- [ ] Test users seeded via `seed-test-users` edge function
- [ ] Supabase project accessible

## Notes

- PDF exports are excluded (too fragile for E2E).
- Tests run sequentially (`workers: 1`) to avoid auth conflicts.
- Screenshots are captured on failure in `test-results/`.
- Traces are captured on first retry for debugging.
