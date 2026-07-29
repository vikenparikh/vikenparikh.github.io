// RSS feed validation gate. The feed (dist/rss.xml) is HAND-TEMPLATED in
// src/pages/rss.xml.ts (no library), so it carries real regression risk that
// nothing else covers: an added field that bypasses esc() would emit an
// unescaped "&" and break the XML for every feed reader; a template edit could
// drop a required channel element or malform a pubDate. All silent — the build
// still succeeds and the page still "renders".
//
// Dependency-free, like the other gates (audit-html / check-links / check-jsonld):
// targeted checks of the RSS 2.0 contract rather than a full XML parse, so it
// stays honest about what it verifies and never false-alarms on valid markup.
//
// Usage: npx astro build && node scripts/check-rss.mjs
// Exit 0 if the feed is valid, 1 otherwise.

import { readFileSync, existsSync } from "node:fs";

const FEED = "dist/rss.xml";

// Every <item> must carry these for a usable feed entry.
export const REQUIRED_ITEM_CHILDREN = ["title", "link", "guid", "pubDate"];

// A raw "&" that is not the start of a valid XML entity (&amp; &lt; &gt; &quot;
// &apos; or a numeric &#…;) makes the document ill-formed — the classic break
// when content skips escaping. Returns the first offending snippet, or null.
export function findUnescapedAmpersand(xml) {
  const m = xml.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/);
  if (!m) return null;
  return xml.slice(m.index, m.index + 20);
}

// Inner text of each <item>…</item> block, in document order.
export function extractItems(xml) {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
}

// Validate the whole feed. Returns human-readable issue strings.
export function validateFeed(xml) {
  const issues = [];

  if (!/^\s*<\?xml\b[^>]*\?>/.test(xml)) issues.push("missing <?xml …?> declaration");
  if (!/<rss\b[^>]*\bversion="2\.0"/.test(xml)) issues.push('missing <rss version="2.0">');
  if (!/xmlns:atom=/.test(xml)) issues.push("missing xmlns:atom declaration");

  // Required channel-level elements.
  const channel = xml.match(/<channel>([\s\S]*)<\/channel>/);
  if (!channel) {
    issues.push("missing <channel>");
  } else {
    const c = channel[1];
    for (const el of ["title", "link", "description"]) {
      if (!new RegExp(`<${el}>[\\s\\S]*?</${el}>`).test(c)) issues.push(`channel missing <${el}>`);
    }
    if (!/<atom:link\b[^>]*rel="self"/.test(c)) issues.push('channel missing <atom:link rel="self">');
  }

  // Well-formedness: unbalanced <item> tags, or a stray unescaped ampersand.
  const opens = (xml.match(/<item\b[^>]*>/g) || []).length;
  const closes = (xml.match(/<\/item>/g) || []).length;
  if (opens !== closes) issues.push(`unbalanced <item> tags (${opens} open, ${closes} close)`);

  const amp = findUnescapedAmpersand(xml);
  if (amp) issues.push(`unescaped "&" (ill-formed XML) near: ${amp}`);

  // Each item carries the required children and a parseable RFC-822 pubDate.
  extractItems(xml).forEach((item, i) => {
    for (const el of REQUIRED_ITEM_CHILDREN) {
      if (!new RegExp(`<${el}>[\\s\\S]*?</${el}>`).test(item)) issues.push(`item ${i + 1} missing <${el}>`);
    }
    const pub = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (pub && Number.isNaN(Date.parse(pub[1].trim()))) {
      issues.push(`item ${i + 1} has an unparseable <pubDate>: ${pub[1].trim()}`);
    }
  });

  return issues;
}

function main() {
  if (!existsSync(FEED)) {
    console.error(`check-rss: ${FEED} not found — run \`npx astro build\` first.`);
    process.exit(1);
  }
  const xml = readFileSync(FEED, "utf8");
  const issues = validateFeed(xml);
  const itemCount = extractItems(xml).length;

  if (issues.length) {
    console.error(`⚠ ${FEED}`);
    for (const i of issues) console.error(`    - ${i}`);
    console.error(`\ncheck-rss: FAILED — ${issues.length} issue(s) in the feed.`);
    process.exit(1);
  }
  console.log(`check-rss: OK — feed valid (${itemCount} item(s)).`);
}

// Only run the CLI when invoked directly, so importing this module for tests is
// side-effect-free (no dist read, no process.exit).
if (import.meta.url === `file://${process.argv[1]}`) main();
