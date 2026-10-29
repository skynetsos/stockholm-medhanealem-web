/** Baptism request status workflow and audit log (spec Phase 2 task 2). */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { changeStatus } from "../../src/lib/baptism/transition";
import type { BaptismRequest, CaseEvent } from "../../src/payload-types";
import { type Actor, as, createActor, rich } from "./helpers";

const STOCKHOLM = "Europe/Stockholm" as const;

let payload: Payload;
let superAdmin: Actor;
let office: Actor;
let clergy: Actor;

const newCase = async (status?: BaptismRequest["status"]) =>
  payload.create({
    collection: "baptism-requests",
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: {
      status: status ?? "new",
      applicant: { name: "Workflow Applicant", email: "wf@example.org", preferredLocale: "en" },
      candidate: { fullName: "Workflow Candidate", category: "adult" },
      privacyAccepted: true,
    },
  });

/** Save `extra` as the actor, then use the status action (the only way to change status, D-032). */
async function setStatus(actor: Actor, id: number, status: BaptismRequest["status"], extra: Partial<BaptismRequest> = {}, note?: string) {
  if (Object.keys(extra).length) await payload.update({ collection: "baptism-requests", id, ...as(actor), data: extra });
  return changeStatus(payload, { id, to: status, note: note ?? (status === "declined" ? "Test reason" : undefined) }, actor);
}

const timeline = async (id: number) =>
  (
    await payload.find({
      collection: "case-events",
      overrideAccess: true,
      depth: 0,
      sort: "id",
      where: { and: [{ "request.relationTo": { equals: "baptism-requests" } }, { "request.value": { equals: id } }] },
    })
  ).docs;

const statusLog = (events: CaseEvent[]) => events.filter((e) => e.action === "status_changed").map((e) => [e.from, e.to, e.actor]);

beforeAll(async () => {
  payload = await getPayload({ config });
  superAdmin = await createActor(payload, "wf-admin@test.local", ["super_admin"]);
  office = await createActor(payload, "wf-office@test.local", ["office_coordinator"], { name: "Office Person" });
  clergy = await createActor(payload, "wf-clergy@test.local", ["clergy_approver"]);
});

afterAll(async () => {
  await payload?.destroy();
});

