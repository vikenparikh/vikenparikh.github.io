// Structured-data (JSON-LD) validation gate. Scans the BUILT site (dist/) for
// every <script type="application/ld+json"> block and checks it is (a) valid
// JSON and (b) has the schema.org fields rich results actually need. This is a
// class nothing else covers: the buildArticleLd helper is unit-tested, but the
// homepage's *inline* Person LD has zero coverage, and nothing validates the
// JSON as EMITTED — a broken set:html interpolation or a dropped required field
// would ship silently and quietly degrade Google rich results.
//
// Deliberately conservative, like audit-html.mjs / check-links.mjs: it only
// flags unambiguous defects (unparseable JSON, missing @context/@type, a
// missing type-required field) so it never false-alarms on valid markup.
//
// Usage: npx astro build && node scripts/check-jsonld.mjs
// Exit 0 if every block is valid, 1 otherwise.

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

// --- Pure helpers (exported for unit tests) --------------------------------
// A silent regression in extraction or validation would let malformed or
// incomplete structured data ship undetected, so these are tested directly.

// Raw JSON text of every ld+json script block, in document order. Tolerant of
// extra/other-ordered attributes on the tag; only the ld+json type matches.
export function extractJsonLd(html) {
  const re = /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let m;
  while ((m = re.exec(html))) blocks.push(m[1].trim());
  return blocks;
}

// Fields that a given @type must carry to be useful for rich results. Only the
// types this site actually emits are enumerated; any other @type passes the
// base @context/@type checks (we don't presume its schema).
export const REQUIRED_FIELDS = {
  Person: ["name"],
  BlogPosting: ["headline", "datePublished", "author"],
  Article: ["headline", "datePublished", "author"],
};

// Validate one already-parsed JSON-LD object. Returns human-readable issues.
export function validateJsonLd(obj) {
  const issues = [];
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return ["JSON-LD block is not an object"];
  }
  const ctx = obj["@context"];
  if (typeof ctx !== "string" || !ctx.includes("schema.org")) {
    issues.push('missing or non-schema.org "@context"');
  }
  const type = obj["@type"];
  if (typeof type !== "string" || !type) {
    issues.push('missing "@type"');
    return issues; // can't check type-specific fields without a type
  }
  for (const field of REQUIRED_FIELDS[type] ?? []) {
    const v = obj[field];
    const empty = v === undefined || v === null || (typeof v === "string" && !v.trim());
    if (empty) issues.push(`${type} is missing required field "${field}"`);
  }
  return issues;
}

// Parse then validate a raw block; unparseable JSON is itself an issue.
export function checkBlock(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return [`invalid JSON: ${e.message}`];
  }
  return validateJsonLd(parsed);
}

function main() {
  if (!existsSync("dist")) {
    console.error("check-jsonld: dist/ not found — run `npx astro build` first.");
    process.exit(1);
  }
  let failed = 0;
  let total = 0;
  for (const file of walk("dist")) {
    const blocks = extractJsonLd(readFileSync(file, "utf8"));
    if (!blocks.length) continue; // not every page carries structured data
    for (const block of blocks) {
      total++;
      const issues = checkBlock(block);
      if (issues.length) {
        failed += issues.length;
        console.log(`⚠ ${file}`);
        for (const i of issues) console.log(`    - ${i}`);
      } else {
        console.log(`✓ ${file}  (${JSON.parse(block)["@type"]})`);
      }
    }
  }

  // The portfolio's Person LD is a deliberate SEO feature; zero valid structured
  // data site-wide means it was wholesale removed — treat that as a regression.
  if (total === 0) {
    console.error("\ncheck-jsonld: FAILED — no JSON-LD found anywhere in the built site.");
    process.exit(1);
  }
  if (failed) {
    console.error(`\ncheck-jsonld: FAILED — ${failed} issue(s) across ${total} JSON-LD block(s).`);
    process.exit(1);
  }
  console.log(`\ncheck-jsonld: OK — ${total} JSON-LD block(s) valid across the built site.`);
}

// Only run the CLI when invoked directly, so importing this module for tests is
// side-effect-free (no dist read, no process.exit).
if (import.meta.url === `file://${process.argv[1]}`) main();
