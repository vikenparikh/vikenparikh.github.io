import { defineConfig, devices } from "@playwright/test";

/**
 * Read-only E2E config for the DEPLOYED portfolio.
 *
 * Targets the live public site (no local server, no build step, no secrets).
 * Override the target with E2E_BASE_URL if you ever need to point at a preview
 * deploy, e.g. `E2E_BASE_URL=https://vikenparikh.github.io npx playwright test`.
 */
const baseURL = process.env.E2E_BASE_URL ?? "https://vikenparikh.com";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    // Read-only smoke run; a generous but bounded per-action timeout.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
