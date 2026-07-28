import { describe, it, expect } from "vitest";
import { buildArticleLd } from "../lib/structuredData";

const BASE = {
  title: "Shipping LLM agents in production",
  description: "Lessons from running agents at scale.",
  pubDate: new Date("2026-03-15T00:00:00.000Z"),
  tags: ["ai", "mlops"],
  slug: "shipping-llm-agents",
  authorName: "Viken Parikh",
  siteUrl: "https://vikenparikh.com",
};

describe("buildArticleLd (BlogPosting JSON-LD)", () => {
  it("produces a valid BlogPosting with the required rich-result fields", () => {
    const ld = buildArticleLd(BASE);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("BlogPosting");
    expect(ld.headline).toBe(BASE.title);
    expect(ld.description).toBe(BASE.description);
    // Google requires an ISO-8601 datePublished for the Article rich result.
    expect(ld.datePublished).toBe("2026-03-15T00:00:00.000Z");
    expect(ld.author).toEqual({ "@type": "Person", name: BASE.authorName, url: BASE.siteUrl });
    expect(ld.publisher).toEqual({ "@type": "Person", name: BASE.authorName, url: BASE.siteUrl });
    expect(ld.inLanguage).toBe("en-US");
  });

  it("derives url/mainEntityOfPage to match the page canonical (siteUrl + slug + trailing slash)", () => {
    const ld = buildArticleLd(BASE);
    const canonical = "https://vikenparikh.com/writing/shipping-llm-agents/";
    expect(ld.url).toBe(canonical);
    expect(ld.mainEntityOfPage).toEqual({ "@type": "WebPage", "@id": canonical });
  });

  it("includes keywords when tags are present, omits the field when empty", () => {
    expect(buildArticleLd(BASE).keywords).toBe("ai, mlops");
    const noTags = buildArticleLd({ ...BASE, tags: [] });
    expect("keywords" in noTags).toBe(false);
    const undefTags = buildArticleLd({ ...BASE, tags: undefined });
    expect("keywords" in undefTags).toBe(false);
  });

  it("serializes to valid JSON (embeddable in a <script type=application/ld+json>)", () => {
    const ld = buildArticleLd(BASE);
    expect(() => JSON.parse(JSON.stringify(ld))).not.toThrow();
  });
});
