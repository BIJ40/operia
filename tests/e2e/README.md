# Operia E2E Tests

End-to-end tests using Playwright for critical user journeys.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browser
npx playwright install chromium

# 3. Start dev server (in a separate terminal)
npm run dev

# 4. Run all E2E tests
npm run test:e2e

# 5. Run smoke tests only (fastest, pre-publish validation)
npm run test:e2e:smoke
```

## Test Suites

| Suite | File | Tests | Smoke | Description |
|-------|------|-------|-------|-------------|
| Auth | `auth.spec.ts` | 3 | 2 | Login, invalid login, session persistence |
| Permissions | `permissions.spec.ts` | 4 | 2 | Role-based access control |
| Tickets | `tickets.spec.ts` | 2 | 0 | Kanban view, ticket detail |
| Admin Users | `admin-users.spec.ts` | 2 | 1 | User list, user detail |
| Backup | `backup.spec.ts` | 2 | 1 | Backup page access, export download |

**Total: 13 tests, 6 smoke tests**

## Prerequisites

### Test Users (required)

Three test accounts must exist in the Supabase Auth system:

| Email | Password | Role |
|-------|----------|------|
| `test-base@operia.dev` | `TestBase2024!` | `base_user` |
| `test-admin@operia.dev` | `TestAdmin2024!` | `franchisee_admin` |
| `test-platform@operia.dev` | `TestPlatform2024!` | `platform_admin` |

**Seed them** using the `seed-test-users` Edge Function:

```bash
curl -X POST https://qvrankgpfltadxegeiky.supabase.co/functions/v1/seed-test-users \
  -H "Authorization: Bearer <admin_jwt>" \
  -H "Content-Type: application/json"
```

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BASE_URL` | `http://localhost:5173` | App URL to test against |
| `CI` | — | Enables retries (2) and forbids `.only` |

## Commands

```bash
# All tests
npm run test:e2e

# Smoke tests only (6 critical-path tests)
npm run test:e2e:smoke

# With browser visible
npx playwright test --config tests/e2e/playwright.config.ts --headed

# Interactive UI mode
npx playwright test --config tests/e2e/playwright.config.ts --ui

# Single suite
npx playwright test --config tests/e2e/playwright.config.ts tests/e2e/auth.spec.ts

# Against staging
E2E_BASE_URL=https://operiav2.lovable.app npm run test:e2e:smoke
```

## Debugging Failures

1. Check the HTML report: `npx playwright show-report`
2. Screenshots are captured on failure in `test-results/`
3. Traces are captured on first retry — open with `npx playwright show-trace <trace.zip>`
4. Run with `--headed --slowmo=500` to watch the test execute

## Architecture

```
tests/e2e/
├── fixtures/
│   └── test-helpers.ts     # Shared: login, routes, assertions
├── auth.spec.ts            # Authentication flows
├── permissions.spec.ts     # RBAC enforcement
├── tickets.spec.ts         # Ticket viewing
├── admin-users.spec.ts     # User management
├── backup.spec.ts          # Export/backup
└── playwright.config.ts    # Configuration
```

### Design Principles

- **Routes centralized** in `test-helpers.ts` → single place to update if routing changes
- **No `data-testid` dependency** → tests use semantic selectors (roles, text, HTML structure)
- **Graceful degradation** → data-dependent tests annotate instead of failing when no data exists
- **Smoke subset** → `@smoke` tag in test titles for quick pre-publish validation
