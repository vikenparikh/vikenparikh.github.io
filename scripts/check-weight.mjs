// Performance weight-budget gate. Measures the BUILT site (dist/) and fails if
// any page, the CSS/JS bundle, or a single image exceeds its byte budget. This
// is the one quality class the other gates don't cover — page weight, which is
// recruiter-facing (LCP / mobile load) and easy to regress silently: an inlined
// data blob, a heavy client library, or an unoptimised hero image all balloon
// the payload while every correctness gate stays green.
//
// Budgets are deterministic byte thresholds set well above today's sizes, so
// this catches gross regressions without false-alarming on normal edits. Unlike
// Lighthouse it needs no browser and never flakes. Bump a budget deliberately
// (with the size in the diff) if real growth is justified.
//
// Usage: npx astro build && node scripts/check-weight.mjs
// Exit 0 if within budget, 1 otherwise.

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const KB = 1024;

// Budgets in bytes. Current sizes (2026-07): homepage 77 KB, CSS 31 KB, no JS
// bundle, largest image (og-card) 83 KB — so each budget has comfortable room.
export const BUDGETS = {
  htmlPage: 120 * KB, // any single built page
  cssTotal: 60 * KB, // all CSS combined
  jsTotal: 30 * KB, // all JS combined
  singleImage: 250 * KB, // any single raster/vector image
};

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico", ".avif"]);

export const kb = (n) => `${(n / KB).toFixed(1)} KB`;

// Pure budget evaluation (fs-free, unit-tested): given the measured sizes,
// return the list of budget violations.
export function evaluate({ pages, cssTotal, jsTotal, images }) {
  const issues = [];
  for (const p of pages) {
    if (p.size > BUDGETS.htmlPage) issues.push(`page ${p.path} is ${kb(p.size)} (budget ${kb(BUDGETS.htmlPage)})`);
  }
  if (cssTotal > BUDGETS.cssTotal) issues.push(`total CSS is ${kb(cssTotal)} (budget ${kb(BUDGETS.cssTotal)})`);
  if (jsTotal > BUDGETS.jsTotal) issues.push(`total JS is ${kb(jsTotal)} (budget ${kb(BUDGETS.jsTotal)})`);
  for (const img of images) {
    if (img.size > BUDGETS.singleImage)
      issues.push(`image ${img.path} is ${kb(img.size)} (budget ${kb(BUDGETS.singleImage)})`);
  }
  return issues;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// Gather the measured sizes from dist/ into the shape evaluate() expects.
export function measure(files) {
  const pages = [];
  const images = [];
  let cssTotal = 0;
  let jsTotal = 0;
  for (const f of files) {
    const size = statSync(f).size;
    const ext = extname(f).toLowerCase();
    if (ext === ".html") pages.push({ path: f, size });
    else if (ext === ".css") cssTotal += size;
    else if (ext === ".js") jsTotal += size;
    else if (IMAGE_EXT.has(ext)) images.push({ path: f, size });
  }
  return { pages, cssTotal, jsTotal, images };
}

function main() {
  if (!existsSync("dist")) {
    console.error("check-weight: dist/ not found — run `npx astro build` first.");
    process.exit(1);
  }
  const measured = measure(walk("dist"));
  const issues = evaluate(measured);

  const biggestPage = measured.pages.sort((a, b) => b.size - a.size)[0];
  console.log(
    `weights: largest page ${biggestPage ? kb(biggestPage.size) : "n/a"}, CSS ${kb(measured.cssTotal)}, JS ${kb(measured.jsTotal)}, ${measured.images.length} images`
  );

  if (issues.length) {
    console.error(`\n⚠ over budget:`);
    for (const i of issues) console.error(`    - ${i}`);
    console.error(`\ncheck-weight: FAILED — ${issues.length} budget(s) exceeded (see scripts/check-weight.mjs).`);
    process.exit(1);
  }
  console.log("check-weight: OK — every page, bundle, and image is within budget.");
}

// Only run the CLI when invoked directly, so importing this module for tests is
// side-effect-free (no dist read, no process.exit).
if (import.meta.url === `file://${process.argv[1]}`) main();
