/** Retention job (spec Phase 2 task 8, D-035): archive old closed baptism cases; dry run; cron endpoint. */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { POST } from "../../src/app/api/cron/retention/route";
import { runRetention } from "../../src/lib/baptism/retention";
import type { BaptismRequest } from "../../src/payload-types";
import { rich } from "./helpers";

let payload: Payload;
const STOCKHOLM = "Europe/Stockholm" as const;
// The job runs "in 2029": 24 months back is January 2027, so everything created now (2026) is old.
const NOW = new Date("2029-01-15T12:00:00.000Z");

const ids: Record<"completed" | "declined" | "recent" | "open", number> = { completed: 0, declined: 0, recent: 0, open: 0 };

async function newCase(name: string) {
  return payload.create({
    collection: "baptism-requests",
    overrideAccess: true,
    data: {
      status: "new",
      applicant: { name, email: `${name.toLowerCase().replace(/ /g, "-")}@example.org`, phone: "070 000 00 00", preferredLocale: "en", parishRelationship: "member" },
      candidate: { fullName: `${name} Child`, dateOfBirth: "2025-01-01T23:00:00.000Z", dateOfBirth_tz: STOCKHOLM, category: "child" },
      guardian: { name, relationship: "Parent", consentConfirmed: true },
      preferredPeriod: "Spring",
      notes: "Private note from the family",
      privacyAccepted: true,
      source: { ipHash: "hash", userAgent: "browser", submittedAt: new Date().toISOString(), submittedAt_tz: STOCKHOLM },
      internal: { officeNotes: rich("Private office note") },
    },
  });
}

/** Server-side status changes (as the system), with a note where one is needed. */
async function walk(id: number, statuses: BaptismRequest["status"][], note?: string) {
  for (const status of statuses) {
    const data: Partial<BaptismRequest> = { status };
    if (status === "confirmed") Object.assign(data, { internal: { scheduledDate: "2026-12-06T09:00:00.000Z", scheduledDate_tz: STOCKHOLM } });
    await payload.update({ collection: "baptism-requests", id, overrideAccess: true, data, context: { transitionNote: note } });
  }
}

const caseEvents = (id: number) =>
  payload
    .find({
      collection: "case-events",
      overrideAccess: true,
      depth: 0,
      pagination: false,
      sort: "id",
      where: { and: [{ "request.relationTo": { equals: "baptism-requests" } }, { "request.value": { equals: id } }] },
    })
    .then((r) => r.docs);

beforeAll(async () => {
  payload = await getPayload({ config });
  await payload.updateGlobal({ slug: "site-settings", overrideAccess: true, context: { disableRevalidate: true }, data: { retentionMonthsBaptism: 24 } });
  ids.completed = (await newCase("Completed Person")).id;
  await walk(ids.completed, ["clergy_review", "scheduling", "confirmed", "completed"]);
  ids.declined = (await newCase("Declined Person")).id;
  await walk(ids.declined, ["declined"], "Private reason for declining");
  ids.recent = (await newCase("Recent Person")).id;
  await walk(ids.recent, ["declined"], "Another reason");
  // Closed after the cutoff (as if declined in mid-2028): not due yet.
  const [closing] = (await caseEvents(ids.recent)).filter((e) => e.action === "status_changed");
  await payload.update({ collection: "case-events", id: closing.id, overrideAccess: true, data: { at: "2028-06-01T10:00:00.000Z", at_tz: STOCKHOLM } });
  ids.open = (await newCase("Open Person")).id;
});

afterAll(async () => {
  await payload?.destroy();
});

