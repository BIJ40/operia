import { test, expect } from '@playwright/test';
import { login, TEST_USERS, ROUTES, expectAccessDenied, expectAuthenticated, navigateAndSettle } from './fixtures/test-helpers';

test.describe('Role-based Permissions', () => {
  test('base_user cannot access admin area', async ({ page }) => {
    test.info().annotations.push({ type: 'smoke', description: 'critical-path' });

    await login(page, TEST_USERS.base_user.email, TEST_USERS.base_user.password);
    await navigateAndSettle(page, ROUTES.admin);
    await expectAccessDenied(page);
  });

  test('base_user cannot access user management', async ({ page }) => {
    await login(page, TEST_USERS.base_user.email, TEST_USERS.base_user.password);
    await navigateAndSettle(page, ROUTES.adminUsers);
    await expectAccessDenied(page);
  });

  test('franchisee_admin can access agency page', async ({ page }) => {
    test.info().annotations.push({ type: 'smoke', description: 'critical-path' });

    await login(page, TEST_USERS.franchisee_admin.email, TEST_USERS.franchisee_admin.password);
    await navigateAndSettle(page, ROUTES.agence);
    await expectAuthenticated(page);
  });

  test('platform_admin can access admin area', async ({ page }) => {
    await login(page, TEST_USERS.platform_admin.email, TEST_USERS.platform_admin.password);
    await navigateAndSettle(page, ROUTES.admin);
    await expectAuthenticated(page);
  });
});
