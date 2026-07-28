# Viken Parikh — Personal Website

My portfolio at **[vikenparikh.com](https://vikenparikh.com)** — built with Astro and Tailwind CSS v4, deployed to GitHub Pages.

![Site preview](public/images/og-card.png)

## Tech stack

- **Astro 7** (static output) — **requires Node ≥ 22.12**
- **Tailwind CSS v4**
- TypeScript-driven site config (`src/config.ts`)
- Vitest (component render tests) + a small Node contact backend + a Python project-builder script

## Local development

```bash
npm install
npm run dev        # astro dev server
```

## Content

All profile content — headline, skills, experience, education, social links — lives in **`src/config.ts`**. The visible **Projects** section (`src/components/Projects.astro`) is a hand-curated list: a featured trio (edumind-ai, neuralverse-ai, medmind-ai) plus selected other repos.

There is also an optional project generator (`scripts/portfolio_builder.py` → `src/generated/projects.ts`) that scans local/GitHub repos; its output feeds `siteConfig.projects` but is **not** what the Projects section renders. Run it manually if you want to refresh that data:

```bash
npm run sync:projects
```

Configure scanning/curation in `portfolio_builder.json` (`scan_paths`, `exclude_projects`, `preferred_projects`, `max_projects`).

## Social share card

The Open Graph / Twitter card (`public/images/og-card.png`) and `apple-touch-icon.png` are generated from vendored Manrope fonts:

```bash
npm run gen:og     # regenerate after changing headline copy/stats
```

## Testing

```bash
npm test           # Vitest — component + full-page render tests
npm run test:py    # Python — portfolio_builder unit tests
cd backend && npm test   # Node --test — contact server (validation, rate-limit, honeypot, CORS)
```

## CI & deployment

- **CI** (`.github/workflows/ci.yml`) runs on every PR and on `master`: three parallel jobs — frontend (`astro check` + Vitest + build), contact backend (`node --test`), and the Python script tests.
- **Deploy** (`.github/workflows/deploy.yml`) builds and publishes `dist/` to GitHub Pages on push to `master`.
- Both workflows run on **Node 22** (Astro requires Node ≥ 22.12; Node 20 fails the build).

## Production build

```bash
npm run build      # runs sync:projects, then astro build → dist/
# or, without the project re-scan:
npx astro build
```
