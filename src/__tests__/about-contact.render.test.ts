import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import About from "../components/About.astro";
import Contact from "../components/Contact.astro";
import { siteConfig } from "../config";

// Astro HTML-escapes interpolated text; decode (looping for any double-escaping)
// so assertions compare against the real config strings. (Same as the other
// render tests.)
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

describe("About.astro render-E2E", () => {
  it("renders the About section, the aboutMe text and every highlight", async () => {
    const html = await render(About);
    expect(html).toContain('id="about"');
    expect(html, "aboutMe text should render").toContain(siteConfig.aboutMe);
    expect(Array.isArray(siteConfig.highlights) && siteConfig.highlights.length > 0).toBe(true);
    for (const highlight of siteConfig.highlights ?? []) {
      expect(html, `highlight "${highlight}" should render`).toContain(highlight);
    }
  });
});

describe("Contact.astro render-E2E (frontend<->backend form contract)", () => {
  it("renders the contact form with exactly the fields the backend validates", async () => {
    const html = await render(Contact);
    expect(html).toContain('id="contact"');
    expect(html).toContain('id="contact-form"');
    // The self-hosted contact backend (backend/server.js) reads body.name / .email
    // / .message / ._hp (honeypot). The deployed form MUST expose those field names
    // or submissions break — pin the contract here.
    for (const field of ["name", "email", "message", "_hp"]) {
      expect(html, `form must have an input/textarea named "${field}"`).toMatch(
        new RegExp(`name="${field}"`)
      );
    }
  });

  it("renders the direct mailto with the configured email", async () => {
    const html = await render(Contact);
    expect(html).toContain(siteConfig.social.email);
    expect(html).toContain(`mailto:${siteConfig.social.email}`);
  });
});
