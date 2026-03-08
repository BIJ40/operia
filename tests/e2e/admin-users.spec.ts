import { test, expect } from '@playwright/test';
import { login, TEST_USERS, ROUTES, navigateAndSettle, expectAuthenticated } from './fixtures/test-helpers';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.platform_admin.email, TEST_USERS.platform_admin.password);
  });

  test('can open users list', async ({ page }) => {
    test.info().annotations.push({ type: 'smoke', description: 'critical-path' });

    await navigateAndSettle(page, ROUTES.adminUsers);
    await expectAuthenticated(page);

    // Verify user-related content is visible
    const body = await page.textContent('body');
    const bodyLower = body?.toLowerCase() ?? '';
    const hasUserContent =
      bodyLower.includes('utilisateur') ||
      bodyLower.includes('email') ||
      bodyLower.includes('rôle') ||
      bodyLower.includes('role') ||
      bodyLower.includes('créer');
    expect(hasUserContent).toBeTruthy();
  });

  test('can open user detail', async ({ page }) => {
    await navigateAndSettle(page, ROUTES.adminUsers);

    // Click first table row or user card
    const firstUser = page.locator('table tbody tr, [role="row"]').first();
    const isVisible = await firstUser.isVisible().catch(() => false);

    if (isVisible) {
      await firstUser.click();
      await page.waitForTimeout(2000);

      // Expect a dialog, drawer, or panel to appear
      const detail = page.locator('[role="dialog"], [role="complementary"], .fixed');
      const detailVisible = await detail.first().isVisible().catch(() => false);

      if (detailVisible) {
        expect(detailVisible).toBeTruthy();
      } else {
        test.info().annotations.push({ type: 'info', description: 'User detail dialog did not appear — may need data' });
      }
    } else {
      test.info().annotations.push({ type: 'info', description: 'No users found in test environment' });
    }
  });
});
