/** pnpm seed:base — fills empty globals, is safe to re-run, never overwrites admin edits unless forced. */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { seedBase } from "../../src/seed/base";
import { baseSeed } from "../../src/seed/base-data";

let payload: Payload;
const ctx = { disableRevalidate: true };

beforeAll(async () => {
  payload = await getPayload({ config });
  // Start from empty globals (other test files may have written to them).
  await payload.updateGlobal({ slug: "site-settings", overrideAccess: true, context: ctx, data: { churchName: null, shortName: null } });
  await payload.updateGlobal({ slug: "navigation", overrideAccess: true, context: ctx, data: { headerItems: [], headerCTAs: [] } });
  await payload.updateGlobal({
    slug: "footer",
    overrideAccess: true,
    context: ctx,
    data: { columns: [], legalLinks: [], diocese: { label: null, link: { type: "internal", path: "/" } } },
  });
});

afterAll(async () => {
  await payload?.destroy();
});

const nav = (locale: "am" | "en" | "sv") => payload.findGlobal({ slug: "navigation", locale, overrideAccess: true });

describe("seedBase", () => {
  it("fills all three globals in every locale on first run", async () => {
    const report = await seedBase(payload);
    expect(report).toEqual({ "site-settings": "seeded", navigation: "seeded", footer: "seeded", departments: "seeded" });

    const am = await payload.findGlobal({ slug: "site-settings", locale: "am", overrideAccess: true });
    const en = await payload.findGlobal({ slug: "site-settings", locale: "en", overrideAccess: true });
    expect(am.churchName).toBe("በኢትዮጵያ ኦርቶዶክስ ተዋህዶ የደብረ ሰላም መንበረ ጵጵስና መድኃኔ ዓለም ቤተ ክርስቲያን");
    expect(en.churchName).toBe("Debre Selam Menbere Papasat Medhanealem Ethiopian Orthodox Tewahedo Church, Stockholm");
    expect(am.address).toMatchObject({ street: "Pålsbodagränd 3", postalCode: "124 75", city: "Bandhagen" });
    // Left empty until the church supplies them.
    expect(am.officeEmail ?? null).toBeNull();
    expect(am.phone ?? null).toBeNull();
    expect(am.socialLinks ?? []).toHaveLength(0);

    const [navAm, navEn, navSv] = await Promise.all([nav("am"), nav("en"), nav("sv")]);
    expect(navAm.headerItems?.map((i) => i.label)).toEqual(baseSeed.navigation.items.map((i) => i.label.am));
    expect(navEn.headerItems?.map((i) => i.label)).toEqual(baseSeed.navigation.items.map((i) => i.label.en));
    expect(navSv.headerItems?.map((i) => i.label)).toEqual(baseSeed.navigation.items.map((i) => i.label.sv));
    // Same rows (ids and links) in every locale, only labels differ.
    expect(navEn.headerItems?.map((i) => i.id)).toEqual(navAm.headerItems?.map((i) => i.id));
    expect(navEn.headerItems?.map((i) => i.link?.path)).toEqual(baseSeed.navigation.items.map((i) => i.path));
    expect(navEn.headerCTAs?.map((c) => c.label)).toEqual(["Service Times", "Request Baptism"]);

    const footerEn = await payload.findGlobal({ slug: "footer", locale: "en", overrideAccess: true });
    expect(footerEn.diocese).toMatchObject({
      label: "Nordic & Greece Diocese",
      link: { type: "external", url: "https://eotc-nordics.org/a/" },
    });
    expect(footerEn.legalLinks?.map((l) => l.link?.path)).toEqual(["/privacy", "/cookies"]);

    const seedSlugs = ["education", "children", "mezmur", "it", "property", "communications"];
    const depts = await payload.find({ collection: "departments", locale: "am", sort: "order", where: { slug: { in: seedSlugs } }, overrideAccess: true, limit: 20 });
    expect(depts.docs.map((d) => d.slug)).toEqual(["education", "children", "mezmur", "it", "property", "communications"]);
    expect(depts.docs.map((d) => d.name)).toEqual(["ትምህርት ክፍል", "ህጻናት ክፍል", "መዝሙር ክፍል", "አይቲ ክፍል", "ንብረት ክፍል", "ግንኙነት ክፍል"]);
    const mezmurEn = await payload.find({ collection: "departments", locale: "en", where: { slug: { equals: "mezmur" } }, overrideAccess: true });
    expect(mezmurEn.docs[0].name).toBe("Mezmur (choir)");
  });

  it("is safe to run again: nothing is rewritten", async () => {
    const before = await nav("en");
    expect(await seedBase(payload)).toEqual({
      "site-settings": "skipped (already has content)",
      navigation: "skipped (already has content)",
      footer: "skipped (already has content)",
      departments: "skipped (already has content)",
    });
    expect((await nav("en")).updatedAt).toBe(before.updatedAt);
  });

  it("keeps edits made in /admin, unless forced", async () => {
    const current = await nav("en");
    await payload.updateGlobal({
      slug: "navigation",
      locale: "en",
      overrideAccess: true,
      context: ctx,
      data: { headerItems: [{ ...current.headerItems![0], label: "Start" }, ...current.headerItems!.slice(1)] },
    });

    await seedBase(payload);
    expect((await nav("en")).headerItems?.[0].label).toBe("Start");

    await seedBase(payload, { force: true });
    expect((await nav("en")).headerItems?.[0].label).toBe("Home");
  });
});
