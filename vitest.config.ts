import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // Scoped to files that v8 genuinely attributes through the astro/container
      // render path. The homepage E2E (homepage.render.test.ts) renders the full
      // index.astro page through all 9 components, but v8 only instruments a subset
      // of .astro files via the container pipeline; listing the non-attributed ones
      // (index.astro, About/Header/Footer/Contact/Projects/ProjectCard) would show
      // misleading 0%/absent rows. Hero.astro IS attributed (covered 0%->100% by the
      // page render). The page-composition guarantee is enforced by the test's
      // section-id + per-section assertions, not by a coverage number.
      include: [
        "src/config.ts",
        "src/components/Experience.astro",
        "src/components/Education.astro",
        "src/components/Skills.astro",
        "src/components/Hero.astro",
      ],
      reporter: ["text", "text-summary"],
    },
  },
});
