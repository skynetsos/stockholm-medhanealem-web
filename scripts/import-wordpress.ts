/**
 * WordPress migration, HTML fallback (spec Phase 1 task 7, D-040): imports the old site's public
 * content from the snapshot in src/seed/wordpress/dev-medhanealem.json (taken from the public
 * WordPress REST API of dev.medhanealem.se, the same HTML the pages show). Everything is Amharic.
 *
 *   pnpm import:wordpress            pages and teachings as DRAFTS; photos (Permission to publish
 *                                    unticked) in unpublished galleries; worship events; the video
 *   pnpm import:wordpress:publish    publishes the imported pages and teachings (development review
 *                                    only: refused when SITE_ENV=production, see below)
 *
 * Idempotent: pages/teachings are matched on section+slug / category+slug, photos on file name,
 * events and videos on their Amharic title / URL; existing records are updated, not duplicated.
 *
 * Teachings can only be published with an active clergy approver (spec §2.3). For the development
 * review the publish step records a placeholder approver account named "NOT APPROVED – development
 * review"; clergy must approve every teaching for real before production (CONTENT-CHECKLIST.md).
 */
import { readFileSync } from "fs";
import path from "path";
import { getPayload } from "payload";
import sharp from "sharp";

import config from "../src/payload.config";
import { toGregorian } from "../src/lib/ethiopian-calendar";
import { stockholmInstant } from "../src/lib/stockholm-time";
import { developmentApprover, withDevelopmentApprover } from "./lib/dev-approver";
import { htmlToLexical, type LexicalDoc, lexicalText } from "./lib/html-to-lexical";

type Snapshot = {
  source: string;
  pages: { wpId: number; path: string; title: string; html: string }[];
  media: { wpId: number; url: string; date: string; width: number; height: number }[];
};

const PUBLISH = process.env.IMPORT_PUBLISH === "1";
const snapshot = JSON.parse(readFileSync(path.resolve("src/seed/wordpress/dev-medhanealem.json"), "utf8")) as Snapshot;
const page = (wpId: number) => snapshot.pages.find((p) => p.wpId === wpId)!;
const ctx = { overrideAccess: true, locale: "am" } as const;

/** Old-site page → new page (section/slug). Titles: the old title, or ours where it was empty. */
const PAGES = [
  { wpId: 17, section: "our-church", slug: "index", title: "ስለ ቤተ ክርስቲያናችን" },
  { wpId: 227, section: "our-church", slug: "history", title: "የስቶክሆልም ደብረ ሰላም መድኃኔ ዓለም መንበረ ጵጵስና ቤተ ክርስቲያን ታሪክ በአጭሩ" },
  { wpId: 25, section: "worship", slug: "index", title: "በቤተ ክርስቲያናችን የሚሰጡት አገልግሎቶች" },
  { wpId: 217, section: "worship", slug: "weekly-service", title: "ሣምንታዊ አገልግሎት" },
  { wpId: 215, section: "worship", slug: "monthly-feast-days", title: "ወርኃዊ በዓላት", skip: ["ቅዳሴ", "መርሃ ግብር"] },
  { wpId: 213, section: "worship", slug: "annual-feast-days", title: "ዓመታዊ ዐበይት ክብረ በዓላት" },
  { wpId: 116, section: "sunday-school", slug: "index", title: "ሰንበት ት/ቤት", skip: ["ከፎቶ ማህደር"], gallery: [123] },
  // መባዕ (wpId 211) is now the church's own teaching (category "offerings", D-045); /support lists it.
] as const;

/**
 * English for the old-site pages still imported from here (draft translation for the church's
 * review, D-046); the church's own texts carry theirs in docs/content.
 */
