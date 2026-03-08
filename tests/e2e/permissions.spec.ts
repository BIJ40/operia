import { test, expect } from '@playwright/test';
import { login, TEST_USERS, expectAccessDenied } from './fixtures/test-helpers';

test.describe('Role-based Permissions', () => {
  test('base_user cannot access admin pages', async ({ page }) => {
    const user = TEST_USERS.base_user;
    await login(page, user.email, user.password);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expectAccessDenied(page);
  });

  test('base_user cannot access user management', async ({ page }) => {
    const user = TEST_USERS.base_user;
    await login(page, user.email, user.password);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expectAccessDenied(page);
  });

  test('franchisee_admin can access agency page', async ({ page }) => {
    const user = TEST_USERS.franchisee_admin;
    await login(page, user.email, user.password);
    await page.goto('/agence');
    await page.waitForLoadState('networkidle');
    // Should not be redirected away
    expect(page.url()).not.toContain('/login');
    expect(page.url()).not.toContain('/unauthorized');
  });

  test('platform_admin can access admin pages', async ({ page }) => {
    const user = TEST_USERS.platform_admin;
    await login(page, user.email, user.password);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/unauthorized');
    expect(page.url()).not.toContain('/login');
  });
});
