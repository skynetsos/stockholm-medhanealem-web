/**
 * Imports the church's written website content (docs/content/church-content-<date>.md, made from
 * their Word document by `pnpm content:convert`) into the CMS — D-045.
 *
 *   pnpm content:import    pages and teachings as DRAFTS (text replaced, nothing else changed),
 *                          the weekly events the text describes, the superseded /support page
 *                          (old site's መባዕ) unpublished
 *   pnpm content:publish   publishes them for the development review (refused with
 *                          SITE_ENV=production; teachings get the placeholder approver
 *                          "NOT APPROVED – development review")
 *
 * Idempotent: every item carries a content key ("church:<key>"); a re-import updates the item with
 * that key (first time: the item at the mapped address, e.g. the old site's history page). The
 * newest docs/content/church-content-*.md is used, or CONTENT_FILE. Its English translation, the
 * same name ending in .en.md (draft translation for the church's review, D-046), goes into the
 * English version of each item when it exists.
 */
import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";
import { getPayload } from "payload";

import config from "../src/payload.config";
import { stockholmInstant } from "../src/lib/stockholm-time";
import { CONTENT_SECTIONS, parseMarkdown, type ParsedSection, toLexical } from "./lib/church-content";
import { developmentApprover, withDevelopmentApprover } from "./lib/dev-approver";

