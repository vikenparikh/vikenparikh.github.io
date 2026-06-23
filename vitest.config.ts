import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "src/config.ts",
        "src/components/Experience.astro",
        "src/components/Education.astro",
        "src/components/Skills.astro",
      ],
      reporter: ["text", "text-summary"],
    },
  },
});
