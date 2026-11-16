/**
 * `pnpm events:church-year` — the feasts and fasts of the coming church year that a yearly Ethiopian-
 * date rule can't express (review F-05): Genna (Tahsas 29, or 28 before a leap year — always 7 January)
 * and the movable feasts and fasts that follow Fasika. Computed with the site's tested calendar
 * functions (src/lib/ethiopian-calendar.ts), entered as all-day, one-time events in Amharic and
 * English. Times and confirmation are for the office (CONTENT-CHECKLIST.md); run it again each year
 * (CHURCH_YEAR=2020 for a given Ethiopian year). Idempotent: matched on the content key
 * "church-year:<year>:<key>".
 */
import { getPayload } from "payload";

import config from "../src/payload.config";
import { fasika, type GregorianDate, gregorianToJdn, jdnToGregorian, stockholmDate, toEthiopian, toGregorian } from "../src/lib/ethiopian-calendar";
import { stockholmInstant } from "../src/lib/stockholm-time";

/** The church year to enter: the one that has started (from Meskerem 1), unless CHURCH_YEAR is set. */
const year = Number(process.env.CHURCH_YEAR) || toEthiopian(stockholmDate(new Date())).year;
/** Fasika of the church year: it falls in the Gregorian year after Meskerem 1. */
const easter = fasika(toGregorian({ year, month: 1, day: 1 }).year + 1);
const shift = (date: GregorianDate, days: number) => jdnToGregorian(gregorianToJdn(date) + days);
const midnight = (date: GregorianDate) => stockholmInstant(date, { hour: 0, minute: 0, second: 0 }).toISOString();

type Entry = { key: string; type: "annual_feast" | "fast"; am: string; en: string; start: GregorianDate; end?: GregorianDate };
const ENTRIES: Entry[] = [
  // Hidar 15 – Tahsas 28 (the day before Genna).
  { key: "tsome-nebiyat", type: "fast", am: "ጾመ ነቢያት", en: "Fast of the Prophets (Tsome Nebiyat)", start: toGregorian({ year, month: 3, day: 15 }), end: { year: toGregorian({ year, month: 1, day: 1 }).year + 1, month: 1, day: 6 } },
  { key: "genna", type: "annual_feast", am: "በዓለ ልደት (ገና)", en: "Christmas (Genna)", start: { year: toGregorian({ year, month: 1, day: 1 }).year + 1, month: 1, day: 7 } },
  // 55 days: from the Monday 8 weeks before Fasika to Holy Saturday.
  { key: "abiy-tsom", type: "fast", am: "ዐቢይ ጾም", en: "Great Lent (Abiy Tsom)", start: shift(easter, -55), end: shift(easter, -1) },
  { key: "hosanna", type: "annual_feast", am: "ሆሣዕና", en: "Hosanna (Palm Sunday)", start: shift(easter, -7) },
  { key: "siklet", type: "annual_feast", am: "ስቅለት", en: "Good Friday (Siklet)", start: shift(easter, -2) },
  { key: "fasika", type: "annual_feast", am: "በዓለ ትንሣኤ (ፋሲካ)", en: "Easter (Fasika)", start: easter },
  { key: "erget", type: "annual_feast", am: "በዓለ ዕርገት", en: "Ascension (Erget)", start: shift(easter, 39) },
];

const payload = await getPayload({ config });
const ctx = { overrideAccess: true, locale: "am" } as const;
for (const entry of ENTRIES) {
  const contentKey = `church-year:${year}:${entry.key}`;
  const data = {
    title: entry.am,
    type: entry.type,
    allDay: true,
    start: midnight(entry.start),
    start_tz: "Europe/Stockholm",
    ...(entry.end ? { end: midnight(entry.end), end_tz: "Europe/Stockholm" } : {}),
    recurrence: { frequency: "none" },
    contentKey,
  };
  const found = await payload.find({ collection: "events", ...ctx, where: { contentKey: { equals: contentKey } }, limit: 1, depth: 0 });
  const id = found.docs[0]
    ? (await payload.update({ collection: "events", id: found.docs[0].id, ...ctx, data: data as never })).id
    : (await payload.create({ collection: "events", ...ctx, data: data as never })).id;
  await payload.update({ collection: "events", id, ...ctx, locale: "en", data: { title: entry.en } });
  const span = entry.end ? ` – ${entry.end.year}-${String(entry.end.month).padStart(2, "0")}-${String(entry.end.day).padStart(2, "0")}` : "";
  console.log(`${found.docs[0] ? "updated" : "event  "} ${entry.start.year}-${String(entry.start.month).padStart(2, "0")}-${String(entry.start.day).padStart(2, "0")}${span}  ${entry.am} / ${entry.en}`);
}
console.log(`\nChurch year ${year} E.C. (Fasika ${easter.year}-${easter.month}-${easter.day}). Times and confirmation: office (CONTENT-CHECKLIST.md).`);
process.exit(0);
