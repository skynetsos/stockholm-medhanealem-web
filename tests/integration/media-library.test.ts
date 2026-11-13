/** Media library (spec Phase 3 task 3, D-042): photos of children, audio recordings. */
import { REST_GET } from "@payloadcms/next/routes";
import { getPayload, type Payload } from "payload";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { type Actor, as, createActor } from "./helpers";

let payload: Payload;
let editor: Actor;
const ctx = { overrideAccess: true } as const;

/** A short silent MP3 frame is enough for an upload test (the file type is checked, not decoded). */
const MP3 = Buffer.from("SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq", "base64");

async function photo(name: string, data: Record<string, unknown>) {
  const file = await sharp({ create: { width: 900, height: 600, channels: 3, background: "#7a4b2a" } }).jpeg().toBuffer();
  return payload.create({ collection: "media", ...ctx, data: { alt: name, ...data }, file: { data: file, mimetype: "image/jpeg", name: `${name}-${Date.now()}.jpg`, size: file.length } });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  editor = await createActor(payload, "media-lib-editor@test.local", ["editor"]);
});

afterAll(async () => {
  await payload?.destroy();
});

describe("photos of children", () => {
  it("can't be published until the guardians' written permission is recorded", async () => {
    const doc = await photo("children", { containsMinors: true });
    const update = (data: Record<string, unknown>) => payload.update({ collection: "media", id: doc.id, ...as(editor), data });
    await expect(update({ permissionObtained: true })).rejects.toMatchObject({
      data: { errors: [expect.objectContaining({ message: expect.stringMatching(/written permission/) })] },
    });
    await expect(update({ guardianConsent: true, guardianConsentNote: "Signed form, Sunday School folder", permissionObtained: true })).resolves.toMatchObject({ permissionObtained: true });
  });

  it("an image without children needs no guardian permission", async () => {
    await expect(photo("adults", { permissionObtained: true })).resolves.toMatchObject({ permissionObtained: true });
  });

  it("the public never sees the guardian fields", async () => {
    const doc = await photo("children-public", { containsMinors: true, guardianConsent: true, guardianConsentNote: "Folder A", permissionObtained: true });
    const seen = await payload.findByID({ collection: "media", id: doc.id, overrideAccess: false });
    expect(seen).not.toHaveProperty("guardianConsentNote");
    expect(seen).not.toHaveProperty("guardianConsent");
  });
});

describe("audio recordings", () => {
  it("are public only while a Videos & recordings entry uses them", async () => {
    const audio = await payload.create({ collection: "audio", ...as(editor), data: { title: "Sermon" }, file: { data: MP3, mimetype: "audio/mpeg", name: `sermon-${Date.now()}.mp3`, size: MP3.length } });
    const publicCount = async () => (await payload.count({ collection: "audio", overrideAccess: false, where: { id: { equals: audio.id } } })).totalDocs;
    expect(await publicCount()).toBe(0);

    const entry = await payload.create({
      collection: "videos",
      ...as(editor),
      data: { title: "ስብከት", kind: "audio", category: "sermon", date: "2026-11-08T23:00:00.000Z", date_tz: "Europe/Stockholm", audio: audio.id },
    });
    expect(await publicCount()).toBe(1);
    const shown = await payload.findByID({ collection: "videos", id: entry.id, overrideAccess: false, depth: 1 });
    expect(shown.audio).toMatchObject({ id: audio.id, url: expect.stringContaining("/api/audio/file/") });
    // The file itself is served to the public, from this site.
    const path = `audio/file/${audio.filename}`;
    const file = await REST_GET(config)(new Request(`http://localhost:3000/api/${path}`), { params: Promise.resolve({ slug: path.split("/") }) });
    expect(file.status).toBe(200);

    await payload.delete({ collection: "videos", id: entry.id, ...as(editor) });
    expect(await publicCount()).toBe(0);
  });

  it("an audio entry needs a recording or a video link", async () => {
    await expect(
      payload.create({ collection: "videos", ...as(editor), data: { title: "x", kind: "audio", category: "sermon", date: "2026-11-08T23:00:00.000Z", date_tz: "Europe/Stockholm" } }),
    ).rejects.toThrow();
  });
});
