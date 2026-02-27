import { test, expect } from '@playwright/test';

test.describe('Projects Section', () => {
  test('should display Projects heading', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h2').filter({ hasText: 'Projects' }).first();
    await expect(heading).toBeVisible();
  });

  test('should list all project cards', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.project-card');
    await expect(cards).toHaveCount(6); // Update count if more/less
  });
});
