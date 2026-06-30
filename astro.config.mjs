// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // Canonical deployed origin (matches the CNAME). Drives absolute URLs + sitemap.
  site: "https://vikenparikh.com",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
