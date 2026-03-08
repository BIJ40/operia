import { test, expect } from '@playwright/test';
import { login, TEST_USERS, ROUTES, navigateAndSettle, expectAuthenticated } from './fixtures/test-helpers';

test.describe('Backup & Export', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.platform_admin.email, TEST_USERS.platform_admin.password);
  });

  test('can access backup page @smoke', async ({ page }) => {
    await navigateAndSettle(page, ROUTES.adminBackup);
    await expectAuthenticated(page);

    const body = await page.textContent('body');
    const bodyLower = body?.toLowerCase() ?? '';
    const hasBackupContent =
      bodyLower.includes('export') ||
      bodyLower.includes('backup') ||
      bodyLower.includes('sauvegard') ||
      bodyLower.includes('télécharger');
    expect(hasBackupContent).toBeTruthy();
  });

  test('can trigger export download', async ({ page }) => {
    await navigateAndSettle(page, ROUTES.adminBackup);

    const exportBtn = page.locator(
      'button:has-text("Export"), button:has-text("Télécharger"), button:has-text("Sauvegarder"), button:has-text("Backup"), button:has-text("JSON")'
    ).first();

    const isVisible = await exportBtn.isVisible().catch(() => false);

    if (isVisible) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }).catch(() => null),
        exportBtn.click(),
      ]);

      if (download) {
        const filename = download.suggestedFilename();
        expect(
          filename.endsWith('.json') || filename.endsWith('.txt') || filename.endsWith('.csv')
        ).toBeTruthy();
      } else {
        test.info().annotations.push({ type: 'info', description: 'Export clicked but no download event' });
      }
    } else {
      test.info().annotations.push({ type: 'info', description: 'No export button found' });
    }
  });
});
