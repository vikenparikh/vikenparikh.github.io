import { test as base, expect } from "@playwright/test";

/**
 * Shared test fixture: neutralize the Cloudflare Web Analytics beacon.
 *
 * index.astro embeds https://static.cloudflareinsights.com/beacon.min.js. Behind
 * the production CDN it works, but when the built site is served from localhost
 * (preview mode) the beacon's RUM request to cloudflareinsights.com is CORS-
 * blocked and spams the console with net::ERR_FAILED — noise that has nothing to
 * do with the site's own correctness. Fulfilling the request with an empty 200
 * (+ permissive CORS) makes the beacon a no-op, so the console-error check stays
 * meaningful. Harmless in live mode too — we never test third-party analytics.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(/cloudflareinsights\.com/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        headers: { "access-control-allow-origin": "*" },
        body: "",
      }),
    );
    await use(page);
  },
});

export { expect };