const EN_PAGES: Record<number, { title: string; html: string }> = {
  116: {
    title: "Sunday School",
    // Same structure as the Amharic: two headed lists (review F-06).
    html: `<button>Aims of the Sunday School of Debre Selam Medhanealem Church</button>
<ol>
<li>Teaching the children and young people of the parish the true doctrine of the Ethiopian Orthodox Tewahedo Church and the traditional church education, so that they know the Church's dogma, order, tradition, history and present situation;</li>
<li>Helping young people learn the law and order of the Church and grow into citizens who are useful to their country and people, good and of upright character</li>
</ol>
<button>Two-year strategic plan</button>
<ol>
<li>Raising new, committed Sunday School members who understand the law and order of the Holy Church</li>
<li>Contributing our part so that spiritual education reaches the faithful, especially young people, in the foreign country where we live</li>
<li>Increasing our participation, as needed, in the new church building that is to be built</li>
</ol>`,
  },
};

/** Writes a page's English title and text, keeping the Amharic page's blocks (ids). */
async function setEnglishPage(id: number, wpId: number, status: "draft" | "published") {
  const en = EN_PAGES[wpId];
  if (!en) return;
  const doc = await payload.findByID({ collection: "pages", id, overrideAccess: true, draft: true, depth: 0, locale: "am", fallbackLocale: false });
  const layout = (doc.layout ?? []).map((block) => (block.blockType === "richText" ? { ...block, content: htmlToLexical(en.html) } : block));
  await payload.update({ collection: "pages", id, overrideAccess: true, locale: "en", draft: status === "draft", data: { title: en.title, layout, _status: status } as never });
}

/** Old-site sacrament pages → teachings (they feed /sacraments/<category>). */
const TEACHINGS = [
  { wpId: 27, category: "christening", slug: "christening", title: "ክርስትና" },
  { wpId: 203, category: "marriage", slug: "marriage", title: "ጋብቻ" },
  { wpId: 196, category: "fitihat", slug: "fitihat", title: "ፍትሐት" },
] as const;

/** Photos from the old media library (no event banners, templates, logos or screenshots). */
const GALLERIES = [
  { slug: "megabit-medhanealem-2016", title: "መጋቢት መድኃኔ ዓለም 2016 ዓ.ም.", date: "2024-04-05", alt: "መጋቢት መድኃኔ ዓለም በዓል በደብራችን", ids: [171, 172, 173, 174, 175, 176, 177, 178], minors: false },
  { slug: "sunday-school-photos", title: "ሰንበት ት/ቤት", date: "2024-04-10", alt: "የሰንበት ት/ቤት አባላት በደብራችን", ids: [147, 148, 149, 150, 151], minors: true },
  { slug: "diaconate-school-2016", title: "የዲቁና ትምህርት", date: "2024-09-06", alt: "የዲቁና ትምህርት በደብራችን", ids: [365, 366, 367, 368], minors: true },
  { slug: "old-website-photos", title: "ፎቶዎች ከቀድሞው ድረ ገጽ", date: "2024-03-26", alt: "በደብራችን የተነሣ ፎቶ", ids: [59, 60, 61, 62, 64], minors: false },
] as const;
const DIAGRAM = { 123: { alt: "የሰንበት ት/ቤት መዋቅር (የክፍሎች ሰንጠረዥ)", minors: false } } as const;
const CREDIT = "Stockholm Medhanealem (dev.medhanealem.se)";

/** A date from the Ethiopian calendar at a Stockholm wall time (first occurrence from 2026). */
const fromEthiopian = (month: number, day: number, year = 2019) => toGregorian({ year, month, day });
const at = (date: { year: number; month: number; day: number }, hour = 0, minute = 0) => stockholmInstant(date, { hour, minute, second: 0 }).toISOString();
const sunday = { year: 2026, month: 1, day: 4 };

/**
 * Worship events stated on the old site. Times only where the old site gives them (Sunday Kidase
 * 08:00–11:30, Wednesday and Friday prayer from 18:00); feasts are all-day until the office adds times.
 */
