import { test, expect } from '@playwright/test';

test.describe('Experience Section', () => {
  test('should display Experience heading', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h2').filter({ hasText: 'Experience' }).first();
    await expect(heading).toBeVisible();
  });

  test('should list all experience entries', async ({ page }) => {
    await page.goto('/');
    const entries = page.locator('.experience-entry');
    await expect(entries).toHaveCount(4); // Update count if more/less
  });
});
