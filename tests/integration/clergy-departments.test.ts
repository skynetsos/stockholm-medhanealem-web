/** Clergy (spec §2.6: publish guard) and Departments (spec §2.7), with spec §3 access. */
import { getPayload, type Payload } from "payload";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { type Actor, as, createActor, rich } from "./helpers";

let payload: Payload;
let editor: Actor;
let clergy: Actor;
let office: Actor;
let translatorEn: Actor;
let permittedPhoto: number;
let unpermittedPhoto: number;
const mediaIds: number[] = [];

async function photo(permissionObtained: boolean) {
  const data = await sharp({ create: { width: 600, height: 800, channels: 3, background: "#0b3d2e" } }).png().toBuffer();
  const doc = await payload.create({
    collection: "media",
    overrideAccess: true,
    data: { alt: "Portrait", permissionObtained },
    file: { data, mimetype: "image/png", name: `clergy-${Date.now()}-${permissionObtained}.png`, size: data.length },
  });
  mediaIds.push(doc.id);
  return doc.id;
}

const profile = (extra: Record<string, unknown> = {}) =>
  payload.create({
    collection: "clergy",
    ...as(editor),
    locale: "am",
    data: { name: "ቀሲስ ሙከራ", title: "ቀሲስ", ...extra },
  });

beforeAll(async () => {
  payload = await getPayload({ config });
  editor = await createActor(payload, "clergy-editor@test.local", ["editor"]);
  clergy = await createActor(payload, "clergy-clergy@test.local", ["clergy_approver"]);
  office = await createActor(payload, "clergy-office@test.local", ["office_coordinator"]);
  translatorEn = await createActor(payload, "clergy-translator@test.local", ["translator"], { translatorLocales: ["en"] });
  permittedPhoto = await photo(true);
  unpermittedPhoto = await photo(false);
});

afterAll(async () => {
  for (const id of mediaIds) await payload.delete({ collection: "media", id, overrideAccess: true }).catch(() => undefined);
  await payload?.destroy();
});

describe("clergy publish guard", () => {
  it("can't publish without a photo or without an Amharic bio", async () => {
    await expect(profile({ published: true, bio: rich("የሕይወት ታሪክ") })).rejects.toThrow(/add a photo/);
    await expect(profile({ published: true, photo: permittedPhoto })).rejects.toThrow(/bio in Amharic/);
  });

  it("can't publish with a photo that lacks publication permission", async () => {
    await expect(profile({ published: true, photo: unpermittedPhoto, bio: rich("ታሪክ") })).rejects.toThrow(/Permission to publish/);
  });

  it("publishes with a permitted photo and an Amharic bio; only then does the public see it", async () => {
    const draft = await profile({ photo: permittedPhoto, bio: rich("ታሪክ") });
    const before = await payload.find({ collection: "clergy", overrideAccess: false, where: { id: { equals: draft.id } } });
    expect(before.totalDocs).toBe(0);

    await payload.update({ collection: "clergy", id: draft.id, ...as(editor), data: { published: true } });
    const after = await payload.find({ collection: "clergy", overrideAccess: false, where: { id: { equals: draft.id } } });
    expect(after.totalDocs).toBe(1);
  });

  it("an English bio alone is not enough", async () => {
    const draft = await profile({ photo: permittedPhoto });
    await payload.update({ collection: "clergy", id: draft.id, ...as(editor), locale: "en", data: { name: "Kesis Test", bio: rich("Biography") } });
    await expect(
      payload.update({ collection: "clergy", id: draft.id, ...as(editor), locale: "en", data: { published: true } }),
    ).rejects.toThrow(/bio in Amharic/);
  });
});

describe("clergy access (spec §3)", () => {
  it("editors create but cannot delete; clergy can delete; office only reads", async () => {
    const doc = await profile();
    await expect(payload.delete({ collection: "clergy", id: doc.id, ...as(editor) })).rejects.toThrow();
    await expect(payload.update({ collection: "clergy", id: doc.id, ...as(office), data: { order: 1 } })).rejects.toThrow();
    const seen = await payload.find({ collection: "clergy", ...as(office), where: { id: { equals: doc.id } } });
    expect(seen.totalDocs).toBe(1);
    await expect(payload.delete({ collection: "clergy", id: doc.id, ...as(clergy) })).resolves.toBeTruthy();
  });

  it("translators edit text in their language but cannot publish or change the photo", async () => {
    const doc = await profile({ photo: permittedPhoto, bio: rich("ታሪክ") });
    const updated = await payload.update({
      collection: "clergy",
      id: doc.id,
      ...as(translatorEn),
      locale: "en",
      data: { name: "Kesis Test", published: true, photo: unpermittedPhoto },
    });
    expect(updated.name).toBe("Kesis Test");
    expect(updated.published).toBe(false);
    expect(typeof updated.photo === "object" ? updated.photo?.id : updated.photo).toBe(permittedPhoto);
  });
});

describe("departments", () => {
  it("editors manage departments; slugs are unique and well-formed; the public reads them", async () => {
    const dept = await payload.create({
      collection: "departments",
      ...as(editor),
      locale: "am",
      data: { name: "ሙከራ ክፍል", slug: "test-department", summary: "ማጠቃለያ" },
    });
    await expect(
      payload.create({ collection: "departments", ...as(editor), data: { name: "x", slug: "test-department" } }),
    ).rejects.toThrow();
    await expect(
      payload.create({ collection: "departments", ...as(editor), data: { name: "x", slug: "Bad Slug" } }),
    ).rejects.toThrow();
    const pub = await payload.find({ collection: "departments", overrideAccess: false, where: { id: { equals: dept.id } } });
    expect(pub.totalDocs).toBe(1);
    await expect(payload.create({ collection: "departments", ...as(clergy), data: { name: "x", slug: "nope" } })).rejects.toThrow();
  });
});
