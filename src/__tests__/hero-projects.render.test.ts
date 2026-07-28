import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Hero from "../components/Hero.astro";
import Projects from "../components/Projects.astro";
import { siteConfig } from "../config";

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

describe("Hero.astro render-E2E", () => {
  it("renders the scannable scale-metric strip with the headline numbers", async () => {
    const html = await render(Hero);
    expect(html).toContain('id="hero"');
    // Metrics moved out of prose into a <dl> stat strip — pin the numbers so they
    // survive future copy edits (they're the credibility hook above the fold).
    for (const value of ["$2B+", "50K+", "99.99%", "25K+"]) {
      expect(html, `stat "${value}" should render in the hero`).toContain(value);
    }
    expect(html, "stats should render as a definition list").toMatch(/<dl[\s>]/);
  });

  it("still renders the configured name and social links", async () => {
    const html = await render(Hero);
    expect(html).toContain(siteConfig.name);
    expect(html).toContain(siteConfig.social.linkedin);
    expect(html).toContain(siteConfig.social.github);
  });

  it("gives the profile image (LCP candidate) explicit dimensions + high fetch priority", async () => {
    const html = await render(Hero);
    const img = html.match(/<img[^>]*profile-photo[^>]*>/)?.[0] ?? "";
    expect(img, "hero should render the profile image").not.toBe("");
    expect(img).toContain('fetchpriority="high"');
    expect(img).toMatch(/width="640"/);
    expect(img).toMatch(/height="640"/);
  });
});

describe("Projects.astro render-E2E", () => {
  it("renders the three flagship AI products with GitHub links", async () => {
    const html = await render(Projects);
    expect(html).toContain('id="projects"');
    expect(html).toContain("Featured AI Projects");
    for (const repo of ["edumind-ai", "neuralverse-ai", "medmind-ai"]) {
      expect(html, `featured project "${repo}" should render`).toContain(repo);
      expect(html, `featured project "${repo}" should link to its GitHub repo`).toContain(
        `https://github.com/vikenparikh/${repo}`
      );
    }
  });

  it("gives each featured GitHub icon an accessible label", async () => {
    const html = await render(Projects);
    for (const repo of ["edumind-ai", "neuralverse-ai", "medmind-ai"]) {
      expect(html, `${repo} GitHub icon should be labelled`).toContain(
        `aria-label="${repo} on GitHub"`
      );
    }
  });
});
