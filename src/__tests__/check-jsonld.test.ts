import { describe, it, expect } from "vitest";
// check-jsonld.mjs runs in the frontend CI gate after every build. Its helpers
// are pure — test them directly so a silent regression can't let malformed or
// incomplete structured data ship (degrading Google rich results unnoticed).
import { extractJsonLd, validateJsonLd, checkBlock, REQUIRED_FIELDS } from "../../scripts/check-jsonld.mjs";

describe("extractJsonLd", () => {
  it("extracts each ld+json block's raw JSON, in order", () => {
    const html = `<script type="application/ld+json">{"a":1}</script>
      <p>x</p>
      <script type="application/ld+json">{"b":2}</script>`;
    expect(extractJsonLd(html)).toEqual(['{"a":1}', '{"b":2}']);
  });
  it("ignores non-ld script tags", () => {
    const html = `<script>var x=1</script><script type="application/json">{"c":3}</script>`;
    expect(extractJsonLd(html)).toEqual([]);
  });
  it("is tolerant of extra attributes / quote style on the tag", () => {
    const html = `<script data-x type='application/ld+json' nonce="z">{"d":4}</script>`;
    expect(extractJsonLd(html)).toEqual(['{"d":4}']);
  });
});

describe("validateJsonLd", () => {
  const person = { "@context": "https://schema.org", "@type": "Person", name: "Viken Parikh" };
  it("passes a well-formed Person", () => {
    expect(validateJsonLd(person)).toEqual([]);
  });
  it("flags a missing/non-schema.org @context", () => {
    expect(validateJsonLd({ ...person, "@context": "https://example.com" })).toContain(
      'missing or non-schema.org "@context"',
    );
    expect(validateJsonLd({ "@type": "Person", name: "x" })).toContain('missing or non-schema.org "@context"');
  });
  it("flags a missing @type (and skips field checks)", () => {
    const issues = validateJsonLd({ "@context": "https://schema.org" });
    expect(issues).toEqual(['missing "@type"']);
  });
  it("flags a type-required field that is missing or blank", () => {
    expect(validateJsonLd({ "@context": "https://schema.org", "@type": "Person" })).toContain(
      'Person is missing required field "name"',
    );
    expect(validateJsonLd({ "@context": "https://schema.org", "@type": "Person", name: "  " })).toContain(
      'Person is missing required field "name"',
    );
  });
  it("enforces BlogPosting rich-result fields", () => {
    const post = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Hi",
      datePublished: "2026-01-01",
      author: { "@type": "Person", name: "V" },
    };
    expect(validateJsonLd(post)).toEqual([]);
    expect(validateJsonLd({ ...post, datePublished: undefined })).toContain(
      'BlogPosting is missing required field "datePublished"',
    );
  });
  it("passes an un-enumerated @type on base checks alone", () => {
    // WebSite isn't in REQUIRED_FIELDS, so only @context/@type are enforced.
    expect(REQUIRED_FIELDS).not.toHaveProperty("WebSite");
    expect(validateJsonLd({ "@context": "https://schema.org", "@type": "WebSite" })).toEqual([]);
  });
  it("rejects a non-object block", () => {
    expect(validateJsonLd([1, 2])).toEqual(["JSON-LD block is not an object"]);
  });
});

describe("checkBlock", () => {
  it("reports unparseable JSON as an issue (the malformed-set:html guard)", () => {
    const issues = checkBlock('{"@type":"Person", name: unquoted}');
    expect(issues.length).toBe(1);
    expect(issues[0]).toMatch(/^invalid JSON:/);
  });
  it("passes a valid serialized block end-to-end", () => {
    expect(checkBlock('{"@context":"https://schema.org","@type":"Person","name":"V"}')).toEqual([]);
  });
});
