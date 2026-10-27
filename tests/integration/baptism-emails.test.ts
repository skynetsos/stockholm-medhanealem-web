/**
 * Baptism emails (spec Phase 2 task 5), read back from Mailpit: acknowledgement and office
 * notification on submit, confirmation and decline on status change, each logged as `email_sent`.
 */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { sendApplicantEmail } from "../../src/lib/baptism/emails";
import { submitBaptismRequest } from "../../src/lib/forms/baptism";
import { createRateLimiter } from "../../src/lib/forms/security";
import type { BaptismRequest } from "../../src/payload-types";
import { type Actor, as, createActor } from "./helpers";

const MAILPIT = process.env.MAILPIT_API_URL ?? "http://localhost:8025";
const STOCKHOLM = "Europe/Stockholm" as const;
const PERSONAL = ["Mail Applicant", "mail-applicant@example.org", "Mail Child", "Private note for the office"];

let payload: Payload;
let office: Actor;
let clergy: Actor;
const startedAt = Date.now() - 1000;

const form = {
  applicantName: "Mail Applicant",
  applicantEmail: "mail-applicant@example.org",
  applicantPhone: "",
  parishRelationship: "member",
  candidateName: "Mail Child",
  dateOfBirth: "2025-01-10",
  category: "child",
  guardianName: "Mail Applicant",
  guardianRelationship: "Father",
  guardianConsent: "on",
  preferredPeriod: "",
  notes: "Private note for the office",
  privacyAccepted: "on",
};

type Mail = { ID: string; Created: string; Subject: string; To: { Address: string }[]; ReplyTo: { Address: string }[]; Text: string };

/** Mail sent during this run whose subject contains `text` (Mailpit keeps mail from earlier runs). */
async function mails(text: string): Promise<Mail[]> {
  const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`subject:"${text}"`)}`).then((r) => r.json());
  const fresh = (search.messages as { ID: string; Created: string }[]).filter((m) => Date.parse(m.Created) >= startedAt);
  return Promise.all(fresh.map((m) => fetch(`${MAILPIT}/api/v1/message/${m.ID}`).then((r) => r.json())));
}

async function submit(locale: "am" | "en", ip: string) {
  const result = await submitBaptismRequest(payload, form, { ipHash: ip, locale, turnstileToken: "t", userAgent: "test" }, {
    verify: async () => true,
    limiter: createRateLimiter({ limit: 3, windowMs: 3_600_000 }),
  });
  const reference = (result as { reference: string }).reference;
  const { docs } = await payload.find({ collection: "baptism-requests", overrideAccess: true, where: { reference: { equals: reference } } });
  return docs[0] as BaptismRequest;
}

const emailEvents = async (id: number) =>
  (
    await payload.find({
      collection: "case-events",
      overrideAccess: true,
      depth: 0,
      sort: "id",
      where: { "request.value": { equals: id }, "request.relationTo": { equals: "baptism-requests" }, action: { in: ["email_sent", "note_added"] } },
    })
  ).docs.map((e) => [e.action, e.note]);

beforeAll(async () => {
  payload = await getPayload({ config });
  office = await createActor(payload, "mail-office@test.local", ["office_coordinator"]);
  clergy = await createActor(payload, "mail-clergy@test.local", ["clergy_approver"]);
  const ctx = { overrideAccess: true, context: { disableRevalidate: true } } as const;
  await payload.updateGlobal({ slug: "baptism-page", ...ctx, data: { requestsOpen: true } });
  await payload.updateGlobal({
    slug: "site-settings",
    ...ctx,
    data: { officeEmail: "office@test.local", officeNotificationEmails: [{ email: "baptism-office@test.local" }] },
  });
});

afterAll(async () => {
  // Other test files share this database: leave the public office address as it was (empty).
  await payload?.updateGlobal({ slug: "site-settings", overrideAccess: true, context: { disableRevalidate: true }, data: { officeEmail: null } });
  await payload?.destroy();
});

describe.skipIf(!process.env.SMTP_HOST)("baptism emails", () => {
  it("on submit: an acknowledgement in the applicant's language and an office notification, both logged", async () => {
    const doc = await submit("am", "mail-ip-1");
    const sent = await mails(doc.reference!);
    const ack = sent.find((m) => m.To[0].Address === "mail-applicant@example.org")!;
    expect(ack.Subject).toBe(`የክርስትና ጥያቄዎ ደርሶናል (${doc.reference})`);
    expect(ack.ReplyTo.map((r) => r.Address)).toEqual(["office@test.local"]);
    expect(ack.Text).toContain(doc.reference);

    const notification = sent.find((m) => m.Subject === `New baptism request: ${doc.reference}`)!;
    expect(notification.To.length).toBeGreaterThan(0);
    expect(notification.Text).toMatch(new RegExp(`/admin/collections/baptism-requests/${doc.id}`));

    for (const mail of [ack, notification]) for (const personal of PERSONAL.slice(1)) expect(mail.Text).not.toContain(personal);
    expect(ack.Text).not.toContain("Mail Applicant");
    expect(await emailEvents(doc.id)).toEqual([
      ["email_sent", "Acknowledgement to the applicant (am)"],
      ["email_sent", expect.stringMatching(/^Office notification \(\d+ recipients\)$/)],
    ]);
  });

  it("on confirmed: the date, time and place; on declined: a neutral notice", async () => {
    const doc = await submit("en", "mail-ip-2");
    await payload.update({ collection: "baptism-requests", id: doc.id, ...as(office), data: { status: "clergy_review" } });
    await payload.update({ collection: "baptism-requests", id: doc.id, ...as(clergy), data: { status: "scheduling" } });
    await payload.update({
      collection: "baptism-requests",
      id: doc.id,
      ...as(office),
      data: { status: "confirmed", internal: { scheduledDate: "2026-12-06T09:00:00.000Z", scheduledDate_tz: STOCKHOLM } },
    });
    const [confirmation] = await mails(`Baptism confirmed (${doc.reference})`);
    expect(confirmation.To[0].Address).toBe("mail-applicant@example.org");
    expect(confirmation.Text).toMatch(/When: Sunday, .*2026 at 10:00/);
    for (const personal of PERSONAL) expect(confirmation.Text).not.toContain(personal);

    const other = await submit("en", "mail-ip-3");
    await payload.update({ collection: "baptism-requests", id: other.id, ...as(office), data: { status: "declined" } });
    const [decline] = await mails(`Your baptism request (${other.reference})`);
    expect(decline.Text).toContain(`cannot go ahead with baptism request ${other.reference}`);

    expect((await emailEvents(doc.id)).at(-1)).toEqual(["email_sent", "Confirmation to the applicant (en)"]);
    expect((await emailEvents(other.id)).at(-1)).toEqual(["email_sent", "Decline notice to the applicant (en)"]);
  });
});

describe("a failed email", () => {
  it("never undoes the request, and staff see it in the audit log", async () => {
    const doc = await payload.create({
      collection: "baptism-requests",
      overrideAccess: true,
      data: {
        status: "new",
        applicant: { name: "Failing Mail", email: "fail@example.org", preferredLocale: "en" },
        candidate: { fullName: "Failing Candidate", category: "adult" },
        privacyAccepted: true,
      },
    });
    const broken = Object.create(payload, { sendEmail: { value: async () => Promise.reject(new Error("SMTP down")) } }) as Payload;
    expect(await sendApplicantEmail(broken, doc, "acknowledgement")).toBe(false);
    expect((await emailEvents(doc.id)).at(-1)).toEqual(["note_added", "Acknowledgement to the applicant could not be sent: contact them directly"]);
  });
});
