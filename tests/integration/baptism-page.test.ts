/** Baptism page settings (Phase 2 task 3): who may change what. */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { baptismRequirements } from "../../src/lib/cms/sacraments";
import { type Actor, as, createActor } from "./helpers";

let payload: Payload;
let clergy: Actor;
let office: Actor;
let editor: Actor;
let translator: Actor;

const read = (locale: "am" | "en") => payload.findGlobal({ slug: "baptism-page", locale, overrideAccess: false });

beforeAll(async () => {
  payload = await getPayload({ config });
  clergy = await createActor(payload, "bp-clergy@test.local", ["clergy_approver"]);
  office = await createActor(payload, "bp-office@test.local", ["office_coordinator"]);
  editor = await createActor(payload, "bp-editor@test.local", ["editor"]);
  translator = await createActor(payload, "bp-translator@test.local", ["translator"], { translatorLocales: ["en"] });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("baptism page settings", () => {
  it("clergy write the requirements, the office opens requests, the public reads both", async () => {
    await payload.updateGlobal({ slug: "baptism-page", ...as(clergy), locale: "am", data: { requirements: [{ item: "የክርስትና አባት" }, { item: "  " }] } });
    await payload.updateGlobal({ slug: "baptism-page", ...as(office), data: { requestsOpen: true } });
    const page = await read("am");
    expect(page.requestsOpen).toBe(true);
    expect(baptismRequirements(page).map((r) => r.item)).toEqual(["የክርስትና አባት"]);
  });

  it("translators translate the rows but cannot add rows or open and close requests", async () => {
    const rows = (await read("am")).requirements!;
    await payload.updateGlobal({
      slug: "baptism-page",
      ...as(translator),
      locale: "en",
      data: { requirements: rows.map((r) => ({ id: r.id, item: `${r.item} (en)` })) },
    });
    expect((await read("en")).requirements!.map((r) => r.item)).toEqual(rows.map((r) => `${r.item} (en)`));

    await expect(
      payload.updateGlobal({ slug: "baptism-page", ...as(translator), locale: "en", data: { requirements: [...rows, { item: "Extra" }] } }),
    ).rejects.toThrow(/Translators can translate/);
    await payload.updateGlobal({ slug: "baptism-page", ...as(translator), locale: "en", data: { requestsOpen: false } });
    expect((await read("en")).requestsOpen).toBe(true);
  });

  it("editors cannot change it", async () => {
    await expect(payload.updateGlobal({ slug: "baptism-page", ...as(editor), data: { requestsOpen: false } })).rejects.toThrow();
  });
});
