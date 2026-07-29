import { type ConsoleMessage } from "@playwright/test";
import { test, expect } from "./fixtures";

/**
 * Read-only browser E2E for the deployed portfolio.
 *
 * NON-money, read-only: this only GETs the public site, asserts real content
 * renders in a real browser, checks the console is clean, and clicks one
 * in-page anchor. It never submits forms, mutates state, or uses secrets.
 */

// Console messages that are known-benign on a static portfolio and must not
// fail the suite. Kept deliberately narrow so genuine errors still surface.
const BENIGN_CONSOLE = [
  /favicon/i,
  /Failed to load resource: the server responded with a status of 404 \(Not Found\).*favicon/i,
];

function isBenign(text: string): boolean {
  return BENIGN_CONSOLE.some((re) => re.test(text));
}

test.describe("deployed portfolio", () => {
  test("loads with 200 and renders real content", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });

    // (a) page loads with a 2xx status
    expect(response, "navigation should return a response").not.toBeNull();
    expect(response!.status(), "homepage should return HTTP 200").toBe(200);

    // (b) real, stable content renders (from the live index.html)
    await expect(page).toHaveTitle(/Viken Parikh/i);
    await expect(
      page.getByRole("heading", { level: 1, name: /I'?m Viken Parikh/i }),
    ).toBeVisible();

    // Primary nav is present with its known anchors.
    const primaryNav = page.getByRole("navigation", { name: /primary/i });
    await expect(primaryNav).toBeVisible();
    await expect(
      primaryNav.getByRole("link", { name: "Projects" }),
    ).toBeVisible();

    // Key sections exist in the DOM.
    for (const id of ["about", "skills", "experience", "education", "projects"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test("has no non-benign console errors on load", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error" && !isBenign(msg.text())) {
        errors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      if (!isBenign(err.message)) errors.push(err.message);
    });

    await page.goto("/", { waitUntil: "networkidle" });

    expect(errors, `unexpected console errors: ${errors.join(" | ")}`).toEqual(
      [],
    );
  });

  test("read-only navigation: click Projects nav anchor scrolls to section", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const projectsSection = page.locator("#projects");
    await expect(projectsSection).toHaveCount(1);

    // Click the in-page Projects anchor in the primary nav (read-only).
    await page
      .getByRole("navigation", { name: /primary/i })
      .getByRole("link", { name: "Projects" })
      .click();

    // URL updates to the in-page anchor; the section becomes visible.
    await expect(page).toHaveURL(/#projects$/);
    await expect(projectsSection).toBeVisible();

    // Sanity: at least one known project repo link renders in the section.
    await expect(
      projectsSection.getByRole("link").first(),
    ).toBeVisible();
  });
});
