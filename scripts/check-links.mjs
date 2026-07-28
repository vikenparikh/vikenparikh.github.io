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

if (!existsSync("dist")) {
  console.error("link-check: dist/ not found — run `npx astro build` first.");
  process.exit(1);
}

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

// Collect absolute URLs that appear as an href or src attribute value.
function collectUrls(files) {
  const urls = new Set();
  const re = /(?:href|src)=["'](https?:\/\/[^"']+)["']/g;
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    let m;
    while ((m = re.exec(text))) {
      if (!m[1].includes("${")) urls.add(m[1]);
    }
  }
  return [...urls];
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

const files = walk("dist");
const urls = collectUrls(files);
const dead = [];
const skipped = [];
const unknown = [];

for (const url of urls.sort()) {
  const host = new URL(url).hostname;
  if (SKIP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
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

if (dead.length) {
  console.error(`\nDEAD LINKS (${dead.length}):`);
  for (const d of dead) console.error(`  ${d}`);
  console.error("\nlink-check: FAIL — fix or remove the dead links above.");
  process.exit(1);
}
console.log(`\nlink-check: OK — ${urls.length - skipped.length} external links checked, 0 dead.`);
