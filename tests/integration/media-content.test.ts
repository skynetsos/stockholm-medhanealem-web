/** Galleries (§2.9), Videos (§2.10), Posts (§2.11) and the Homepage global (§2.15), with §3 access. */
import { getPayload, type Payload } from "payload";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { HOME_SECTIONS } from "../../src/globals/Homepage";
import { type Actor, as, createActor, noRevalidate, rich } from "./helpers";

let payload: Payload;
let editor: Actor;
let clergy: Actor;
let translatorEn: Actor;
const mediaIds: number[] = [];
const TZ = "Europe/Stockholm" as const;

async function image(permissionObtained: boolean) {
  const data = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#c8a24a" } }).png().toBuffer();
  const doc = await payload.create({
    collection: "media",
    overrideAccess: true,
    data: { alt: "Photo", permissionObtained },
    file: { data, mimetype: "image/png", name: `gallery-${Date.now()}-${Math.random()}.png`, size: data.length },
  });
  mediaIds.push(doc.id);
  return doc.id;
}

beforeAll(async () => {
  payload = await getPayload({ config });
  editor = await createActor(payload, "mc-editor@test.local", ["editor"]);
  clergy = await createActor(payload, "mc-clergy@test.local", ["clergy_approver"]);
  translatorEn = await createActor(payload, "mc-translator@test.local", ["translator"], { translatorLocales: ["en"] });
});

afterAll(async () => {
  for (const id of mediaIds) await payload.delete({ collection: "media", id, overrideAccess: true }).catch(() => undefined);
  await payload?.destroy();
});

describe("galleries", () => {
  it("can be published only with at least one permitted image; the public sees published ones", async () => {
    const restricted = await image(false);
    const permitted = await image(true);
    const base = { title: "ጥምቀት 2027", date: "2027-01-18T23:00:00.000Z", date_tz: TZ };

    await expect(
      payload.create({ collection: "galleries", ...as(editor), data: { ...base, slug: "timket-a", images: [restricted], published: true } }),
    ).rejects.toThrow(/Permission to publish/);

    const draft = await payload.create({ collection: "galleries", ...as(editor), data: { ...base, slug: "timket-b", images: [restricted, permitted] } });
    expect((await payload.find({ collection: "galleries", overrideAccess: false, where: { id: { equals: draft.id } } })).totalDocs).toBe(0);
    await payload.update({ collection: "galleries", id: draft.id, ...as(editor), data: { published: true } });
    expect((await payload.find({ collection: "galleries", overrideAccess: false, where: { id: { equals: draft.id } } })).totalDocs).toBe(1);
  });
});

describe("videos", () => {
  it("accept only YouTube/Vimeo links and default to click-to-load", async () => {
    const data = { title: "ቅዳሴ", kind: "video" as const, category: "liturgy" as const, date: "2026-10-03T22:00:00.000Z", date_tz: TZ };
    await expect(payload.create({ collection: "videos", ...as(editor), data: { ...data, url: "https://evil.example/v" } })).rejects.toThrow();
    const video = await payload.create({ collection: "videos", ...as(editor), data: { ...data, url: "https://youtu.be/dQw4w9WgXcQ" } });
    expect(video.consentRequired).toBe(true);
    expect((await payload.find({ collection: "videos", overrideAccess: false, where: { id: { equals: video.id } } })).totalDocs).toBe(1);
  });
});

describe("posts (news)", () => {
  it("drafts are private; publishing sets the date and the author", async () => {
    const post = await payload.create({
      collection: "posts",
      ...as(editor),
      locale: "am",
      draft: true,
      data: { title: "ዜና", slug: "first-news", body: rich("ዜና"), _status: "draft" },
    });
    expect(typeof post.author === "object" ? post.author?.id : post.author).toBe(editor.user.id);
    expect(post.publishedAt ?? null).toBeNull();
    expect((await payload.find({ collection: "posts", overrideAccess: false, where: { id: { equals: post.id } } })).totalDocs).toBe(0);

    const published = await payload.update({ collection: "posts", id: post.id, ...as(editor), data: { _status: "published" } });
    expect(published.publishedAt).toBeTruthy();
    expect((await payload.find({ collection: "posts", overrideAccess: false, where: { id: { equals: post.id } } })).totalDocs).toBe(1);
  });

  it("translators save drafts in their language only; clergy can't edit news", async () => {
    const post = await payload.create({
      collection: "posts",
      ...as(editor),
      locale: "am",
      data: { title: "ማስታወቂያ", slug: "second-news", body: rich("ጽሑፍ"), _status: "published" },
    });
    await expect(
      payload.update({ collection: "posts", id: post.id, ...as(translatorEn), locale: "en", data: { title: "News", _status: "published" } }),
    ).rejects.toThrow(/publishing/);
    const draft = await payload.update({
      collection: "posts",
      id: post.id,
      ...as(translatorEn),
      locale: "en",
      draft: true,
      data: { title: "News", body: rich("Text") },
    });
    expect(draft.title).toBe("News");
    await expect(payload.update({ collection: "posts", id: post.id, ...as(clergy), data: { title: "x" } })).rejects.toThrow();
  });
});

describe("homepage global", () => {
  it("lists every section once by default and rejects duplicates", async () => {
    const home = await payload.findGlobal({ slug: "homepage", overrideAccess: false });
    expect(home.sections?.map((s) => s.section)).toEqual(HOME_SECTIONS.map((s) => s.value));

    await expect(
      payload.updateGlobal({
        slug: "homepage",
        ...as(editor),
        data: { sections: [{ section: "hero" }, { section: "visit" }, { section: "hero" }] },
      }),
    ).rejects.toThrow(/listed twice/);
  });

  it("editors can reorder sections; clergy cannot edit the home page", async () => {
    const updated = await payload.updateGlobal({
      slug: "homepage",
      ...as(editor),
      context: noRevalidate,
      data: { sections: [{ section: "visit" }, { section: "hero" }] },
    });
    expect(updated.sections?.map((s) => s.section)).toEqual(["visit", "hero"]);
    await expect(payload.updateGlobal({ slug: "homepage", ...as(clergy), data: { sections: [] } })).rejects.toThrow();
  });
});