describe("baptism workflow", () => {
  it("runs the exit-checklist journey and logs every change with actor and time", async () => {
    const { id } = await newCase();
    await setStatus(office, id, "clergy_review");
    await setStatus(clergy, id, "scheduling");
    await expect(setStatus(office, id, "confirmed")).rejects.toThrow(/scheduled date/);
    await setStatus(office, id, "confirmed", { internal: { scheduledDate: "2026-12-06T07:00:00.000Z", scheduledDate_tz: STOCKHOLM } });
    const done = await setStatus(office, id, "completed");
    expect(done.status).toBe("completed");

    const events = await timeline(id);
    expect(statusLog(events)).toEqual([
      ["new", "clergy_review", office.user.id],
      ["clergy_review", "scheduling", clergy.user.id],
      ["scheduling", "confirmed", office.user.id],
      ["confirmed", "completed", office.user.id],
    ]);
    expect(events.every((e) => e.at && !Number.isNaN(Date.parse(e.at)))).toBe(true);
    expect(events.filter((e) => e.action === "status_changed").every((e) => e.actorType === "user")).toBe(true);
    expect(events).toContainEqual(expect.objectContaining({ action: "note_added", note: "Scheduled date", from: null, to: "2026-12-06 08:00 (Stockholm)" }));
  });

  it("refuses skipped steps and changes to final statuses, and logs nothing for them", async () => {
    const { id } = await newCase();
    await expect(setStatus(office, id, "confirmed")).rejects.toThrow(/cannot go from "new" to "confirmed"/);
    await setStatus(office, id, "declined");
    await expect(setStatus(superAdmin, id, "new")).rejects.toThrow(/cannot go from "declined"/);
    expect(statusLog(await timeline(id))).toEqual([["new", "declined", office.user.id]]);
  });

  it("only clergy approvers decide a case under clergy review; clergy don't do office steps", async () => {
    const { id } = await newCase();
    await expect(setStatus(clergy, id, "clergy_review")).rejects.toThrow(/Only the office/);
    await setStatus(office, id, "clergy_review");
    await expect(setStatus(office, id, "scheduling")).rejects.toThrow(/Only a clergy approver/);
    await expect(setStatus(superAdmin, id, "declined")).rejects.toThrow(/Only a clergy approver/);
    await setStatus(clergy, id, "info_needed");
    expect((await payload.findByID({ collection: "baptism-requests", id, overrideAccess: true })).status).toBe("info_needed");
  });

  it("changes status only through the status action, never by saving the form", async () => {
    const { id } = await newCase();
    const saved = await payload.update({ collection: "baptism-requests", id, ...as(office), data: { status: "clergy_review", preferredPeriod: "Spring" } });
    expect(saved).toMatchObject({ status: "new", preferredPeriod: "Spring" });
    expect(statusLog(await timeline(id))).toEqual([]);
  });

  it("needs an internal note to decline, and keeps it in the audit log", async () => {
    const { id } = await newCase();
    await expect(setStatus(office, id, "declined", {}, "   ")).rejects.toThrow(/internal note/);
    await setStatus(office, id, "declined", {}, "Family moved to another parish");
    const events = await timeline(id);
    expect(events.find((e) => e.action === "status_changed")).toMatchObject({ to: "declined", note: "Family moved to another parish" });
    // The decline email follows the status change.
    expect(events.at(-1)).toMatchObject({ action: "email_sent", note: "Decline notice to the applicant (en)" });
  });

  it("lets only staff who handle requests use the status action", async () => {
    const { id } = await newCase();
    const editor = await createActor(payload, "wf-editor-action@test.local", ["editor"]);
    await expect(changeStatus(payload, { id, to: "info_needed" }, editor)).rejects.toThrow(/not allowed/);
    await expect(changeStatus(payload, { id, to: "info_needed" }, { user: null })).rejects.toThrow(/Sign in/);
    expect((await payload.findByID({ collection: "baptism-requests", id, overrideAccess: true })).status).toBe("new");
  });

  it("starts every new request as 'new', whatever the form sends", async () => {
    expect((await newCase("confirmed")).status).toBe("new");
  });

  it("logs assignment by name, clergy decisions, and note edits without their content", async () => {
    const { id } = await newCase();
    await payload.update({
      collection: "baptism-requests",
      id,
      ...as(office),
      data: { internal: { assignedTo: office.user.id, officeNotes: rich("Private remark about the family") } },
    });
    await payload.update({ collection: "baptism-requests", id, ...as(clergy), data: { internal: { clergyDecision: "needs_prep" } } });

    const events = await timeline(id);
    expect(events).toContainEqual(expect.objectContaining({ action: "assigned", from: null, to: "Office Person", actor: office.user.id }));
    expect(events).toContainEqual(expect.objectContaining({ action: "note_added", note: "Office notes updated", actor: office.user.id }));
    expect(events).toContainEqual(expect.objectContaining({ action: "note_added", note: "Clergy decision", to: "needs_prep", actor: clergy.user.id }));
    expect(JSON.stringify(events)).not.toContain("Private remark");
  });

  it("case handlers see the staff they can assign to, and no other accounts", async () => {
    const editor = await createActor(payload, "wf-editor@test.local", ["editor"]);
    for (const actor of [office, clergy]) {
      const ids = (await payload.find({ collection: "users", ...as(actor), limit: 0, depth: 0 })).docs.map((u) => u.id);
      expect(ids).toEqual(expect.arrayContaining([office.user.id, clergy.user.id, superAdmin.user.id]));
      expect(ids).not.toContain(editor.user.id);
      await expect(payload.update({ collection: "users", id: superAdmin.user.id, ...as(actor), data: { name: "Changed" } })).rejects.toThrow();
    }
    expect((await payload.find({ collection: "users", ...as(editor), depth: 0 })).docs.map((u) => u.id)).toEqual([editor.user.id]);
  });

  it("logs a change made by server code as the system", async () => {
    const { id } = await newCase();
    await payload.update({ collection: "baptism-requests", id, overrideAccess: true, data: { status: "info_needed" } });
    expect((await timeline(id)).at(-1)).toMatchObject({ action: "status_changed", actorType: "system", actor: null });
  });
});

describe("inquiry audit log", () => {
  it("logs status changes and assignments with the staff member", async () => {
    const inquiry = await payload.create({
      collection: "inquiries",
      overrideAccess: true,
      data: { type: "contact", status: "new", name: "Log Test", email: "log@example.org", privacyAccepted: true },
    });
    await payload.update({ collection: "inquiries", id: inquiry.id, ...as(office), data: { status: "in_progress", assignedTo: office.user.id } });
    const events = (
      await payload.find({
        collection: "case-events",
        overrideAccess: true,
        depth: 0,
        where: { and: [{ "request.relationTo": { equals: "inquiries" } }, { "request.value": { equals: inquiry.id } }] },
      })
    ).docs;
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "status_changed", from: "new", to: "in_progress", actor: office.user.id }),
        expect.objectContaining({ action: "assigned", to: "Office Person", actor: office.user.id }),
      ]),
    );
  });
});
