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
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("<channel>");
    expect(xml).toContain(`${siteConfig.name} — Writing`);
    expect(xml).toContain("<link>https://vikenparikh.com/writing/</link>");
    // Self-referential atom:link (W3C Feed Validator recommendation) with its
    // namespace declared on <rss>.
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain(
      '<atom:link href="https://vikenparikh.com/rss.xml" rel="self" type="application/rss+xml" />'
    );
  });
});
