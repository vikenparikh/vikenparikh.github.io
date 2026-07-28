import { describe, it, expect } from "vitest";
import { GET } from "../pages/rss.xml";
import { siteConfig } from "../config";

// The RSS route builds a valid RSS 2.0 document from the (non-draft) writing
// collection. Even with no published posts it must emit a well-formed channel.
// (The AstroContainer test env doesn't hydrate the content layer, so the
// collection reads as empty here — which is exactly the "no posts yet" case.)
describe("rss.xml route", () => {
  it("returns a well-formed RSS 2.0 feed with the site channel", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("xml");
    const xml = await res.text();
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<rss version=\"2.0\">");
    expect(xml).toContain("<channel>");
    expect(xml).toContain(`${siteConfig.name} — Writing`);
    expect(xml).toContain("<link>https://vikenparikh.com/writing/</link>");
  });
});
