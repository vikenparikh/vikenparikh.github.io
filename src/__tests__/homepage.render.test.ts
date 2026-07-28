import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Home from "../pages/index.astro";
import { siteConfig } from "../config";

// Astro HTML-escapes interpolated text, so config values containing "&" (e.g.
// "Microsoft, Seattle & Vancouver") render as entities. Decode (looping to handle
// any double-escaping) so assertions compare against the real config strings.
// (Same approach as components.render.test.ts.)
function decode(input: string): string {
  let s = input;
  let prev: string;
  do {
    prev = s;
    s = s
      .replace(/&amp;/g, "&")
      .replace(/&#38;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&#60;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#62;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
  } while (s !== prev);
  return s;
}

// Render the full deployed homepage (all 9 components composed in index.astro) once.
let html = "";
async function getHtml(): Promise<string> {
  if (!html) {
    const container = await AstroContainer.create();
    html = decode(await container.renderToString(Home));
  }
  return html;
}

describe("index.astro homepage render-E2E (full deployed page)", () => {
  it("renders the document head with config-driven title + description", async () => {
    const h = await getHtml();
    // <title>{name} - {title}</title>
    expect(h).toContain("<title>");
    expect(h, "title should include siteConfig.name").toContain(siteConfig.name);
    expect(h, "title should include siteConfig.title").toContain(siteConfig.title);
    // <meta name="description" content={siteConfig.description}>
    expect(h, "meta description should be the config description").toContain(siteConfig.description);
  });

  it("does not load a render-blocking web font (IBM Plex Mono was unused)", async () => {
    const h = await getHtml();
    // The head used to pull IBM Plex Mono (14 variants) from Google Fonts even
    // though nothing on the page uses it — a render-blocking request for zero
    // visual benefit. Keep the head font-free (system stack in global.css).
    expect(h).not.toContain("fonts.googleapis.com");
    expect(h).not.toContain("fonts.gstatic.com");
    expect(h).not.toContain("IBM+Plex+Mono");
  });

  it("preloads the LCP profile image", async () => {
    const h = await getHtml();
    expect(h).toMatch(/<link[^>]*rel="preload"[^>]*as="image"[^>]*fetchpriority="high"/);
    expect(h).toContain(siteConfig.profileImage);
  });

  it("sets a complete viewport meta (initial-scale=1 — prevents the iOS landscape-zoom bug)", async () => {
    const h = await getHtml();
    expect(h).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1"/);
  });

  it("links a valid web app manifest whose icons exist", async () => {
    const h = await getHtml();
    expect(h).toContain('rel="manifest"');
    expect(h).toContain('href="/site.webmanifest"');
    const { readFileSync, existsSync } = await import("node:fs");
    const manifest = JSON.parse(readFileSync("public/site.webmanifest", "utf8"));
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect(existsSync(`public${icon.src}`), `${icon.src} must exist in public/`).toBe(true);
    }
  });

  it("advertises the writing RSS feed for autodiscovery", async () => {
    const h = await getHtml();
    expect(h).toMatch(/<link[^>]*rel="alternate"[^>]*type="application\/rss\+xml"[^>]*href="\/rss.xml"/);
  });

  it("renders the page shell (html lang, body, skip-target main)", async () => {
    const h = await getHtml();
    expect(h).toContain('lang="en"');
    expect(h).toContain("<body");
    expect(h).toContain('id="main-content"');
    expect(h).toContain('href="#main-content"');
  });

  it("composes every major section (ids present)", async () => {
    const h = await getHtml();
    for (const id of ["header", "hero", "about", "skills", "experience", "education", "projects", "contact"]) {
      expect(h, `section id="${id}" should be present`).toContain(`id="${id}"`);
    }
  });

  it("renders Hero with the configured name and social links", async () => {
    const h = await getHtml();
    expect(h).toContain(siteConfig.name);
    expect(h, "linkedin href should render").toContain(siteConfig.social.linkedin);
    expect(h, "github href should render").toContain(siteConfig.social.github);
  });

  it("renders every configured experience entry (company)", async () => {
    const h = await getHtml();
    expect(siteConfig.experience.length).toBeGreaterThan(0);
    for (const exp of siteConfig.experience) {
      expect(h, `experience company "${exp.company}" should render on the page`).toContain(exp.company);
    }
  });

  it("renders every configured education entry (school)", async () => {
    const h = await getHtml();
    expect(siteConfig.education.length).toBeGreaterThan(0);
    for (const edu of siteConfig.education) {
      expect(h, `education school "${edu.school}" should render on the page`).toContain(edu.school);
    }
  });

  it("renders every non-empty skill group title", async () => {
    const h = await getHtml();
    const groups = siteConfig.skillAreas.filter((g) => g.items && g.items.length > 0);
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(h, `skill group "${group.title}" should render on the page`).toContain(group.title);
    }
  });

  it("renders the Contact email", async () => {
    const h = await getHtml();
    expect(h, "contact email should render").toContain(siteConfig.social.email);
  });

  it("emits JSON-LD Person structured data + theme-color meta", async () => {
    const h = await getHtml();
    expect(h).toContain('name="theme-color"');
    expect(h).toContain('type="application/ld+json"');
    // The block should parse and describe the configured person.
    const m = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(m, "a JSON-LD script block should be present").toBeTruthy();
    const ld = JSON.parse(m![1]);
    expect(ld["@type"]).toBe("Person");
    expect(ld.name).toBe(siteConfig.name);
    expect(ld.sameAs).toContain(siteConfig.social.linkedin);
    expect(ld.sameAs).toContain(siteConfig.social.github);
    // Enriched, config-derived facets: current employer, schools, expertise.
    expect(ld.worksFor?.name).toBe(siteConfig.experience[0].company);
    expect(ld.alumniOf.map((a: { name: string }) => a.name)).toEqual(
      siteConfig.education.map((e) => e.school)
    );
    expect(ld.knowsAbout).toEqual(siteConfig.skills);
  });

  it("references an absolute, existing OG image + apple-touch-icon", async () => {
    const h = await getHtml();
    // Regression: og/twitter image previously pointed at a file that did not
    // exist (website-screenshot_full.png) — broken social previews. Pin the
    // real, absolute card URL and its dimensions.
    expect(h).toContain('property="og:image" content="https://vikenparikh.com/images/og-card.png"');
    expect(h).toContain('name="twitter:image" content="https://vikenparikh.com/images/og-card.png"');
    expect(h).toContain('property="og:image:width" content="1200"');
    expect(h).toContain('property="og:image:height" content="630"');
    // Social-share metadata completeness: brand name, locale, and Twitter-side
    // image alt (Twitter reads twitter:image:alt, not og:image:alt).
    expect(h).toContain('property="og:site_name"');
    expect(h).toContain('property="og:locale" content="en_US"');
    expect(h).toContain('name="twitter:image:alt"');
    expect(h).toContain('rel="apple-touch-icon"');
    // The referenced image must actually be committed to public/.
    const { existsSync } = await import("node:fs");
    expect(existsSync("public/images/og-card.png"), "og-card.png must exist in public/images").toBe(true);
    expect(existsSync("public/apple-touch-icon.png"), "apple-touch-icon.png must exist in public/").toBe(true);
  });

  it("has a single <h1> and no lower-level heading precedes it (clean outline)", async () => {
    const h = await getHtml();
    const levels = [...h.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    // Exactly one top-level heading.
    expect(levels.filter((l) => l === 1).length, "page must have exactly one <h1>").toBe(1);
    // Regression: the Hero greeting kicker was once an <h2>, so an h2 appeared
    // before the <h1> and broke the document outline. The first heading in DOM
    // order must be the <h1>.
    expect(levels[0], "the first heading in document order must be the <h1>").toBe(1);
  });
});
