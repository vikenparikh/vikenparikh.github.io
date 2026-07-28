// Static HTML-quality gate. Scans the BUILT site (dist/) for a small set of
// accessibility / SEO / security defects that are invisible to `astro check`
// and to the render tests because they only manifest in the final composed
// document. This is the check that would have caught, on a schedule:
//
//   - PR #89: an <h2> greeting rendered before the <h1>, breaking the outline.
//
// Every rule here is deliberately unambiguous (attribute present / absent,
// count, DOM order) so it never false-alarms on legitimate markup — the same
// conservatism as check-links.mjs. Ancestor-relative rules (e.g. an input
// hidden by an aria-hidden wrapper — the honeypot) are intentionally NOT
// automated here, since reliably resolving them needs a real DOM parser.
//
// Usage: npx astro build && node scripts/audit-html.mjs
// Exit 0 if every page is clean, 1 otherwise.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

// Each rule returns an array of human-readable problem strings for one page.
// Exported so the gate's own correctness is unit-tested — a regex rule that
// silently regressed to always-passing would kill the protection unnoticed.
export const rules = {
  "html-lang": (h) => (/<html\b[^>]*\slang=/.test(h) ? [] : ["<html> is missing a lang attribute"]),

  title: (h) => {
    const m = h.match(/<title>([\s\S]*?)<\/title>/);
    return m && m[1].trim() ? [] : ["missing or empty <title>"];
  },

  "meta-description": (h) =>
    /<meta\b[^>]*name="description"[^>]*content="[^"]/.test(h) ? [] : ["missing <meta name=\"description\">"],

  // Lighthouse SEO audit: a mobile-friendly page needs a viewport meta.
  viewport: (h) =>
    /<meta\b[^>]*name="viewport"/.test(h) ? [] : ['missing <meta name="viewport">'],

  // Lighthouse SEO audit ("Document does not have a valid rel=canonical"): every
  // *indexable* page needs a canonical link. noindex pages (e.g. 404) are exempt.
  canonical: (h) => {
    const noindex = /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/.test(h);
    if (noindex) return [];
    return /<link\b[^>]*rel="canonical"/.test(h) ? [] : ['indexable page missing <link rel="canonical">'];
  },

  h1: (h) => {
    const n = [...h.matchAll(/<h1\b/g)].length;
    if (n === 0) return ["no <h1> on the page"];
    if (n > 1) return [`${n} <h1> elements (expected exactly one)`];
    return [];
  },

  "heading-outline": (h) => {
    const first = h.match(/<h([1-6])\b/);
    // A lower-level heading before the <h1> breaks the document outline.
    return first && Number(first[1]) !== 1
      ? [`the first heading in document order is an <h${first[1]}>, not the <h1>`]
      : [];
  },

  "img-alt": (h) => {
    const bad = [...h.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((t) => !/\balt=/.test(t));
    return bad.map((t) => `<img> without an alt attribute: ${t.slice(0, 80)}`);
  },

  "blank-noopener": (h) => {
    const bad = [...h.matchAll(/<a\b([^>]*\btarget="_blank"[^>]*)>/g)]
      .filter(([, attrs]) => !/\brel="[^"]*noopener/.test(attrs))
      .map(([full]) => full);
    return bad.map((t) => `target="_blank" without rel="noopener": ${t.slice(0, 90)}`);
  },

  "dead-anchor": (h) => {
    const ids = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const names = new Set([...h.matchAll(/\sname="([^"]+)"/g)].map((m) => m[1]));
    const targets = [...h.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    return targets
      .filter((t) => !ids.has(t) && !names.has(t))
      .map((t) => `in-page link to #${t} has no matching id/name`);
  },
};

// Run every rule against one page's HTML; returns the flat list of issues.
export function auditHtml(html) {
  return Object.values(rules).flatMap((rule) => rule(html));
}

function main() {
  if (!existsSync("dist")) {
    console.error("audit-html: dist/ not found — run `npx astro build` first.");
    process.exit(1);
  }
  let failed = 0;
  for (const file of walk("dist")) {
    const issues = auditHtml(readFileSync(file, "utf8"));
    if (issues.length) {
      failed += issues.length;
      console.log(`⚠ ${file}`);
      for (const i of issues) console.log(`    - ${i}`);
    } else {
      console.log(`✓ ${file}`);
    }
  }
  if (failed) {
    console.error(`\naudit-html: FAILED — ${failed} issue(s) across the built site.`);
    process.exit(1);
  }
  console.log("\naudit-html: OK — every built page passed the HTML-quality gate.");
}

// Only run the CLI when invoked directly, so importing this module for tests is
// side-effect-free (no dist read, no process.exit).
if (import.meta.url === `file://${process.argv[1]}`) main();
