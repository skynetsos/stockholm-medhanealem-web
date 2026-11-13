// Generates the site's icons from the church logo (src/seed/assets/church-logo.png, 512 × 512):
// favicon/app icon, Apple touch icon and the PWA manifest icons (D-044). Re-run after a new logo:
//   pnpm tsx scripts/generate-icons.ts   (or: node --experimental-strip-types scripts/generate-icons.ts)
import { mkdirSync } from "fs";
import path from "path";
import sharp from "sharp";

const LOGO = path.resolve("src/seed/assets/church-logo.png");
// White: the logo itself has a white background.
const BACKGROUND = "#ffffff";
const OUT = path.resolve("public/icons");
mkdirSync(OUT, { recursive: true });

/** The logo centred on a square background, taking `scale` of the side (the rest is padding). */
async function icon(size: number, scale: number, file: string, background = BACKGROUND) {
  const inner = Math.round(size * scale);
  const logo = await sharp(LOGO).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, gravity: "centre" }])
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toFile(file);
  console.log(`wrote ${path.relative(process.cwd(), file)} (${size} × ${size})`);
}

// Next.js file conventions: favicon/app icon and Apple touch icon (opaque, iOS adds the rounding).
await icon(192, 0.92, path.resolve("src/app/icon.png"));
await icon(180, 0.86, path.resolve("src/app/apple-icon.png"));
// Web app manifest: "any" icons and "maskable" ones (logo inside the 80 % safe zone).
await icon(192, 0.92, path.join(OUT, "icon-192.png"));
await icon(512, 0.92, path.join(OUT, "icon-512.png"));
await icon(512, 0.72, path.join(OUT, "maskable-512.png"));
