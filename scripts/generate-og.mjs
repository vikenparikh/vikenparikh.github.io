// Generates the social-share assets from siteConfig-style values:
//   public/images/og-card.png   (1200x630 Open Graph / Twitter card)
//   public/apple-touch-icon.png (180x180 iOS home-screen icon)
//
// Run: node scripts/generate-og.mjs
//
// Text is rendered by sharp (resvg/librsvg), which needs real fonts. The box
// this runs on has no system fonts, so we point fontconfig at the vendored
// Manrope files (SIL OFL 1.1) under scripts/assets/fonts and set FONTCONFIG_FILE
// BEFORE importing sharp (fontconfig is read on first render). Regenerate and
// commit the PNGs whenever the headline copy or stats change.

import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const fontDir = join(here, "assets", "fonts");

// Minimal fontconfig config that exposes the vendored fonts and maps the
// generic "sans-serif" family to Manrope.
const cfgDir = mkdtempSync(join(tmpdir(), "og-fc-"));
const cacheDir = join(cfgDir, "cache");
writeFileSync(
  join(cfgDir, "fonts.conf"),
  `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontDir}</dir>
  <cachedir>${cacheDir}</cachedir>
  <match target="pattern"><test name="family"><string>sans-serif</string></test><edit name="family" mode="assign" binding="strong"><string>Manrope</string></edit></match>
</fontconfig>`
);
process.env.FONTCONFIG_FILE = join(cfgDir, "fonts.conf");

const { default: sharp } = await import("sharp");

const ACCENT = "#2563eb";
const FONT = "Manrope, sans-serif";
const SITE = "vikenparikh.com";
const NAME = "Viken Parikh";
const TITLE = "AI/ML Software Engineer";
const TAGLINE = "LLM Agents · MLOps · Distributed Systems";
const FOOTNOTE = "Electronic Arts · Microsoft · PayPal · 6+ years shipping AI at scale";
const STATS = [
  { v: "$2B+", l: "daily volume", x: 80 },
  { v: "50K+", l: "QPS at peak", x: 345 },
  { v: "99.99%", l: "uptime", x: 600 },
  { v: "25K+", l: "developers", x: 855 },
];

// The </> mark from public/favicon.svg (viewBox 0 0 50 50).
const glyph = (fill) => `
  <polygon fill="${fill}" points="0 30.1184211 0 22.9226974 16 14 16 21.5657895 6.00369686 26.3766447 6.00369686 26.6644737 16 31.4753289 16 39"/>
  <polygon fill="${fill}" points="31 7 23.9756098 43 19 43 26.0243902 7"/>
  <polygon fill="${fill}" points="50 30.1184211 34 39 34 31.4753289 44.025878 26.6644737 44.025878 26.3766447 34 21.5657895 34 14 50 22.9226974"/>`;

const statSvg = STATS.map(
  (s) => `
  <text x="${s.x}" y="498" font-family="${FONT}" font-size="58" font-weight="bold" fill="${ACCENT}">${s.v}</text>
  <text x="${s.x}" y="538" font-family="${FONT}" font-size="25" fill="#6b7280">${s.l}</text>`
).join("");

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><radialGradient id="g" cx="0%" cy="0%" r="90%">
    <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.16"/>
    <stop offset="45%" stop-color="${ACCENT}" stop-opacity="0.05"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient></defs>
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="14" height="630" fill="${ACCENT}"/>
  <g transform="translate(80,74) scale(0.9)">${glyph("#111827")}</g>
  <text x="132" y="108" font-family="${FONT}" font-size="30" font-weight="600" fill="#6b7280">${SITE}</text>
  <text x="78" y="252" font-family="${FONT}" font-size="96" font-weight="bold" fill="#111827">${NAME}</text>
  <text x="80" y="320" font-family="${FONT}" font-size="46" font-weight="bold" fill="${ACCENT}">${TITLE}</text>
  <text x="80" y="374" font-family="${FONT}" font-size="31" fill="#4b5563">${TAGLINE}</text>
  ${statSvg}
  <text x="80" y="596" font-family="${FONT}" font-size="27" fill="#9ca3af">${FOOTNOTE}</text>
</svg>`;

// The </> mark on the accent tile, proportional for any square size (rounded
// corners, glyph ~56% of the tile, centered). apple-touch-icon (iOS) and the
// web-manifest PWA icons (Android/Chrome, 192 + 512) all share this artwork.
function iconSvg(size) {
  const rx = Math.round(size * 0.2);
  const scale = (size * 0.56) / 50; // glyph viewBox is 50
  const m = (size - size * 0.56) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${ACCENT}"/>
  <g transform="translate(${m},${m}) scale(${scale})">${glyph("#ffffff")}</g>
</svg>`;
}

const og = await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(join(repo, "public", "images", "og-card.png"), og);

const icon = await sharp(Buffer.from(iconSvg(180))).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(join(repo, "public", "apple-touch-icon.png"), icon);

const sizes = [];
for (const size of [192, 512]) {
  const buf = await sharp(Buffer.from(iconSvg(size))).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(join(repo, "public", `icon-${size}.png`), buf);
  sizes.push(`icon-${size}.png ${(buf.length / 1024).toFixed(1)}KB`);
}

console.log(
  `og-card.png ${(og.length / 1024).toFixed(1)}KB · apple-touch-icon.png ${(icon.length / 1024).toFixed(1)}KB · ${sizes.join(" · ")}`
);
