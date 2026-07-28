import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import NotFound from "../pages/404.astro";
import { siteConfig } from "../config";

async function render(Component: Parameters<AstroContainer["renderToString"]>[0]) {
  const container = await AstroContainer.create();
  return await container.renderToString(Component);
}

describe("404.astro render-E2E", () => {
  it("renders a branded, noindex 404 with a route back home", async () => {
    const html = await render(NotFound);
    expect(html).toContain("404");
    expect(html).toContain('lang="en"');
    // Must not be indexed by search engines.
    expect(html).toContain('name="robots" content="noindex"');
    // Must give the visitor a way back into the site.
    expect(html).toMatch(/href="\/"/);
    expect(html).toContain('href="/#projects"');
    // Branded with the configured name + accent.
    expect(html).toContain(siteConfig.name);
    expect(html).toContain(siteConfig.accentColor);
  });
});
