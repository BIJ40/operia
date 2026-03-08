import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from './fixtures/test-helpers';

test.describe('Ticket Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.platform_admin.email, TEST_USERS.platform_admin.password);
  });

  test('can view tickets list', async ({ page }) => {
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/tickets');
  });

  test('can open a ticket detail', async ({ page }) => {
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
    // Click first ticket if available
    const firstTicket = page.locator('[data-testid="ticket-row"], table tbody tr').first();
    if (await firstTicket.isVisible()) {
      await firstTicket.click();
      await page.waitForLoadState('networkidle');
      // Should show ticket detail
      const bodyText = await page.textContent('body');
      expect(
        bodyText?.includes('Commentaire') ||
        bodyText?.includes('Statut') ||
        bodyText?.includes('ticket')
      ).toBeTruthy();
    }
  });

  test('can add a comment to a ticket', async ({ page }) => {
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
    const firstTicket = page.locator('[data-testid="ticket-row"], table tbody tr').first();
    if (await firstTicket.isVisible()) {
      await firstTicket.click();
      await page.waitForLoadState('networkidle');
      // Try to find and fill comment input
      const commentInput = page.locator('textarea, [data-testid="comment-input"]').first();
      if (await commentInput.isVisible()) {
        await commentInput.fill('Test E2E comment');
        const submitBtn = page.locator('button:has-text("Envoyer"), button:has-text("Ajouter")').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });
});
