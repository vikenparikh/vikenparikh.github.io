// Dead-link monitor. Scans the BUILT site (dist/) for external hyperlinks and
// images and checks each one, failing only on a definitive 404/410 so recruiters
// never hit a dead project link (8 of them shipped once — this makes that class
// of bug loud). Scanning dist (not src) means config-driven and dynamically
// built links are checked exactly as they ship.
//
// Deliberately conservative to avoid false alarms on a schedule:
//   - only href="…"/src="…" absolute URLs (not JSON-LD @context or og:image
//     content, which aren't navigable links)
//   - self-domain and bot-hostile hosts (e.g. linkedin.com returns HTTP 999 to
//     automated clients) are skipped and reported, not failed
//   - each URL is retried; only 404/410 counts as dead
//
// Usage: npx astro build && node scripts/check-links.mjs
// Exit 0 if no dead links, 1 otherwise.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const SKIP_HOSTS = ["vikenparikh.com", "www.vikenparikh.com", "linkedin.com", "www.linkedin.com"];
const SELF_HOSTS = ["vikenparikh.com", "www.vikenparikh.com"];
const ASSET_EXT = /\.(png|jpe?g|svg|webp|gif|ico|pdf|xml|txt|woff2?)$/i;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

// --- Pure classification helpers (exported for unit tests) -----------------
// These are the "brains" of the check: which references are external links,
// which are same-origin assets, and which hosts are skipped. A silent
// regression here would let dead links or missing assets ship undetected, so
// they're tested directly.

// Absolute http(s) URLs that appear as an href/src value. The `${` guard drops
// un-rendered template placeholders that can leak into test fixtures.
export function extractUrls(html) {
  const urls = new Set();
  const re = /(?:href|src)=["'](https?:\/\/[^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) {
    if (!m[1].includes("${")) urls.add(m[1]);
  }
  return [...urls];
}

// Same-origin asset paths (root-relative, or absolute on the site's own host)
// that point at a file. These 404 silently if the file is missing — Astro
// doesn't validate href/src targets — which is exactly how the original broken
// og:image shipped.
export function extractLocalAssets(html) {
  const paths = new Set();
  const re = /(?:href|src)=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) {
    let v = m[1];
    if (v.includes("${")) continue;
    if (/^https?:\/\//.test(v)) {
      let u;
      try {
        u = new URL(v);
      } catch {
        continue;
      }
      if (!SELF_HOSTS.includes(u.hostname)) continue; // external — handled by the 404 check
      v = u.pathname;
    }
    if (!v.startsWith("/")) continue; // only root-relative site paths
    if (!ASSET_EXT.test(v)) continue; // only files, not page routes/anchors
    paths.add(v);
  }
  return [...paths];
}

// A host is skipped if it equals, or is a subdomain of, a skip host.
export function isSkippedHost(host) {
  return SKIP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

// Thin fs wrappers over the pure extractors, deduped across all files.
function collectUrls(files) {
  return [...new Set(files.flatMap((f) => extractUrls(readFileSync(f, "utf8"))))];
}
function collectLocalAssets(files) {
  return [...new Set(files.flatMap((f) => extractLocalAssets(readFileSync(f, "utf8"))))];
}

async function check(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Some hosts reject HEAD; fall back to GET.
      let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15000) });
      if (res.status === 405 || res.status === 501) {
        res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15000) });
      }
      return res.status;
    } catch {
      if (attempt === 3) return 0; // network/timeout — treated as "unknown", not dead
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  return 0;
}

// --assets-only skips the network (external-link) checks and only verifies that
// self-hosted assets exist. It's fast + deterministic, so the PR CI gate runs it
// after every build; the scheduled workflow runs the full check (external + assets).
async function main() {
  if (!existsSync("dist")) {
    console.error("link-check: dist/ not found — run `npx astro build` first.");
    process.exit(1);
  }
  const ASSETS_ONLY = process.argv.includes("--assets-only");

  const files = walk("dist");
  const urls = ASSETS_ONLY ? [] : collectUrls(files);
  const dead = [];
  const skipped = [];
  const unknown = [];

  for (const url of urls.sort()) {
    if (isSkippedHost(new URL(url).hostname)) {
      skipped.push(url);
      continue;
    }
    const status = await check(url);
    if (status === 404 || status === 410) {
      dead.push(`${status}  ${url}`);
    } else if (status === 0) {
      unknown.push(url);
    } else {
      console.log(`OK   ${status}  ${url}`);
    }
  }

  for (const u of skipped) console.log(`SKIP       ${u}  (self or bot-hostile host)`);
  for (const u of unknown) console.log(`WARN  ???  ${u}  (no response; transient?)`);

  // Same-origin assets: must exist on disk (silent 404s otherwise).
  const assets = collectLocalAssets(files);
  const missing = assets.filter((p) => !existsSync(join("dist", p)));
  for (const p of assets) if (!missing.includes(p)) console.log(`ASSET OK   ${p}`);

  if (dead.length || missing.length) {
    if (dead.length) {
      console.error(`\nDEAD LINKS (${dead.length}):`);
      for (const d of dead) console.error(`  ${d}`);
    }
    if (missing.length) {
      console.error(`\nMISSING ASSETS (${missing.length}) — referenced but not in dist/:`);
      for (const p of missing) console.error(`  ${p}`);
    }
    console.error("\nlink-check: FAIL — fix or remove the broken references above.");
    process.exit(1);
  }
  const externalSummary = ASSETS_ONLY
    ? "external links skipped (--assets-only)"
    : `${urls.length - skipped.length} external links checked (0 dead)`;
  console.log(`\nlink-check: OK — ${externalSummary}, ${assets.length} local assets verified (0 missing).`);
}

// Only run the CLI when invoked directly, so importing this module for tests is
// side-effect-free (no dist read, no network, no process.exit).
if (import.meta.url === `file://${process.argv[1]}`) main();
