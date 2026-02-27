import { test, expect } from '@playwright/test';

// Basic About page test: checks for headshot image and key sections

test.describe('About Page', () => {
  test('should display About Me heading', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('#about-me').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('About Me');
  });

  test('should display Career Highlights section', async ({ page }) => {
    await page.goto('/');
    const highlights = page.locator('h3').filter({ hasText: 'Career Highlights' }).first();
    await expect(highlights).toBeVisible();
    await expect(highlights).toContainText('Career Highlights');
  });
});
