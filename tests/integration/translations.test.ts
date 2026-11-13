/** Translation workflow (spec Phase 3 tasks 1–2, D-041): missing translations, publish rule, Swedish switch. */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { hasText, reportLocales, translationReport } from "../../src/lib/translations/coverage";
import { type Actor, as, createActor, noRevalidate, rich } from "./helpers";

let payload: Payload;
let editor: Actor;
let superAdmin: Actor;
const ctx = { overrideAccess: true, context: noRevalidate } as const;

async function amPage(slug: string) {
  return payload.create({
    collection: "pages",
    ...ctx,
    locale: "am",
    data: { title: `ገጽ ${slug}`, section: "other", slug, _status: "published", layout: [{ blockType: "richText", content: rich("ጽሑፍ") }] },
  });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  editor = await createActor(payload, "tr-editor@test.local", ["editor"]);
  superAdmin = await createActor(payload, "tr-root@test.local", ["super_admin"]);
});

afterAll(async () => {
  await payload.updateGlobal({ slug: "site-settings", ...ctx, data: { swedishPublic: false } });
  await payload?.destroy();
});

describe("missing translations report", () => {
  it("lists live Amharic content without its own English text, and counts what is translated", async () => {
    const untranslated = await amPage("tr-untranslated");
    const translated = await amPage("tr-translated");
    await payload.update({
      collection: "pages",
      id: translated.id,
      ...ctx,
      locale: "en",
      data: { title: "Translated", layout: [{ id: translated.layout![0].id, blockType: "richText", content: rich("Text") }] },
    });
    // A draft doesn't count: it isn't on the site.
    await payload.create({ collection: "pages", ...ctx, locale: "am", draft: true, data: { title: "ረቂቅ", section: "other", slug: "tr-draft", _status: "draft" } });

    const report = await translationReport(payload, "en");
    const pages = report.collections.find((c) => c.collection === "pages")!;
    const ids = pages.missing.map((m) => m.id);
    expect(ids).toContain(untranslated.id);
    expect(ids).not.toContain(translated.id);
    expect(pages.missing.find((m) => m.id === untranslated.id)!.missing).toEqual(["title", "layout"]);
    expect(report.coreTotal).toBeGreaterThanOrEqual(2);
    expect(report.corePercent).toBe(Math.floor((report.coreTranslated / report.coreTotal) * 100));
  });

  it("sees text in rich text and blocks, not in ids, links or settings", () => {
    expect(hasText(rich("ሀ"))).toBe(true);
    expect(hasText(rich(" "))).toBe(false);
    expect(hasText([{ id: "x", blockType: "callToAction", url: "https://example.org", appearance: "primary" }])).toBe(false);
    expect(hasText([{ id: "x", blockType: "richText", content: null }])).toBe(false);
  });

  it("shows translators only their languages; editors every translation", () => {
    expect(reportLocales({ roles: ["translator"], translatorLocales: ["sv"] })).toEqual(["sv"]);
    expect(reportLocales({ roles: ["editor"] })).toEqual(["en", "sv"]);
    expect(reportLocales({ roles: ["finance"] })).toEqual([]);
  });
});

describe("publishing a page in a language", () => {
  it("needs that language's own title and text", async () => {
    const page = await amPage("tr-publish-rule");
    // English without its own text: refused while publishing, allowed as a draft.
    await expect(
      payload.update({ collection: "pages", id: page.id, ...as(editor), locale: "en", data: { title: "Only a title", _status: "published" } }),
    ).rejects.toThrow(/needs its own text/);
    await expect(
      payload.update({ collection: "pages", id: page.id, ...as(editor), locale: "en", draft: true, data: { title: "Only a title", _status: "draft" } }),
    ).resolves.toBeTruthy();
    await expect(
      payload.update({
        collection: "pages",
        id: page.id,
        ...as(editor),
        locale: "en",
        data: { title: "Translated", layout: [{ id: page.layout![0].id, blockType: "richText", content: rich("Text") }], _status: "published" },
      }),
    ).resolves.toBeTruthy();
  });

  it("an Amharic page without text can't be published", async () => {
    await expect(
      payload.create({ collection: "pages", ...as(editor), locale: "am", data: { title: "ባዶ", section: "other", slug: "tr-empty", _status: "published" } }),
    ).rejects.toThrow(/needs its own text/);
  });
});

describe("Swedish on the public site", () => {
  it("can be switched on only once 80 % of core content is translated into Swedish", async () => {
    const report = await translationReport(payload, "sv");
    expect(report.corePercent).toBeLessThan(80);
    await expect(
      payload.updateGlobal({ slug: "site-settings", ...as(superAdmin), data: { swedishPublic: true } }),
    ).rejects.toMatchObject({ data: { errors: [expect.objectContaining({ message: expect.stringMatching(/switched on at 80 %/) })] } });
    // Switching it off is always allowed.
    await expect(payload.updateGlobal({ slug: "site-settings", ...as(superAdmin), data: { swedishPublic: false } })).resolves.toBeTruthy();
  });
});
