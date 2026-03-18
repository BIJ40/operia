import { Page, expect } from '@playwright/test';

/**
 * Test user credentials — must match seed-test-users edge function.
 * These users must be seeded before running E2E tests.
 */
export const TEST_USERS = {
  base_user: {
    email: 'test-n1@helpconfort.test',
    password: 'Test1234!',
    role: 'franchisee_user',
  },
  franchisee_admin: {
    email: 'test-n2@helpconfort.test',
    password: 'Test1234!',
    role: 'franchisee_admin',
  },
  platform_admin: {
    email: 'test-n5@helpconfort.test',
    password: 'Test1234!',
    role: 'platform_admin',
  },
} as const;

/**
 * Real app routes — centralized to avoid stale selectors.
 * Updated to match the unified workspace routing (/?tab=...).
 */
export const ROUTES = {
  login: '/login',
  home: '/',
  admin: '/?tab=admin',
  adminUsers: '/?tab=admin&adminTab=acces&adminView=users',
  adminBackup: '/?tab=admin&adminTab=ops&adminView=backup',
  ticketsKanban: '/projects/kanban',
  agence: '/agence',
  unauthorized: '/401',
} as const;

/**
 * Login helper — fills email/password and submits.
 * Waits for navigation away from /login with a generous timeout.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto(ROUTES.login);
  await page.waitForLoadState('domcontentloaded');

  // Wait for the login form to be interactive
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });

  await emailInput.fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
}

/**
 * Assert the page is NOT on an error/denied route.
 */
export async function expectAuthenticated(page: Page) {
  const url = page.url();
  expect(url).not.toContain('/login');
  expect(url).not.toContain('/401');
  expect(url).not.toContain('/403');
}

/**
 * Assert page shows access denied (redirect to /401, /403, /login, or body contains denial text).
 */
export async function expectAccessDenied(page: Page) {
  // Give the app time to redirect or render denial
  await page.waitForLoadState('domcontentloaded');
  // Small wait for client-side role checks/redirects
  await page.waitForTimeout(2000);

  const url = page.url();
  const body = await page.textContent('body');
  const bodyLower = body?.toLowerCase() ?? '';

  const denied =
    url.includes('/401') ||
    url.includes('/403') ||
    url.includes('/login') ||
    url.includes('/unauthorized') ||
    bodyLower.includes('accès refusé') ||
    bodyLower.includes('non autorisé') ||
    bodyLower.includes('accès interdit') ||
    bodyLower.includes('pas les droits');

  expect(denied).toBeTruthy();
}

/**
 * Navigate and wait for the page to settle (domcontentloaded + short network quiet).
 */
export async function navigateAndSettle(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  // Brief wait for async data to load
  await page.waitForTimeout(1500);
}
