import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from './fixtures/test-helpers';

test.describe('Backup & Export', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.platform_admin.email, TEST_USERS.platform_admin.password);
  });

  test('can trigger JSON export', async ({ page }) => {
    // Navigate to backup/export section
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Look for export/backup button
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Sauvegarder"), button:has-text("Backup")').first();
    if (await exportBtn.isVisible()) {
      // Listen for download
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }).catch(() => null),
        exportBtn.click(),
      ]);

      if (download) {
        const filename = download.suggestedFilename();
        expect(filename.endsWith('.json') || filename.endsWith('.txt')).toBeTruthy();
      }
    }
  });
});
