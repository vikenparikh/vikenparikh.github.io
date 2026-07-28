import { getCollection } from "astro:content";
import { siteConfig } from "../config";

const SITE = "https://vikenparikh.com";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Dependency-free RSS 2.0 feed of published (non-draft) writing, newest first.
export async function GET() {
  const posts = (await getCollection("writing", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime()
  );

  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.data.title)}</title>
      <link>${SITE}/writing/${p.id}/</link>
      <guid>${SITE}/writing/${p.id}/</guid>
      <description>${esc(p.data.description)}</description>
      <pubDate>${p.data.pubDate.toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(siteConfig.name)} — Writing</title>
    <link>${SITE}/writing/</link>
    <description>Notes on AI/ML, LLM agents, MLOps, and distributed systems.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
