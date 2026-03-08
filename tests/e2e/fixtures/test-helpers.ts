import { Page, expect } from '@playwright/test';

/**
 * Test user credentials — must match seed-test-users edge function
 */
export const TEST_USERS = {
  base_user: {
    email: 'test-base@operia.dev',
    password: 'TestBase2024!',
    role: 'base_user',
  },
  franchisee_admin: {
    email: 'test-admin@operia.dev',
    password: 'TestAdmin2024!',
    role: 'franchisee_admin',
  },
  platform_admin: {
    email: 'test-platform@operia.dev',
    password: 'TestPlatform2024!',
    role: 'platform_admin',
  },
} as const;

/**
 * Login helper — fills email/password and submits
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

/**
 * Assert current URL matches expected path
 */
export async function expectPath(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(path));
}

/**
 * Assert page shows access denied or redirects to unauthorized
 */
export async function expectAccessDenied(page: Page) {
  // The app may redirect to /unauthorized or show an error
  const url = page.url();
  const content = await page.textContent('body');
  const denied =
    url.includes('/unauthorized') ||
    url.includes('/login') ||
    (content?.toLowerCase().includes('accès refusé') ?? false) ||
    (content?.toLowerCase().includes('non autorisé') ?? false);
  expect(denied).toBeTruthy();
}
