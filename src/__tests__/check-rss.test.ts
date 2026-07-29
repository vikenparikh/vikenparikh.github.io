import { describe, it, expect } from "vitest";
// check-rss.mjs runs in the frontend CI gate after every build. The feed is
// hand-templated (src/pages/rss.xml.ts), so its helpers are pure and tested
// directly — a silent regression could ship an ill-formed feed that breaks
// every reader while the build stays green.
import { validateFeed, findUnescapedAmpersand, extractItems, REQUIRED_ITEM_CHILDREN } from "../../scripts/check-rss.mjs";

// A minimal valid feed matching the real template's shape.
const channel = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Viken Parikh — Writing</title>
    <link>https://vikenparikh.com/writing/</link>
    <atom:link href="https://vikenparikh.com/rss.xml" rel="self" type="application/rss+xml" />
    <description>Notes.</description>
    <language>en-us</language>
__ITEMS__
  </channel>
</rss>`;
const feed = (items = "") => channel.replace("__ITEMS__", items);
const item = `    <item>
      <title>Hello</title>
      <link>https://vikenparikh.com/writing/hello/</link>
      <guid>https://vikenparikh.com/writing/hello/</guid>
      <description>Hi</description>
      <pubDate>Mon, 01 Jan 2026 00:00:00 GMT</pubDate>
    </item>`;

describe("findUnescapedAmpersand", () => {
  it("returns null when all ampersands are valid entities", () => {
    expect(findUnescapedAmpersand("Tom &amp; Jerry &lt;3 &#169; &#x27;")).toBeNull();
  });
  it("flags a raw ampersand (the classic feed-breaker)", () => {
    expect(findUnescapedAmpersand("R&D notes")).toContain("&D notes");
  });
});

describe("extractItems", () => {
  it("returns one entry per <item> block", () => {
    expect(extractItems(feed(`${item}\n${item}`)).length).toBe(2);
    expect(extractItems(feed())).toEqual([]);
  });
});

describe("validateFeed", () => {
  it("passes an item-less channel (no posts published yet)", () => {
    expect(validateFeed(feed())).toEqual([]);
  });
  it("passes a well-formed feed with one item", () => {
    expect(validateFeed(feed(item))).toEqual([]);
  });
  it("flags a missing <?xml> declaration", () => {
    expect(validateFeed(feed().replace(/<\?xml[^>]*\?>\n/, ""))).toContain("missing <?xml …?> declaration");
  });
  it("flags a missing required channel element", () => {
    expect(validateFeed(feed().replace(/<link>[\s\S]*?<\/link>/, ""))).toContain("channel missing <link>");
  });
  it("flags a missing atom self-link", () => {
    expect(validateFeed(feed().replace(/<atom:link[^>]*>/, ""))).toContain('channel missing <atom:link rel="self">');
  });
  it("flags an unescaped ampersand anywhere in the feed", () => {
    const issues = validateFeed(feed(item).replace("Hello", "R&D"));
    expect(issues.some((i) => i.startsWith('unescaped "&"'))).toBe(true);
  });
  it("flags unbalanced <item> tags", () => {
    const broken = feed(item).replace("</item>", ""); // drop one closing tag
    expect(validateFeed(broken).some((i) => i.startsWith("unbalanced <item>"))).toBe(true);
  });
  it("flags an item missing a required child", () => {
    for (const child of REQUIRED_ITEM_CHILDREN) {
      const broken = feed(item.replace(new RegExp(`<${child}>[\\s\\S]*?</${child}>`), ""));
      expect(validateFeed(broken)).toContain(`item 1 missing <${child}>`);
    }
  });
  it("flags an unparseable pubDate", () => {
    const broken = feed(item.replace(/<pubDate>[\s\S]*?<\/pubDate>/, "<pubDate>not-a-date</pubDate>"));
    expect(validateFeed(broken).some((i) => i.includes("unparseable <pubDate>"))).toBe(true);
  });
});
