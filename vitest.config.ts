import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/config.ts"],
      reporter: ["text", "text-summary"],
    },
  },
});
