/** Site search (spec Phase 3 task 6, D-043): Postgres full-text per language, Ethiopic sanity test. */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { cleanQuery, MARK_END, MARK_START, queryWords, searchSite } from "../../src/lib/search";
import { noRevalidate, rich } from "./helpers";

let payload: Payload;
const ctx = { overrideAccess: true, context: noRevalidate } as const;
const titles = async (locale: "am" | "en" | "sv", q: string) => (await searchSite(payload, locale, q)).map((r) => r.title);

let clergyId: number;

beforeAll(async () => {
  payload = await getPayload({ config });
  clergyId = (await payload.create({ collection: "users", ...ctx, data: { email: "search-clergy@test.local", password: "Search-test-Pa55!", name: "Clergy", roles: ["clergy_approver"], active: true } })).id;

  const page = await payload.create({
    collection: "pages",
    ...ctx,
    locale: "am",
    data: {
      title: "የሰንበት ቅዳሴ መርሐ ግብር",
      section: "worship",
      slug: "search-kidase",
      _status: "published",
      layout: [{ blockType: "richText", content: rich("በየሣምንቱ እሁድ ቅዳሴው ይቀደሳል። ጸሎተ ምህላ፣ ትምህርተ ወንጌል ይሰጣል።") }],
    },
  });
  await payload.update({
    collection: "pages",
    id: page.id,
    ...ctx,
    locale: "en",
    data: { title: "Sunday services", layout: [{ id: page.layout![0].id, blockType: "richText", content: rich("Every Sunday the Kidase is celebrated, followed by teaching.") }] },
  });
  // A teaching in Amharic only: English searches find it (and show it) in Amharic.
  await payload.create({
    collection: "teachings",
    ...ctx,
    locale: "am",
    data: { title: "ስለ ጾመ ፍልሰታ", category: "fasting", slug: "search-filseta", body: rich("ጾመ ፍልሰታ በነሐሴ ወር ይጾማል።"), _status: "published", approvedBy: clergyId } as never,
  });
  // Drafts are never found.
  await payload.create({ collection: "pages", ...ctx, locale: "am", draft: true, data: { title: "ረቂቅ ቅዳሴ", section: "other", slug: "search-draft", _status: "draft" } });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("Ethiopic text (sanity test)", () => {
  it("finds whole Amharic words, separated by spaces or Ethiopic punctuation (። ፣)", async () => {
    expect(await titles("am", "ቅዳሴ")).toContain("የሰንበት ቅዳሴ መርሐ ግብር");
    expect(await titles("am", "ምህላ")).toContain("የሰንበት ቅዳሴ መርሐ ግብር"); // followed by ፣
    expect(await titles("am", "ይቀደሳል")).toContain("የሰንበት ቅዳሴ መርሐ ግብር"); // followed by ።
  });

  it("finds a word with an attached prefix (ሰንበት in የሰንበት)", async () => {
    expect(await titles("am", "ሰንበት")).toContain("የሰንበት ቅዳሴ መርሐ ግብር");
  });

  it("needs every word of a multi-word query", async () => {
    expect(await titles("am", "ጾመ ፍልሰታ")).toEqual(["ስለ ጾመ ፍልሰታ"]);
    expect(await titles("am", "ፍልሰታ ቅዳሴ")).toEqual([]);
  });

  it("never returns drafts", async () => {
    expect(await titles("am", "ረቂቅ")).toEqual([]);
  });
});

describe("per language", () => {
  it("English uses stemming (services → service) and the English text", async () => {
    const results = await searchSite(payload, "en", "service");
    expect(results.map((r) => r.title)).toContain("Sunday services");
    const hit = results.find((r) => r.title === "Sunday services")!;
    expect(hit).toMatchObject({ kind: "page", path: "/worship/search-kidase", lang: "en" });
  });

  it("untranslated items are searched and shown in Amharic, marked as such", async () => {
    const [hit] = await searchSite(payload, "en", "ፍልሰታ");
    expect(hit).toMatchObject({ title: "ስለ ጾመ ፍልሰታ", kind: "teaching", path: "/our-faith/search-filseta", lang: "am" });
    expect(hit.snippet).toContain(`${MARK_START}ፍልሰታ${MARK_END}`);
  });

  it("handles operators, quotes and odd input without errors", async () => {
    for (const q of ['"Sunday services"', "Kidase OR fasting", "-Kidase Sunday", "'; drop table pages; --", "%_\\", "((("]) {
      await expect(searchSite(payload, "en", q), q).resolves.toBeInstanceOf(Array);
    }
    expect(await titles("en", "'; drop table pages; --")).toEqual([]);
  });
});

describe("query clean-up", () => {
  it("trims, collapses spaces and caps the length", () => {
    expect(cleanQuery("  ቅዳሴ   እሁድ ")).toBe("ቅዳሴ እሁድ");
    expect(cleanQuery("x".repeat(500))).toHaveLength(100);
    expect(cleanQuery(["a", "b"])).toBe("a");
    expect(cleanQuery(undefined)).toBe("");
  });

  it("uses 2+ letter words, without operators, for matching inside words", () => {
    expect(queryWords('"የሰንበት ቅዳሴ" OR -x a')).toEqual(["የሰንበት", "ቅዳሴ"]);
  });
});