const EVENTS = [
  { title: "የሰንበት ቅዳሴ", en: "Sunday Kidase (Divine Liturgy)", type: "weekly_service", start: at(sunday, 8), end: at(sunday, 11, 30), recurrence: { frequency: "weekly" } },
  // Wednesday and Friday prayer: now from the church's own text (scripts/import-church-content.ts, D-045).
  ...(
    [
      ["ወርኃዊ በዓለ ቅዱስ ሚካኤል", 12, "Monthly feast of St Michael"],
      ["ወርኃዊ በዓለ እመቤታችን", 21, "Monthly feast of St Mary"],
      ["ወርኃዊ በዓለ መድኃኔ ዓለም", 27, "Monthly feast of Medhane Alem"],
    ] as const
  ).map(([title, day, en]) => ({ title, en, type: "monthly_feast", allDay: true, start: at(fromEthiopian(5, day, 2018)), recurrence: { frequency: "monthly", ethiopianDay: day } })),
  ...(
    [
      ["ርዕሰ ዐውደ ዓመት ቅዱስ ዮሐንስ (ዘመን መለወጫ)", 1, 1, "St John, New Year (Enkutatash)"],
      ["ደመራ", 1, 16, "Demera"],
      ["በዓለ መስቀል", 1, 17, "Meskel (Finding of the True Cross)"],
      ["ጥቅምት መድኃኔ ዓለም", 2, 27, "Tikimt Medhane Alem"],
      ["በዓለ ጥምቀት", 5, 11, "Timket (Epiphany)"],
      ["ቃና ዘገሊላ", 5, 12, "Kana Zegelila (Wedding at Cana)"],
      ["መጋቢት መድኃኔ ዓለም", 7, 27, "Megabit Medhane Alem"],
      ["መጋቢት በዓለ እግዚአብሔር (በዓለ ትስብእት)", 7, 29, "Feast of the Incarnation (Annunciation)"],
      ["ግንቦት ልደታ ለማርያም", 9, 1, "Ginbot Lideta (Nativity of St Mary)"],
      ["ሰኔ ቅዱስ ሚካኤል", 10, 12, "Sene St Michael"],
    ] as const
  ).map(([title, month, day, en]) => ({
    title,
    en,
    type: "annual_feast",
    allDay: true,
    start: at(fromEthiopian(month, day, month >= 5 ? 2018 : 2019)),
    recurrence: { frequency: "yearly", ethiopianMonth: month, ethiopianDay: day },
  })),
  // Sixteen days, Nehase 1–16 (review F-19).
  { title: "ጾመ ፍልሰታ (ነሐሴ 1–16)", en: "Fast of Filseta (Nehase 1–16)", type: "fast", allDay: true, start: at(fromEthiopian(12, 1, 2018)), end: at(fromEthiopian(12, 16, 2018)), recurrence: { frequency: "yearly", ethiopianMonth: 12, ethiopianDay: 1 } },
];

const VIDEO = {
  title: "ሥርዓተ ቅዳሴ ዘጥቅምት 29/2019 ዓ.ም ከስቶክሆልም ደብረ ሰላም መድኃኔ ዓለም ቤተ ክርስቲያን",
  url: "https://www.youtube.com/watch?v=CF-hxD-tDds",
  date: "2026-11-08",
  en: "Divine Liturgy of Tikimt 29, 2019 E.C., from Debre Selam Medhanealem Church, Stockholm",
};

const payload = await getPayload({ config });
const log = (what: string, detail: string) => console.log(`${what.padEnd(9)} ${detail}`);

/** The page's text; a first heading that only repeats the title is left out (the page shows the title). */
const content = (wpId: number, title: string, skip: readonly string[] = []): LexicalDoc => {
  const doc = htmlToLexical(page(wpId).html, [...skip]);
  const first = doc.root.children[0];
  if (first?.type === "heading" && lexicalText({ root: { ...doc.root, children: [first] } }) === title) doc.root.children.shift();
  if (!doc.root.children.length) throw new Error(`Page ${wpId} has no text`);
  return doc;
};

