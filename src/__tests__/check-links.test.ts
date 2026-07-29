import { describe, it, expect } from "vitest";
// check-links.mjs is load-bearing: it runs on every PR (--assets-only) and
// weekly, and guards the dead-link / missing-asset class that shipped 8 dead
// recruiter links once (#69). Its classification helpers are pure — test them
// directly so a silent regression can't quietly let broken references through.
import {
  extractUrls,
  extractLocalAssets,
  isSkippedHost,
  extractInternalRoutes,
  routeResolves,
} from "../../scripts/check-links.mjs";

describe("extractUrls", () => {
  it("collects absolute http(s) URLs from href/src, deduped", () => {
    const html = `<a href="https://a.com/x">x</a><img src="http://b.com/i.png"><a href="https://a.com/x">dup</a>`;
    expect(extractUrls(html).sort()).toEqual(["http://b.com/i.png", "https://a.com/x"]);
  });
  it("ignores relative paths and in-page anchors (only absolute links)", () => {
    expect(extractUrls(`<a href="/about">a</a><a href="#top">t</a><img src="/i.png">`)).toEqual([]);
  });
  it("drops un-rendered template placeholders (${...})", () => {
    expect(extractUrls('<a href="https://github.com/${repo}">x</a>')).toEqual([]);
  });
});

describe("extractLocalAssets", () => {
  it("includes root-relative paths with an asset extension", () => {
    expect(extractLocalAssets(`<img src="/images/og-card.png"><link href="/favicon.svg">`).sort()).toEqual([
      "/favicon.svg",
      "/images/og-card.png",
    ]);
  });
  it("maps a same-origin absolute asset URL to its pathname", () => {
    expect(extractLocalAssets(`<img src="https://vikenparikh.com/images/a.png">`)).toEqual(["/images/a.png"]);
  });
  it("excludes external-host assets (handled by the 404 check, not the disk check)", () => {
    expect(extractLocalAssets(`<img src="https://cdn.other.com/a.png">`)).toEqual([]);
  });
  it("excludes page routes / anchors (no asset extension)", () => {
    expect(extractLocalAssets(`<a href="/writing/">w</a><a href="/#projects">p</a>`)).toEqual([]);
  });
  it("drops template placeholders", () => {
    expect(extractLocalAssets('<img src="/images/${name}.png">')).toEqual([]);
  });
});

describe("isSkippedHost", () => {
  it("skips exact skip hosts and their subdomains", () => {
    expect(isSkippedHost("vikenparikh.com")).toBe(true);
    expect(isSkippedHost("www.linkedin.com")).toBe(true);
    expect(isSkippedHost("cdn.vikenparikh.com")).toBe(true); // subdomain
  });
  it("does NOT skip unrelated or look-alike hosts", () => {
    expect(isSkippedHost("github.com")).toBe(false);
    // Regression guard: substring match would wrongly skip this; the dot-boundary
    // in endsWith(`.${h}`) must prevent it.
    expect(isSkippedHost("notlinkedin.com")).toBe(false);
    expect(isSkippedHost("vikenparikh.com.evil.com")).toBe(false);
  });
});

describe("extractInternalRoutes", () => {
  it("collects root-relative page routes, stripping fragment and query", () => {
    const html = `<a href="/">home</a><a href="/#projects">p</a><a href="/writing?ref=nav">w</a>`;
    expect(extractInternalRoutes(html).sort()).toEqual(["/", "/writing"]);
  });
  it("excludes external links, bare fragments, and standard assets", () => {
    const html = `<a href="https://x.com/y">x</a><a href="#top">t</a><img src="/a.png"><link href="/favicon.svg">`;
    expect(extractInternalRoutes(html)).toEqual([]);
  });
  it("includes non-standard assets linked via href (css/js/webmanifest) — the extension list misses these", () => {
    const html = `<link href="/site.webmanifest"><link href="/_astro/x.css"><script src="/app.js"></script>`;
    // src is not scanned here (assets check handles src); href-linked non-standard assets are.
    expect(extractInternalRoutes(html).sort()).toEqual(["/_astro/x.css", "/site.webmanifest"]);
  });
});

describe("routeResolves", () => {
  const built = new Set(["index.html", "/writing/index.html", "/about.html", "/site.webmanifest"]);
  const exists = (p: string) => built.has(p);
  it("resolves '/' to index.html", () => {
    expect(routeResolves("/", exists)).toBe(true);
  });
  it("resolves a directory route via <path>/index.html (trailing slash optional)", () => {
    expect(routeResolves("/writing", exists)).toBe(true);
    expect(routeResolves("/writing/", exists)).toBe(true);
  });
  it("resolves a flat <path>.html route and a direct file", () => {
    expect(routeResolves("/about", exists)).toBe(true);
    expect(routeResolves("/site.webmanifest", exists)).toBe(true);
  });
  it("reports a missing route as unresolved (the silent-404 guard)", () => {
    expect(routeResolves("/nonexistent", exists)).toBe(false);
    expect(routeResolves("/writting", exists)).toBe(false); // typo
  });
});
