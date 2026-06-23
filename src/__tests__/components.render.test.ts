import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Experience from "../components/Experience.astro";
import Education from "../components/Education.astro";
import Skills from "../components/Skills.astro";
import { siteConfig } from "../config";

// Astro HTML-escapes interpolated text, so config values containing "&" (e.g.
// "Microsoft, Seattle & Vancouver") appear as entities in the rendered output.
// Decode named + numeric entities (looping to handle any double-escaping) so the
// assertions compare against the real config strings.
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

async function render(Component: Parameters<AstroContainer["renderToString"]>[0]) {
  const container = await AstroContainer.create();
  return decode(await container.renderToString(Component));
}

describe("Experience.astro render-E2E", () => {
  it("renders the Experience section and every configured job (company + title)", async () => {
    const html = await render(Experience);
    expect(html).toContain('id="experience"');
    expect(html).toContain("Experience");
    for (const exp of siteConfig.experience) {
      expect(html, `company "${exp.company}" should render`).toContain(exp.company);
      expect(html, `title "${exp.title}" should render`).toContain(exp.title);
    }
  });

  it("renders exactly one job card per configured experience entry", async () => {
    const html = await render(Experience);
    // `last:mb-0` is on each per-job card wrapper and nowhere else in the template.
    const cardCount = (html.match(/last:mb-0/g) || []).length;
    expect(cardCount).toBe(siteConfig.experience.length);
  });
});

describe("Education.astro render-E2E", () => {
  it("renders the Education section and every configured degree + school", async () => {
    const html = await render(Education);
    expect(html).toContain("Education");
    expect(siteConfig.education.length).toBeGreaterThan(0);
    for (const edu of siteConfig.education) {
      expect(html, `degree "${edu.degree}" should render`).toContain(edu.degree);
      expect(html, `school "${edu.school}" should render`).toContain(edu.school);
    }
  });
});

describe("Skills.astro render-E2E", () => {
  it("renders the Skills section and every non-empty skill group (title + a sample item)", async () => {
    const html = await render(Skills);
    expect(html).toContain("Skills");
    // Mirror the component's own filter (Skills.astro: skillAreas with non-empty items).
    const groups = siteConfig.skillAreas.filter((g) => g.items && g.items.length > 0);
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(html, `group title "${group.title}" should render`).toContain(group.title);
      expect(html, `group "${group.title}" first item should render`).toContain(group.items[0]);
    }
  });
});
