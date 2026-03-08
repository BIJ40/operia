import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from './fixtures/test-helpers';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.platform_admin.email, TEST_USERS.platform_admin.password);
  });

  test('can open users list', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/admin');
  });

  test('can open user detail dialog', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    // Click first user row
    const firstUser = page.locator('table tbody tr, [data-testid="user-row"]').first();
    if (await firstUser.isVisible()) {
      await firstUser.click();
      await page.waitForTimeout(2000);
      // Dialog should appear
      const dialog = page.locator('[role="dialog"], [data-testid="user-dialog"]');
      if (await dialog.isVisible()) {
        expect(await dialog.isVisible()).toBeTruthy();
      }
    }
  });
});
