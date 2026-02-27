// @ts-check
/**
 * Playwright Test Configuration
 * See https://playwright.dev/docs/test-configuration
 */
import { defineConfig } from '@playwright/test';

const PORT = process.env.PORT || '4322';
export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}/`,
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npm run dev',
    port: Number(PORT),
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
