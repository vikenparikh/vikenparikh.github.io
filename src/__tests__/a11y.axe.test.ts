import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
// @ts-expect-error - jsdom ships no bundled type declarations; it's a test-only util.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import Home from "../pages/index.astro";
import NotFound from "../pages/404.astro";
import WritingIndex from "../pages/writing/index.astro";

// Full axe-core accessibility audit of each rendered page. This complements the
// static audit-html.mjs gate (which checks a few unambiguous rules by regex)
// with the industry-standard engine's ~90 rules — ARIA usage, label
// associations, landmark structure, redundant alt text, list semantics, etc.
//
// axe runs inside a JSDOM window (its source is injected and evaluated there —
// the reliable node pattern). The vitest environment stays "node" so Astro's
// container renderer keeps working; JSDOM is used purely as a library.
//
// color-contrast is disabled: JSDOM has no layout engine, so it can't compute
// rendered colours — that rule would be unreliable here. Contrast is instead
// verified manually + by the design tokens; every other rule runs.
const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");

async function auditPage(Component: unknown) {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Component as never);
  const dom = new JSDOM(html, { runScripts: "outside-only" });
  dom.window.eval(axeSource);
  const results = await dom.window.axe.run(dom.window.document, {
    rules: { "color-contrast": { enabled: false } },
  });
  return results.violations;
}

// Turn any violations into a readable failure message (id + impact + a sample node).
function format(violations: Array<{ id: string; impact: string | null; help: string; nodes: Array<{ html: string }> }>) {
  return violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.help}\n    e.g. ${v.nodes[0]?.html?.slice(0, 140)}`)
    .join("\n");
}

describe("axe-core accessibility audit", () => {
  it("homepage has no axe violations", async () => {
    const v = await auditPage(Home);
    expect(v.length, `homepage a11y violations:\n${format(v)}`).toBe(0);
  }, 30000);

  it("404 page has no axe violations", async () => {
    const v = await auditPage(NotFound);
    expect(v.length, `404 a11y violations:\n${format(v)}`).toBe(0);
  }, 30000);

  it("writing index has no axe violations", async () => {
    const v = await auditPage(WritingIndex);
    expect(v.length, `writing-index a11y violations:\n${format(v)}`).toBe(0);
  }, 30000);
});
