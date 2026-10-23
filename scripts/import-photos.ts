// Imports photos saved from the church's Facebook page into Media, for review in the admin.
//   PHOTO_DIR="C:\Users\yonas\Pictures\medhanealem-photos\facebook" pnpm payload run scripts/import-photos.ts
// Each image: converted to JPEG (webp/heic/png too), rotated upright, ALL metadata stripped (EXIF,
// GPS, camera); skipped when under 800 px wide. Alt text from the file name ("timket-2026-procession"
// → "Timket 2026 procession"); Permission to publish and Shows children left unticked for review;
// credit "Stockholm Medhanealem / Facebook". Idempotent: matched on the resulting file name.
// All imports are collected in the unpublished gallery "ፎቶዎች / Photos".
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { getPayload } from "payload";
import sharp from "sharp";

import config from "../src/payload.config";
import { stockholmDate } from "../src/lib/ethiopian-calendar";
import { stockholmInstant } from "../src/lib/stockholm-time";

const dir = process.env.PHOTO_DIR;
if (!dir) throw new Error("Set PHOTO_DIR to the folder with the saved photos.");

const MIN_WIDTH = 800;
const CREDIT = "Stockholm Medhanealem / Facebook";
const GALLERY_SLUG = "facebook-photos";
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif"]);

/** "Timket_2026 - procession.HEIC" → "timket-2026-procession" (letters in any script kept). */
export const slugFromName = (file: string) =>
  path
    .parse(file)
    .name.normalize("NFC")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/** "timket-2026-procession" → "Timket 2026 procession". */
export const altFromSlug = (slug: string) => {
  const text = slug.replace(/-+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const payload = await getPayload({ config });
const ctx = { overrideAccess: true } as const;
const imported: number[] = [];
const skipped: string[] = [];
const failed: string[] = [];

for (const file of readdirSync(dir).sort()) {
  if (!EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
  const slug = slugFromName(file);
  if (!slug) {
    failed.push(`${file} (no usable name)`);
    continue;
  }
  const filename = `${slug}.jpg`;
  const existing = await payload.find({ collection: "media", ...ctx, where: { filename: { equals: filename } }, limit: 1, depth: 0 });
  if (existing.docs[0]) {
    console.log(`kept     ${file} → ${filename} (media ${existing.docs[0].id})`);
    imported.push(existing.docs[0].id);
    continue;
  }

  let output: { data: Buffer; info: sharp.OutputInfo };
  try {
    // rotate() applies the EXIF orientation; sharp writes no metadata unless asked to.
    output = await sharp(readFileSync(path.join(dir, file)))
      .rotate()
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    failed.push(`${file} (could not read: ${String(error).slice(0, 80)})`);
    continue;
  }
  if (output.info.width < MIN_WIDTH) {
    skipped.push(`${file} (${output.info.width}×${output.info.height})`);
    continue;
  }

  const alt = altFromSlug(slug);
  const doc = await payload.create({
    collection: "media",
    ...ctx,
    locale: "am",
    data: { alt, credit: CREDIT, permissionObtained: false, containsMinors: false },
    file: { data: output.data, mimetype: "image/jpeg", name: filename, size: output.data.length },
  });
  for (const locale of ["en", "sv"] as const) await payload.update({ collection: "media", id: doc.id, ...ctx, locale, data: { alt } });
  console.log(`imported ${file} → ${filename} (media ${doc.id}, ${output.info.width}×${output.info.height})`);
  imported.push(doc.id);
}

if (imported.length) {
  const found = await payload.find({ collection: "galleries", ...ctx, where: { slug: { equals: GALLERY_SLUG } }, limit: 1, depth: 0 });
  const gallery = found.docs[0];
  const images = [...new Set([...((gallery?.images ?? []) as number[]), ...imported])];
  const today = stockholmInstant(stockholmDate(new Date())).toISOString();
  if (gallery) {
    await payload.update({ collection: "galleries", id: gallery.id, ...ctx, data: { images } });
  } else {
    const created = await payload.create({
      collection: "galleries",
      ...ctx,
      locale: "am",
      data: { title: "ፎቶዎች / Photos", slug: GALLERY_SLUG, date: today, date_tz: "Europe/Stockholm", images, published: false },
    });
    await payload.update({ collection: "galleries", id: created.id, ...ctx, locale: "en", data: { title: "ፎቶዎች / Photos" } });
  }
  console.log(`gallery  "ፎቶዎች / Photos" (unpublished): ${images.length} photos`);
}

console.log(`\n${imported.length} imported or kept, ${skipped.length} skipped (under ${MIN_WIDTH} px wide), ${failed.length} failed`);
for (const s of skipped) console.log(`  skipped: ${s}`);
for (const f of failed) console.log(`  failed:  ${f}`);
process.exit(0);
