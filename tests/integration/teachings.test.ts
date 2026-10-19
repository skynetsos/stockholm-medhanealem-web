/** Teachings (spec §2.3, §3): publishing requires clergy approval; edits by others withdraw it. */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import type { Teaching } from "../../src/payload-types";
import { type Actor, as, createActor, rich } from "./helpers";

let payload: Payload;
let clergy: Actor;
let otherClergy: Actor;
let superAdmin: Actor;
let editor: Actor;
let office: Actor;
let translatorEn: Actor;

const approverId = (t: Pick<Teaching, "approvedBy">) =>
  t.approvedBy && typeof t.approvedBy === "object" ? t.approvedBy.id : (t.approvedBy ?? null);

let n = 0;
async function editorDraft(extra: Partial<Teaching> = {}) {
  n += 1;
  return payload.create({
    collection: "teachings",
    ...as(editor),
    locale: "am",
    draft: true,
    data: { title: `ትምህርት ${n}`, slug: `teaching-${n}`, category: "sacraments", body: rich("ጽሑፍ"), _status: "draft", ...extra },
  });
}

const publicFind = (id: number) =>
  payload.find({ collection: "teachings", overrideAccess: false, where: { id: { equals: id } } });

beforeAll(async () => {
  payload = await getPayload({ config });
  clergy = await createActor(payload, "teach-clergy@test.local", ["clergy_approver"]);
  otherClergy = await createActor(payload, "teach-clergy2@test.local", ["clergy_approver"]);
  superAdmin = await createActor(payload, "teach-root@test.local", ["super_admin"]);
  editor = await createActor(payload, "teach-editor@test.local", ["editor"]);
  office = await createActor(payload, "teach-office@test.local", ["office_coordinator"]);
  translatorEn = await createActor(payload, "teach-translator@test.local", ["translator"], { translatorLocales: ["en"] });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("publishing needs clergy approval", () => {
  it("an editor can draft but not publish", async () => {
    const t = await editorDraft();
    await expect(
      payload.update({ collection: "teachings", id: t.id, ...as(editor), data: { _status: "published" } }),
    ).rejects.toThrow(/publishing/);
    expect((await publicFind(t.id)).totalDocs).toBe(0);
  });

  it("a super_admin cannot publish an unapproved teaching", async () => {
    const t = await editorDraft();
    await expect(
      payload.update({ collection: "teachings", id: t.id, ...as(superAdmin), data: { _status: "published" } }),
    ).rejects.toThrow(/clergy member must approve/);
  });

  it("clergy publishing approves it, recording who and when", async () => {
    const t = await editorDraft();
    const published = await payload.update({
      collection: "teachings",
      id: t.id,
      ...as(clergy),
      data: { _status: "published" },
    });
    expect(approverId(published)).toBe(clergy.user.id);
    expect(published.approvedAt).toBeTruthy();
    expect((await publicFind(t.id)).totalDocs).toBe(1);
  });

  it("a super_admin may publish once clergy have approved", async () => {
    const t = await editorDraft();
    await payload.update({ collection: "teachings", id: t.id, ...as(clergy), draft: true, data: { approvedBy: clergy.user.id } });
    const published = await payload.update({ collection: "teachings", id: t.id, ...as(superAdmin), data: { _status: "published" } });
    expect(published._status).toBe("published");
    expect(approverId(published)).toBe(clergy.user.id);
  });

  it("only clergy can be recorded as the approver", async () => {
    const t = await editorDraft();
    await expect(
      payload.update({ collection: "teachings", id: t.id, overrideAccess: true, draft: true, data: { approvedBy: editor.user.id } }),
    ).rejects.toThrow(/active clergy member/);

    // An editor cannot set the approver at all (field access): the value is ignored.
    const attempt = await payload.update({
      collection: "teachings",
      id: t.id,
      ...as(editor),
      draft: true,
      data: { approvedBy: otherClergy.user.id },
    });
    expect(approverId(attempt)).toBeNull();
  });
});

describe("edits after approval", () => {
  it("an editor's text change withdraws approval for the new draft; the live version stays approved", async () => {
    const t = await editorDraft();
    await payload.update({ collection: "teachings", id: t.id, ...as(clergy), data: { _status: "published" } });

    const draft = await payload.update({
      collection: "teachings",
      id: t.id,
      ...as(editor),
      draft: true,
      data: { body: rich("ተቀይሯል") },
    });
    expect(approverId(draft)).toBeNull();
    expect(draft.approvedAt ?? null).toBeNull();

    const live = await payload.findByID({ collection: "teachings", id: t.id, overrideAccess: false });
    expect(approverId(live)).toBe(clergy.user.id);
    expect(JSON.stringify(live.body)).toContain("ጽሑፍ");

    await expect(
      payload.update({ collection: "teachings", id: t.id, ...as(superAdmin), data: { _status: "published" } }),
    ).rejects.toThrow(/clergy member must approve/);
  });

  it("clergy editing keeps (re)approval with themselves", async () => {
    const t = await editorDraft();
    await payload.update({ collection: "teachings", id: t.id, ...as(clergy), data: { _status: "published" } });
    const updated = await payload.update({
      collection: "teachings",
      id: t.id,
      ...as(otherClergy),
      data: { body: rich("በካህን ተስተካክሏል"), _status: "published" },
    });
    expect(approverId(updated)).toBe(clergy.user.id);
  });
});

describe("other roles", () => {
  it("office can read drafts but not edit", async () => {
    const t = await editorDraft();
    const seen = await payload.find({ collection: "teachings", ...as(office), draft: true, where: { id: { equals: t.id } } });
    expect(seen.totalDocs).toBe(1);
    await expect(payload.update({ collection: "teachings", id: t.id, ...as(office), data: { title: "x" } })).rejects.toThrow();
  });

  it("a translator saves drafts in their language only and cannot change the category", async () => {
    const t = await editorDraft();
    const saved = await payload.update({
      collection: "teachings",
      id: t.id,
      ...as(translatorEn),
      locale: "en",
      draft: true,
      data: { title: "Teaching in English", category: "faq" },
    });
    expect(saved.title).toBe("Teaching in English");
    expect(saved.category).toBe("sacraments");
    await expect(
      payload.update({ collection: "teachings", id: t.id, ...as(translatorEn), locale: "sv", draft: true, data: { title: "x" } }),
    ).rejects.toThrow();
  });
});
