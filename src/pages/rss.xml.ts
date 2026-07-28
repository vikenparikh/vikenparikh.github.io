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

  // lastBuildDate from the newest post (posts are sorted newest-first) — a
  // deterministic, meaningful value; omitted when there are no posts so the feed
  // doesn't churn on every build. Wall-clock is deliberately avoided.
  const lastBuild = posts.length
    ? `\n    <lastBuildDate>${posts[0].data.pubDate.toUTCString()}</lastBuildDate>`
    : "";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(siteConfig.name)} — Writing</title>
    <link>${SITE}/writing/</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Notes on AI/ML, LLM agents, MLOps, and distributed systems.</description>
    <language>en-us</language>${lastBuild}
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
