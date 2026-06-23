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
});
