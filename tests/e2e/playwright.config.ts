import { defineConfig, devices } from "@playwright/test";

/**
 * Read-only E2E config for the portfolio. Two modes:
 *
 *  - PREVIEW (E2E_PREVIEW=1): serve the freshly-BUILT site from ./_site and test
 *    THIS revision. Used on PRs/pushes so the smoke + contrast suites actually
 *    gate the change — otherwise they'd pass against the already-deployed site
 *    and give false pre-merge confidence.
 *  - LIVE (default): target https://vikenparikh.com — the deployed-site monitor
 *    run on a schedule / manual dispatch.
 *
 * E2E_BASE_URL overrides the target explicitly if ever needed.
 */
const preview = !!process.env.E2E_PREVIEW;
const PREVIEW_URL = "http://127.0.0.1:4321";
const baseURL = process.env.E2E_BASE_URL ?? (preview ? PREVIEW_URL : "https://vikenparikh.com");

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
  // Preview mode only: serve the built artifact (downloaded to ./_site in CI)
  // on a local static server that Playwright starts and tears down. Live mode
  // needs no server. `-s` = silent, bound to loopback only.
  webServer: preview
    ? {
        command: "npx http-server _site -p 4321 -a 127.0.0.1 -s -c-1",
        url: PREVIEW_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      }
    : undefined,
});