describe("retention job", () => {
  it("dry run: lists the old closed cases and changes nothing", async () => {
    const report = await runRetention(payload, { dryRun: true, now: NOW });
    expect(report).toMatchObject({ dryRun: true, months: 24, cutoff: "2027-01-15T12:00:00.000Z" });
    const listed = report.cases.map((c) => c.id);
    expect(listed).toEqual(expect.arrayContaining([ids.completed, ids.declined]));
    expect(listed).not.toContain(ids.recent);
    expect(listed).not.toContain(ids.open);
    const untouched = await payload.findByID({ collection: "baptism-requests", id: ids.completed, overrideAccess: true });
    expect(untouched.applicant?.name).toBe("Completed Person");
    expect(untouched.archivedAt ?? null).toBeNull();
  });

  it("archives them: personal data removed; reference, status and dates kept; audit notes cleared", async () => {
    const before = await payload.findByID({ collection: "baptism-requests", id: ids.completed, overrideAccess: true });
    const report = await runRetention(payload, { dryRun: false, now: NOW });
    expect(report.cases.map((c) => c.id)).toEqual(expect.arrayContaining([ids.completed, ids.declined]));

    const archived = await payload.findByID({ collection: "baptism-requests", id: ids.completed, overrideAccess: true });
    expect(archived).toMatchObject({
      reference: before.reference,
      status: "completed",
      archivedAt: NOW.toISOString(),
      applicant: { name: null, email: null, phone: null, parishRelationship: null, preferredLocale: "en" },
      candidate: { fullName: null, dateOfBirth: null, category: "child" },
      guardian: { name: null, relationship: null },
      preferredPeriod: null,
      notes: null,
      privacyAccepted: true,
      source: { ipHash: null, userAgent: null, submittedAt: before.source?.submittedAt },
      internal: { officeNotes: null, clergyNotes: null, scheduledDate: before.internal?.scheduledDate },
      createdAt: before.createdAt,
    });
    expect(JSON.stringify(archived)).not.toMatch(/Completed Person|Private/);

    const declinedEvents = await caseEvents(ids.declined);
    expect(JSON.stringify(declinedEvents)).not.toContain("Private reason for declining");
    expect(declinedEvents.find((e) => e.action === "status_changed")).toMatchObject({ to: "declined", note: null });
    expect(declinedEvents.at(-1)).toMatchObject({ action: "archived", actorType: "system" });
    // One "archived" entry, not one per cleared field.
    expect(declinedEvents.filter((e) => e.action === "note_added")).toEqual([]);
  });

  it("leaves recent and open cases alone, and changes nothing when run again", async () => {
    const recent = await payload.findByID({ collection: "baptism-requests", id: ids.recent, overrideAccess: true });
    const open = await payload.findByID({ collection: "baptism-requests", id: ids.open, overrideAccess: true });
    expect(recent.applicant?.name).toBe("Recent Person");
    expect(open.applicant?.name).toBe("Open Person");
    expect((await caseEvents(ids.recent)).find((e) => e.action === "status_changed")?.note).toBe("Another reason");
    expect((await runRetention(payload, { dryRun: false, now: NOW })).cases).toEqual([]);
  });
});

describe("cron endpoint", () => {
  const call = (auth?: string, query = "?dryRun=1") =>
    POST(new Request(`http://localhost/api/cron/retention${query}`, { method: "POST", headers: auth ? { authorization: auth } : {} }));

  it("needs the secret, and refuses to run when the server has none", async () => {
    const original = process.env.CRON_SECRET;
    try {
      process.env.CRON_SECRET = "test-cron-secret-0123456789";
      expect((await call()).status).toBe(401);
      expect((await call("Bearer wrong-secret-0123456789")).status).toBe(401);
      const ok = await call("Bearer test-cron-secret-0123456789");
      expect(ok.status).toBe(200);
      const body = await ok.json();
      expect(body).toMatchObject({ dryRun: true, months: 24 });
      expect(JSON.stringify(body)).not.toMatch(/Person|example\.org/);

      process.env.CRON_SECRET = "replace-with-random-hex";
      expect((await call("Bearer replace-with-random-hex")).status).toBe(503);
    } finally {
      process.env.CRON_SECRET = original;
    }
  });
});
