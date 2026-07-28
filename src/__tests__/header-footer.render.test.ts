import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Header from "../components/Header.astro";
import Footer from "../components/Footer.astro";
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

describe("Header.astro render-E2E", () => {
  it("renders the header with the name and in-page nav anchors", async () => {
    const html = await render(Header);
    expect(html).toContain('id="header"');
    expect(html).toContain(siteConfig.name);
    // Nav links are absolute (/#section) so they work from sub-pages like
    // /writing, not just the homepage.
    for (const section of ["about", "skills", "experience", "education", "projects"]) {
      expect(html, `nav should link to /#${section}`).toContain(`href="/#${section}"`);
    }
  });

  it("drives external links from siteConfig (no divergent hardcoded URLs)", async () => {
    const html = await render(Header);
    // Header profile link + booking CTA come from config so they can't drift
    // from the rest of the site (the profile link previously hardcoded a
    // different LinkedIn URL form than config).
    expect(html).toContain(`href="${siteConfig.social.linkedin}"`);
    expect(html).toContain(`href="${siteConfig.calendarUrl}"`);
  });

  it("wires the mobile menu button for a11y (label + expanded state + control)", async () => {
    const html = await render(Header);
    expect(html).toContain('aria-label="Open navigation"');
    expect(html).toContain('aria-controls="mobile-nav"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('id="mobile-nav"');
  });
});

describe("Footer.astro render-E2E", () => {
  it("renders a footer with the owner name", async () => {
    const html = await render(Footer);
    expect(html).toContain("<footer");
    expect(html).toContain("Viken Parikh");
  });
});