async function upsert<T extends "pages" | "teachings">(collection: T, where: Record<string, unknown>, data: Record<string, unknown>) {
  const found = await payload.find({ collection, ...ctx, where: where as never, limit: 1, depth: 0, draft: true });
  const existing = found.docs[0] as { id: number; contentKey?: string | null } | undefined;
  // The church's own written text (D-045) replaces the old site's: never overwrite it.
  if (existing?.contentKey) {
    log("kept", `${collection} ${existing.id}: church content (${existing.contentKey})`);
    return { id: existing.id, created: false, kept: true };
  }
  if (existing) {
    await payload.update({ collection, id: existing.id, ...ctx, draft: true, data: data as never });
    return { id: existing.id, created: false, kept: false };
  }
  const doc = await payload.create({ collection, ...ctx, draft: true, data: { ...data, _status: "draft" } as never });
  return { id: doc.id, created: true, kept: false };
}

/** Downloads an old-site photo, strips metadata, stores it without permission to publish. */
async function importPhoto(wpId: number, alt: string, minors: boolean, gallery?: string): Promise<number | null> {
  const item = snapshot.media.find((m) => m.wpId === wpId);
  if (!item) return null;
  const filename = `wp-${wpId}-${decodeURIComponent(path.basename(item.url)).replace(/\.[a-z]+$/i, "").normalize("NFC").replace(/[^\p{L}\p{N}-]+/gu, "-").toLowerCase()}.jpg`;
  const existing = await payload.find({ collection: "media", overrideAccess: true, where: { filename: { equals: filename } }, limit: 1, depth: 0 });
  if (existing.docs[0]) return existing.docs[0].id;
  const response = await fetch(item.url, { headers: { "user-agent": "Mozilla/5.0 (church-site-migration)" }, signal: AbortSignal.timeout(90_000) });
  if (!response.ok) {
    log("failed", `${item.url} (${response.status})`);
    return null;
  }
  const output = await sharp(Buffer.from(await response.arrayBuffer())).rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  const doc = await payload.create({
    collection: "media",
    ...ctx,
    data: { alt, credit: CREDIT, permissionObtained: false, containsMinors: minors, caption: gallery },
    file: { data: output, mimetype: "image/jpeg", name: filename, size: output.length },
  });
  log("photo", `${filename} (media ${doc.id})`);
  return doc.id;
}

