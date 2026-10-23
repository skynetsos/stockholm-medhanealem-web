// One-off import of the church's own images from dev.medhanealem.se (saved in src/seed/assets/):
// the church photo (Default share image + Home page hero) and the logo (Site settings logo).
// Idempotent: an image already in Media with the same filename is reused, not uploaded again.
//   pnpm payload run scripts/import-site-assets.ts
import { readFileSync } from "fs";
import path from "path";
import { getPayload } from "payload";

import config from "../src/payload.config";

const payload = await getPayload({ config });
const ctx = () => ({ overrideAccess: true }) as const;
const assets = path.resolve("src/seed/assets");

const IMAGES = [
  { file: "church-image.jpg", mimetype: "image/jpeg", alt: "Debre Selam Medhanealem church, Bandhagen" },
  { file: "church-logo.png", mimetype: "image/png", alt: "Church logo" },
] as const;

async function importImage({ file, mimetype, alt }: (typeof IMAGES)[number]) {
  const existing = await payload.find({ collection: "media", ...ctx(), where: { filename: { equals: file } }, limit: 1, depth: 0 });
  if (existing.docs[0]) {
    console.log(`kept     ${file} (media ${existing.docs[0].id})`);
    return existing.docs[0].id;
  }
  const data = readFileSync(path.join(assets, file));
  const doc = await payload.create({
    collection: "media",
    ...ctx(),
    locale: "am",
    data: { alt, permissionObtained: true, credit: "Stockholm Medhanealem" },
    file: { data, mimetype, name: file, size: data.length },
  });
  // The alt text is translated per language; the church gave one text for all three.
  for (const locale of ["en", "sv"] as const) await payload.update({ collection: "media", id: doc.id, ...ctx(), locale, data: { alt } });
  console.log(`imported ${file} (media ${doc.id}, ${doc.width}x${doc.height})`);
  return doc.id;
}

const photo = await importImage(IMAGES[0]);
const logo = await importImage(IMAGES[1]);
await payload.updateGlobal({ slug: "site-settings", ...ctx(), data: { shareImage: photo, logo } });
const homepage = await payload.findGlobal({ slug: "homepage", ...ctx(), depth: 0 });
await payload.updateGlobal({ slug: "homepage", ...ctx(), data: { hero: { ...homepage.hero, image: photo } } });
console.log("wired: Site settings logo + default share image, Home page hero image");
process.exit(0);
