import { describe, it, expect } from "vitest";
// The gate is load-bearing (runs on every PR, caught the #89 h2-before-h1 class).
// Import its pure rules and prove each one actually fires — a regex that silently
// regressed to always-passing would remove the protection with nothing to catch it.
import { rules, auditHtml } from "../../scripts/audit-html.mjs";

// A minimal page that satisfies every rule.
const GOOD = `<!doctype html><html lang="en"><head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="A real description." />
<link rel="canonical" href="https://vikenparikh.com/" />
<title>Title</title></head><body>
<h1>Heading</h1>
<h2>Section</h2>
<img src="/a.png" alt="a" />
<a href="https://x.com" target="_blank" rel="noopener">x</a>
<a href="#sec">jump</a>
<section id="sec">s</section>
</body></html>`;

// For each rule: a mutation of GOOD that should trip exactly that rule.
const BAD: Record<string, string> = {
  "html-lang": GOOD.replace('<html lang="en">', "<html>"),
  title: GOOD.replace(/<title>.*?<\/title>/, ""),
  "meta-description": GOOD.replace(/<meta name="description"[^>]*>/, ""),
  viewport: GOOD.replace(/<meta name="viewport"[^>]*>/, ""),
  canonical: GOOD.replace(/<link rel="canonical"[^>]*>/, ""),
  h1: GOOD.replace("<h1>Heading</h1>", "<h1>One</h1><h1>Two</h1>"), // two h1s
  "heading-outline": GOOD.replace("<h1>Heading</h1>", "<h2>Before</h2><h1>Heading</h1>"),
  "img-alt": GOOD.replace('<img src="/a.png" alt="a" />', '<img src="/a.png" />'),
  "blank-noopener": GOOD.replace('target="_blank" rel="noopener"', 'target="_blank"'),
  "dead-anchor": GOOD.replace('<section id="sec">s</section>', "<section>s</section>"),
};

describe("audit-html gate rules", () => {
  it("passes a well-formed page cleanly (no false positives)", () => {
    expect(auditHtml(GOOD)).toEqual([]);
    for (const [name, rule] of Object.entries(rules)) {
      expect(rule(GOOD), `${name} should not fire on a good page`).toEqual([]);
    }
  });

  it("every rule fires on a page that violates it", () => {
    for (const [name, rule] of Object.entries(rules)) {
      const bad = BAD[name];
      expect(bad, `missing BAD fixture for rule "${name}"`).toBeDefined();
      expect(rule(bad).length, `rule "${name}" failed to flag its violation`).toBeGreaterThan(0);
    }
  });

  it("has a BAD fixture for every registered rule (no rule left unverified)", () => {
    expect(Object.keys(BAD).sort()).toEqual(Object.keys(rules).sort());
  });

  it("exempts noindex pages from the canonical requirement (e.g. 404)", () => {
    const noindexNoCanonical = GOOD.replace(/<link rel="canonical"[^>]*>/, "").replace(
      "<head>",
      '<head><meta name="robots" content="noindex" />'
    );
    expect(rules.canonical(noindexNoCanonical)).toEqual([]);
  });
});