async function importAll() {
  // Images used on pages, then the photo galleries (unpublished).
  const pageImages = new Map<number, number>();
  for (const [wpId, d] of Object.entries(DIAGRAM)) {
    const id = await importPhoto(Number(wpId), d.alt, d.minors);
    if (id) pageImages.set(Number(wpId), id);
  }
  for (const g of GALLERIES) {
    const images: number[] = [];
    for (const [i, wpId] of g.ids.entries()) {
      const id = await importPhoto(wpId, `${g.alt} (${i + 1})`, g.minors);
      if (id) images.push(id);
    }
    if (!images.length) continue;
    const found = await payload.find({ collection: "galleries", overrideAccess: true, where: { slug: { equals: g.slug } }, limit: 1, depth: 0 });
    const data = { title: g.title, slug: g.slug, date: at({ year: +g.date.slice(0, 4), month: +g.date.slice(5, 7), day: +g.date.slice(8, 10) }), date_tz: "Europe/Stockholm" as const, images };
    if (found.docs[0]) await payload.update({ collection: "galleries", id: found.docs[0].id, ...ctx, data });
    else await payload.create({ collection: "galleries", ...ctx, data: { ...data, published: false } });
    log("gallery", `${g.title} (${images.length} photos, unpublished)`);
  }

  for (const p of PAGES) {
    const layout: Record<string, unknown>[] = [{ blockType: "richText", content: content(p.wpId, p.title, "skip" in p ? p.skip : []) }];
    const images = ("gallery" in p ? p.gallery : []).map((id) => pageImages.get(id)).filter(Boolean);
    if (images.length) layout.push({ blockType: "imageGallery", images });
    const result = await upsert("pages", { and: [{ section: { equals: p.section } }, { slug: { equals: p.slug } }] }, { title: p.title, section: p.section, slug: p.slug, layout });
    if (result.kept) continue;
    await setEnglishPage(result.id, p.wpId, "draft");
    log(result.created ? "page" : "updated", `${p.section}/${p.slug} ← ${page(p.wpId).path}`);
  }
  for (const t of TEACHINGS) {
    const result = await upsert("teachings", { and: [{ category: { equals: t.category } }, { slug: { equals: t.slug } }] }, { title: t.title, category: t.category, slug: t.slug, body: content(t.wpId, t.title) });
    if (result.kept) continue;
    log(result.created ? "teaching" : "updated", `${t.category}/${t.slug} ← ${page(t.wpId).path}`);
  }

  for (const { en, ...e } of EVENTS) {
    const data = { ...e, start_tz: "Europe/Stockholm", ...("end" in e ? { end_tz: "Europe/Stockholm" } : {}) };
    const found = await payload.find({ collection: "events", ...ctx, where: { title: { equals: e.title } }, limit: 1, depth: 0 });
    const id = found.docs[0]
      ? (await payload.update({ collection: "events", id: found.docs[0].id, ...ctx, data: data as never })).id
      : (await payload.create({ collection: "events", ...ctx, data: data as never })).id;
    // English title (draft translation for the church's review, D-046).
    await payload.update({ collection: "events", id, ...ctx, locale: "en", data: { title: en } });
    log("event", `${e.title} / ${en}`);
  }

  const video = await payload.find({ collection: "videos", overrideAccess: true, where: { url: { equals: VIDEO.url } }, limit: 1, depth: 0 });
  let videoId = video.docs[0]?.id;
  if (!videoId) {
    const [y, m, d] = VIDEO.date.split("-").map(Number);
    videoId = (await payload.create({ collection: "videos", ...ctx, data: { title: VIDEO.title, kind: "video", category: "liturgy", url: VIDEO.url, date: at({ year: y, month: m, day: d }), date_tz: "Europe/Stockholm" } as never })).id;
  }
  await payload.update({ collection: "videos", id: videoId, ...ctx, locale: "en", data: { title: VIDEO.en } });
  log("video", VIDEO.title);
}

async function publishAll() {
  if (process.env.SITE_ENV === "production") throw new Error("Publishing imported content with a placeholder approval is for development review only.");
  for (const p of PAGES) {
    const { docs } = await payload.find({ collection: "pages", ...ctx, draft: true, where: { and: [{ section: { equals: p.section } }, { slug: { equals: p.slug } }] }, limit: 1, depth: 0 });
    if (!docs[0]) throw new Error(`Run the import first: ${p.section}/${p.slug} is missing`);
    if ((docs[0] as { contentKey?: string | null }).contentKey) continue; // the church's text: published by content:publish
    await payload.update({ collection: "pages", id: docs[0].id, ...ctx, data: { _status: "published" } });
    await setEnglishPage(docs[0].id, p.wpId, "published");
    log("published", `page ${p.section}/${p.slug}`);
  }
  const approver = await developmentApprover(payload);
  for (const t of TEACHINGS) {
    const { docs } = await payload.find({ collection: "teachings", ...ctx, draft: true, where: { and: [{ category: { equals: t.category } }, { slug: { equals: t.slug } }] }, limit: 1, depth: 0 });
    if (!docs[0]) throw new Error(`Run the import first: teaching ${t.slug} is missing`);
    if ((docs[0] as { contentKey?: string | null }).contentKey) continue; // the church's text: published by content:publish
    await payload.update({ collection: "teachings", id: docs[0].id, ...ctx, data: { _status: "published", approvedBy: approver } as never });
    log("published", `teaching ${t.category}/${t.slug} (placeholder approval – clergy must approve)`);
  }
}

// The placeholder approver is active only during this run (development; review F-24).
await withDevelopmentApprover(payload, () => (PUBLISH ? publishAll() : importAll()));
console.log(`\nSource: ${snapshot.source}`);
process.exit(0);
