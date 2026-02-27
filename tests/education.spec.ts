import { test, expect } from '@playwright/test';

test.describe('Education Section', () => {
  test('should display Education heading', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h2').filter({ hasText: 'Education' }).first();
    await expect(heading).toBeVisible();
  });

  test('should list all education entries', async ({ page }) => {
    await page.goto('/');
    const entries = page.locator('.education-entry');
    await expect(entries).toHaveCount(2); // Update count if more/less
  });
});
