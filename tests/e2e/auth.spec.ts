import { test, expect } from '@playwright/test';
import { login, TEST_USERS, expectPath } from './fixtures/test-helpers';

test.describe('Authentication', () => {
  test('valid login redirects to workspace', async ({ page }) => {
    const user = TEST_USERS.franchisee_admin;
    await login(page, user.email, user.password);
    // Should not be on login page anymore
    expect(page.url()).not.toContain('/login');
  });

  test('invalid login shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Should stay on login or show error
    await page.waitForTimeout(3000);
    const hasError =
      page.url().includes('/login') ||
      (await page.textContent('body'))?.toLowerCase().includes('erreur') ||
      (await page.textContent('body'))?.toLowerCase().includes('incorrect');
    expect(hasError).toBeTruthy();
  });

  test('active session persists on reload', async ({ page }) => {
    const user = TEST_USERS.franchisee_admin;
    await login(page, user.email, user.password);
    const urlAfterLogin = page.url();
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Should not redirect back to login
    expect(page.url()).not.toContain('/login');
  });
});