const PUBLISH = process.env.IMPORT_PUBLISH === "1";
const dir = path.resolve("docs/content");
const file =
  process.env.CONTENT_FILE ??
  path.join(
    dir,
    readdirSync(dir)
      .filter((f) => /^church-content-\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .at(-1)!,
  );
const sections = parseMarkdown(readFileSync(file, "utf8"));
const englishFile = file.replace(/\.md$/, ".en.md");
const english = existsSync(englishFile) ? parseMarkdown(readFileSync(englishFile, "utf8")) : [];
const payload = await getPayload({ config });
const ctx = { overrideAccess: true, locale: "am", context: {} } as const;
const log = (what: string, detail: string) => console.log(`${what.padEnd(10)} ${detail}`);
const key = (k: string) => `church:${k}`;

/** The section's text, plus any sections appended to it (the About page's closing words). */
function blocksFor(section: ParsedSection, from: ParsedSection[] = sections): ParsedSection["blocks"] {
  const appended = CONTENT_SECTIONS.filter((s) => s.appendTo === section.key).flatMap((s) => from.find((p) => p.key === s.key)?.blocks ?? []);
  return [...section.blocks, ...appended];
}

type Locale = "am" | "en";
const LOCALES: Locale[] = english.length ? ["am", "en"] : ["am"];

/** The data of one language version of an item: title and text (pages keep their block ids). */
async function localeData(collection: "pages" | "teachings", id: number, key: string, locale: Locale) {
  const parsed = (locale === "am" ? sections : english).find((s) => s.key === key);
  if (!parsed) return null;
  const content = toLexical(blocksFor(parsed, locale === "am" ? sections : english));
  if (collection === "teachings") return { title: parsed.title, body: content };
  const doc = await payload.findByID({ collection: "pages", id, ...ctx, draft: true, depth: 0, fallbackLocale: false });
  const blocks = doc.layout ?? [];
  const index = blocks.findIndex((b) => b.blockType === "richText");
  const layout = index < 0 ? [{ blockType: "richText", content }] : blocks.map((b, i) => (i === index ? { ...b, content } : b));
  return { title: parsed.title, layout };
}

/** Finds the item by content key, else at its mapped address (first import), else null. */
async function findItem(collection: "pages" | "teachings", contentKey: string, where: Record<string, unknown>) {
  for (const condition of [{ contentKey: { equals: contentKey } }, where]) {
    const found = await payload.find({ collection, ...ctx, where: condition as never, limit: 1, depth: 0, draft: true });
    if (found.docs[0]) return found.docs[0] as { id: number; contentKey?: string | null };
  }
  return null;
}

/** Weekly events the text describes (D-045). Times only where the text gives them. */
const sunday = { year: 2026, month: 1, day: 4 }; // a Sunday in winter time, to anchor weekdays
const day = (offset: number) => ({ year: 2026, month: 1, day: sunday.day + offset });
const at = (d: { year: number; month: number; day: number }, hour = 0, minute = 0) => stockholmInstant(d, { hour, minute, second: 0 }).toISOString();
const PRAYER = "ጸሎተ ምህላ እና ትምህርተ ወንጌል";
const WEEKDAYS = ["ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዐርብ"] as const;
const WEEKDAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const EVENTS = [
  // ለ᎖ "every Wednesday and Friday … from 18:00 Swedish time" (no end time given).
  { key: "event:prayer-wednesday", old: "ጸሎተ ምህላና ትምህርተ ወንጌል (ረቡዕ)", en: "Prayer (Mehlela) and Gospel teaching (Wednesday)", data: { title: `${PRAYER} (ረቡዕ)`, type: "weekly_service", start: at(day(3), 18) } },
  { key: "event:prayer-friday", old: "ጸሎተ ምህላና ትምህርተ ወንጌል (ዐርብ)", en: "Prayer (Mehlela) and Gospel teaching (Friday)", data: { title: `${PRAYER} (ዐርብ)`, type: "weekly_service", start: at(day(5), 18) } },
  // ሐ᎖ Saturday diaconate class for children and the Amharic school (no time given: all day).
  { key: "event:saturday-school", en: "Deacon and Amharic school (Saturday)", data: { title: "የዲቁና እና የአማርኛ ትምህርት (ቅዳሜ)", type: "weekly_service", allDay: true, start: at(day(6)) } },
  // ሠ᎖ Monday–Friday 8–12: counselling (time as written; to confirm). Shown in the calendar only.
  ...WEEKDAYS.map((name, i) => ({
    key: `event:pastoral-hours-${i + 1}`,
    en: `Counselling (${WEEKDAYS_EN[i]})`,
    data: { title: `የምክር አገልግሎት (${name})`, type: "notice", start: at(day(i + 1), 8), end: at(day(i + 1), 12) },
  })),
] as const;

async function importAll() {
  for (const section of CONTENT_SECTIONS) {
    if (section.appendTo) continue;
    const parsed = sections.find((s) => s.key === section.key);
    if (!parsed) {
      log("MISSING", `section ${section.key} is not in ${path.basename(file)}`);
      continue;
    }
    const contentKey = key(section.key);
    const content = toLexical(blocksFor(parsed));
    if (section.target.kind === "page") {
      const { section: pageSection, slug } = section.target;
      const existing = await findItem("pages", contentKey, { and: [{ section: { equals: pageSection } }, { slug: { equals: slug } }] });
      const data = { title: parsed.title, section: pageSection, slug, contentKey, layout: [{ blockType: "richText", content }] };
      const id = existing
        ? (await payload.update({ collection: "pages", id: existing.id, ...ctx, draft: true, data: data as never })).id
        : (await payload.create({ collection: "pages", ...ctx, draft: true, data: { ...data, _status: "draft" } as never })).id;
      const en = english.length ? await localeData("pages", id, section.key, "en") : null;
      if (en) await payload.update({ collection: "pages", id, ...ctx, locale: "en", draft: true, data: en as never });
      log(existing ? "updated" : "page", `${pageSection}/${slug} ← ${section.key}${en ? " (+ English)" : ""}`);
    } else {
      const { category, slug } = section.target;
      const existing = await findItem("teachings", contentKey, { and: [{ category: { equals: category } }, { slug: { equals: slug } }] });
      const data = { title: parsed.title, category, slug, contentKey, body: content };
      const id = existing
        ? (await payload.update({ collection: "teachings", id: existing.id, ...ctx, draft: true, data: data as never })).id
        : (await payload.create({ collection: "teachings", ...ctx, draft: true, data: { ...data, _status: "draft" } as never })).id;
      const en = english.length ? await localeData("teachings", id, section.key, "en") : null;
      if (en) await payload.update({ collection: "teachings", id, ...ctx, locale: "en", draft: true, data: en as never });
      log(existing ? "updated" : "teaching", `${category}/${slug} ← ${section.key}${en ? " (+ English)" : ""}`);
    }
  }

  // The old site's መባዕ page under /support: superseded by the teaching (/support now lists it).
  const support = await payload.find({ collection: "pages", ...ctx, where: { and: [{ section: { equals: "support" } }, { slug: { equals: "index" } }, { contentKey: { exists: false } }] }, limit: 1, depth: 0 });
  if (support.docs[0] && support.docs[0]._status === "published") {
    await payload.update({ collection: "pages", id: support.docs[0].id, ...ctx, data: { _status: "draft" } });
    log("unpublished", "support/index (old site's መባዕ, superseded)");
  }

  for (const event of EVENTS) {
    const contentKey = key(event.key);
    const byKey = await payload.find({ collection: "events", ...ctx, where: { contentKey: { equals: contentKey } }, limit: 1, depth: 0 });
    const byOld = "old" in event ? await payload.find({ collection: "events", ...ctx, where: { title: { equals: event.old } }, limit: 1, depth: 0 }) : null;
    const existing = byKey.docs[0] ?? byOld?.docs[0];
    const data = { ...event.data, contentKey, recurrence: { frequency: "weekly" }, start_tz: "Europe/Stockholm", ...("end" in event.data ? { end_tz: "Europe/Stockholm" } : {}) };
    const id = existing
      ? (await payload.update({ collection: "events", id: existing.id, ...ctx, data: data as never })).id
      : (await payload.create({ collection: "events", ...ctx, data: data as never })).id;
    // English title: draft translation for the church's review (D-046).
    await payload.update({ collection: "events", id, ...ctx, locale: "en", data: { title: event.en } });
    log(existing ? "updated" : "event", `${event.data.title} / ${event.en}`);
  }
}

async function publishAll() {
  const approver = await developmentApprover(payload); // refuses SITE_ENV=production
  for (const section of CONTENT_SECTIONS.filter((s) => !s.appendTo)) {
    const collection = section.target.kind === "page" ? "pages" : "teachings";
    const found = await payload.find({ collection, ...ctx, draft: true, where: { contentKey: { equals: key(section.key) } }, limit: 1, depth: 0 });
    const doc = found.docs[0];
    if (!doc) throw new Error(`Run pnpm content:import first: ${section.key} is missing`);
    // Each language: publish its newest text (title and body), not just the status.
    for (const locale of LOCALES) {
      const data = await localeData(collection, doc.id, section.key, locale);
      if (!data) continue;
      await payload.update({
        collection,
        id: doc.id,
        ...ctx,
        locale,
        data: { ...data, _status: "published", ...(collection === "teachings" ? { approvedBy: approver } : {}) } as never,
      });
    }
    log("published", `${collection === "pages" ? "page" : "teaching"} ${section.key} (${LOCALES.join(" + ")})${collection === "teachings" ? " (placeholder approval – clergy must approve)" : ""}`);
  }
}

// The placeholder approver is active only during this run (development; review F-24).
await withDevelopmentApprover(payload, () => (PUBLISH ? publishAll() : importAll()));
console.log(`\nSource: ${path.relative(process.cwd(), file)}`);
process.exit(0);
