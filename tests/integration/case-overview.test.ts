/** Case counts for the admin list filters and dashboard (spec Phase 2 task 6), with each role's own access. */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { caseCounts } from "../../src/lib/cases/overview";
import { type Actor, createActor } from "./helpers";

let payload: Payload;
let office: Actor;
let clergy: Actor;
let editor: Actor;
let translator: Actor;

const counts = (actor: Actor, collection: "baptism-requests" | "inquiries" = "baptism-requests") =>
  caseCounts(payload, collection, { user: actor.user, req: actor.req });

beforeAll(async () => {
  payload = await getPayload({ config });
  office = await createActor(payload, "overview-office@test.local", ["office_coordinator"]);
  clergy = await createActor(payload, "overview-clergy@test.local", ["clergy_approver"]);
  editor = await createActor(payload, "overview-editor@test.local", ["editor"]);
  translator = await createActor(payload, "overview-translator@test.local", ["translator"], { translatorLocales: ["en"] });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("case counts", () => {
  it("count by status, open cases and those assigned to the viewer", async () => {
    const before = (await counts(office))!;
    const create = (status: "new" | "clergy_review", assignedTo?: number) =>
      payload.create({
        collection: "baptism-requests",
        overrideAccess: true,
        data: {
          status: "new",
          applicant: { name: "Count", email: "count@example.org", preferredLocale: "en" },
          candidate: { fullName: "Count Candidate", category: "adult" },
          privacyAccepted: true,
          internal: { assignedTo },
        },
      }).then((doc) => (status === "new" ? doc : payload.update({ collection: "baptism-requests", id: doc.id, overrideAccess: true, data: { status } })));
    await create("new", office.user.id);
    await create("new");
    await create("clergy_review", office.user.id);

    const after = (await counts(office))!;
    expect(after.byStatus.new - before.byStatus.new).toBe(2);
    expect(after.byStatus.clergy_review - before.byStatus.clergy_review).toBe(1);
    expect(after.open - before.open).toBe(3);
    expect(after.mine - before.mine).toBe(2);
    expect((await counts(clergy))!.open).toBe(after.open);
  });

  it("give nothing to roles that may not read requests", async () => {
    for (const actor of [editor, translator]) {
      expect(await counts(actor)).toBeNull();
      expect(await counts(actor, "inquiries")).toBeNull();
    }
  });
});
