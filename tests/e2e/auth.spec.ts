import { test, expect } from '@playwright/test';
import { login, TEST_USERS, ROUTES, expectAuthenticated } from './fixtures/test-helpers';

test.describe('Authentication', () => {
  test('valid login redirects to workspace', async ({ page }) => {
    test.info().annotations.push({ type: 'smoke', description: 'critical-path' });

    const user = TEST_USERS.franchisee_admin;
    await login(page, user.email, user.password);
    await expectAuthenticated(page);
  });

  test('invalid login stays on login page', async ({ page }) => {
    test.info().annotations.push({ type: 'smoke', description: 'critical-path' });

    await page.goto(ROUTES.login);
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[type="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // Wait a moment then verify we're still on login
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });

  test('active session persists on reload', async ({ page }) => {
    const user = TEST_USERS.franchisee_admin;
    await login(page, user.email, user.password);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expectAuthenticated(page);
  });
});
