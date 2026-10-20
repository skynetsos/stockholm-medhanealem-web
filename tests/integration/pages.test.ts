/** Pages (spec §2.2, §3): drafts, public visibility, slug rules, translator limits, page links. */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import type { Role } from "../../src/access/roles";
import { resolveLink } from "../../src/lib/links";
import type { Page, User } from "../../src/payload-types";
import { type Actor, as, createActor, noRevalidate, rich } from "./helpers";

let payload: Payload;
const ctx = noRevalidate;
const actor = (email: string, roles: Role[], extra: Partial<User> = {}) => createActor(payload, email, roles, extra);

let editor: Actor;
let translatorEn: Actor;
let clergy: Actor;
let finance: Actor;

async function draftPage(data: Partial<Page> & { slug: string }) {
  return payload.create({
    collection: "pages",
    ...as(editor),
    locale: "am",
    draft: true,
    data: { title: `ገጽ ${data.slug}`, section: "our-church", _status: "draft", ...data },
  });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  editor = await actor("pages-editor@test.local", ["editor"]);
  translatorEn = await actor("pages-translator@test.local", ["translator"], { translatorLocales: ["en"] });
  clergy = await actor("pages-clergy@test.local", ["clergy_approver"]);
  finance = await actor("pages-finance@test.local", ["finance"]);
});

afterAll(async () => {
  await payload?.destroy();
});

describe("drafts and public visibility", () => {
  it("a draft is invisible to the public and to finance, visible to clergy (read only)", async () => {
    const page = await draftPage({ slug: "history", layout: [{ blockType: "richText", content: rich("ታሪክ") }] });

    const publicView = await payload.find({ collection: "pages", overrideAccess: false, where: { id: { equals: page.id } } });
    expect(publicView.totalDocs).toBe(0);
    const financeView = await payload.find({ collection: "pages", ...as(finance), where: { id: { equals: page.id } } });
    expect(financeView.totalDocs).toBe(0);

    const clergyView = await payload.find({ collection: "pages", ...as(clergy), draft: true, where: { id: { equals: page.id } } });
    expect(clergyView.totalDocs).toBe(1);
    await expect(
      payload.update({ collection: "pages", id: page.id, ...as(clergy), data: { title: "x" } }),
    ).rejects.toThrow();
  });

  it("once published it is public, with Amharic as the fallback for missing translations", async () => {
    const page = await draftPage({ slug: "mission" });
    await payload.update({ collection: "pages", id: page.id, ...as(editor), locale: "am", data: { _status: "published" } });

    const en = await payload.findByID({ collection: "pages", id: page.id, overrideAccess: false, locale: "en" });
    expect(en.title).toBe("ገጽ mission");
  });
});

describe("addresses (section + slug)", () => {
  it("allows the same slug in different sections but not twice in one section", async () => {
    await draftPage({ slug: "about", section: "support" });
    await expect(draftPage({ slug: "about", section: "visit" })).resolves.toBeTruthy();
    await expect(draftPage({ slug: "about", section: "support" })).rejects.toThrow();
  });

  // Payload skips field validation for drafts (so editors can save unfinished work); the rules
  // apply when a page is published, which is what makes it reachable.
  const publish = (data: Partial<Page> & { slug: string }) =>
    payload.create({
      collection: "pages",
      ...as(editor),
      locale: "am",
      data: { title: `ገጽ ${data.slug}`, section: "our-church", _status: "published", ...data },
    });

  it("rejects badly formatted and reserved slugs on publish", async () => {
    await expect(publish({ slug: "Our History" })).rejects.toThrow();
    await expect(publish({ slug: "news", section: "other" })).rejects.toThrow();
    await expect(publish({ slug: "news", section: "our-church" })).resolves.toBeTruthy();
  });

  it("rejects addresses that belong to the site's own routes (D-017)", async () => {
    const slugError = (data: Parameters<typeof publish>[0]) =>
      publish(data)
        .then(() => null)
        .catch((e: { data?: { errors?: { message: string }[] } }) => e.data?.errors?.[0]?.message);
    expect(await slugError({ slug: "clergy", section: "our-church" })).toMatch(/"\/our-church\/clergy" is a built-in page/);
    expect(await slugError({ slug: "calendar", section: "worship" })).toMatch(/built-in/);
    expect(await slugError({ slug: "fasting", section: "our-faith" })).toMatch(/built-in/);
    expect(await slugError({ slug: "cms", section: "other" })).toMatch(/built-in/);
    await expect(publish({ slug: "index", section: "our-faith" })).resolves.toBeTruthy();
    await expect(publish({ slug: "history", section: "worship" })).resolves.toBeTruthy();
  });

  it("rejects a video block that is not YouTube or Vimeo on publish", async () => {
    await expect(
      publish({ slug: "bad-video", layout: [{ blockType: "videoEmbed", url: "https://evil.example/v", title: "x" }] }),
    ).rejects.toThrow();
    await expect(
      publish({ slug: "good-video", layout: [{ blockType: "videoEmbed", url: "https://youtu.be/dQw4w9WgXcQ", title: "x" }] }),
    ).resolves.toBeTruthy();
  });
});

describe("translators (spec §3: update own locales; proposal §7: cannot publish)", () => {
  it("can save a draft in an assigned language only", async () => {
    const page = await draftPage({ slug: "translate-me" });

    const saved = await payload.update({
      collection: "pages",
      id: page.id,
      ...as(translatorEn),
      locale: "en",
      draft: true,
      data: { title: "Translate me" },
    });
    expect(saved.title).toBe("Translate me");

    await expect(
      payload.update({ collection: "pages", id: page.id, ...as(translatorEn), locale: "sv", draft: true, data: { title: "Översätt" } }),
    ).rejects.toThrow();
  });

  it("cannot publish, and cannot change the page's address", async () => {
    const page = await draftPage({ slug: "no-publish" });
    await expect(
      payload.update({ collection: "pages", id: page.id, ...as(translatorEn), locale: "en", data: { _status: "published" } }),
    ).rejects.toThrow(/publishing/);

    await payload.update({
      collection: "pages",
      id: page.id,
      ...as(translatorEn),
      locale: "en",
      draft: true,
      data: { slug: "moved", section: "other" },
    });
    const after = await payload.findByID({ collection: "pages", id: page.id, overrideAccess: true, draft: true });
    expect(after).toMatchObject({ slug: "no-publish", section: "our-church" });
  });
});

describe("menu links to pages", () => {
  it("are hidden while the page is unpublished and resolve once published", async () => {
    const page = await draftPage({ slug: "linked-page" });
    await payload.updateGlobal({
      slug: "navigation",
      overrideAccess: true,
      context: ctx,
      data: { headerItems: [{ label: "Linked", link: { type: "page", page: page.id } }] },
    });

    const readNav = () => payload.findGlobal({ slug: "navigation", overrideAccess: false, depth: 1 });
    expect(resolveLink((await readNav()).headerItems?.[0].link)).toBeNull();

    await payload.update({ collection: "pages", id: page.id, ...as(editor), data: { _status: "published" } });
    expect(resolveLink((await readNav()).headerItems?.[0].link)).toEqual({
      kind: "internal",
      href: "/our-church/linked-page",
      newTab: false,
    });
  });
});
