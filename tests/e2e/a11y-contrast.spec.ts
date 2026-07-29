import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Real-browser color-contrast audit — closes the one gap the jsdom axe suite
 * (src/__tests__/a11y.axe.test.ts) structurally cannot cover.
 *
 * That suite runs axe in jsdom, which has no layout/rendering engine, so it
 * MUST disable `color-contrast` (axe can't compute rendered colours without
 * layout). Contrast was therefore only verified by hand + design tokens.
 *
 * Here axe runs inside real Chromium (the same CI browser as the E2E smoke
 * suite), where computed styles exist — so `color-contrast` actually works.
 * Read-only: only GETs the deployed public pages, no writes/secrets. Scoped to
 * `color-contrast` alone; every other axe rule is already green in the (faster,
 * layout-independent) jsdom suite, so re-running them here would just duplicate.
 */

// The deployed content pages the jsdom suite audits, mirrored here so contrast
// is checked on the same surfaces — now with real rendered colours.
const PAGES = [
  { name: "homepage", path: "/" },
  { name: "writing index", path: "/writing/" },
];

test.describe("color-contrast (real browser)", () => {
  for (const { name, path } of PAGES) {
    test(`${name} has no color-contrast violations`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });

      const results = await new AxeBuilder({ page })
        .withRules(["color-contrast"])
        .analyze();

      // Surface offending nodes (selector + the failing colours) on failure.
      const detail = results.violations
        .flatMap((v) => v.nodes.map((n) => `  ${n.target.join(" ")} — ${n.failureSummary?.split("\n").pop()?.trim()}`))
        .join("\n");
      expect(results.violations, `color-contrast violations on ${name}:\n${detail}`).toEqual([]);
    });
  }
});
