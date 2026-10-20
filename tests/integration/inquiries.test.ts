/** Inquiries (spec §2.14, §3) and the contact form submission (Phase 1 task 6). */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { submitContact } from "../../src/lib/forms/contact";
import { createRateLimiter } from "../../src/lib/forms/security";
import { type Actor, as, createActor } from "./helpers";

let payload: Payload;
let office: Actor;
let editor: Actor;
let clergy: Actor;

const form = { name: "Abebe Kebede", email: "abebe@example.org", phone: "", message: "When is the next Kidase?", privacyAccepted: "on" };
const passTurnstile = async () => true;
const freshLimiter = () => createRateLimiter({ limit: 5, windowMs: 600_000 });
const context = (ip = "ip-hash-1") => ({ ipHash: ip, locale: "am" as const, turnstileToken: "token" });

beforeAll(async () => {
  payload = await getPayload({ config });
  office = await createActor(payload, "inq-office@test.local", ["office_coordinator"]);
  editor = await createActor(payload, "inq-editor@test.local", ["editor"]);
  clergy = await createActor(payload, "inq-clergy@test.local", ["clergy_approver"]);
  await payload.updateGlobal({
    slug: "site-settings",
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: { officeNotificationEmails: [{ email: "office-inbox@test.local" }] },
  });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("contact form submission", () => {
  it("stores an inquiry with a yearly reference and returns it", async () => {
    const limiter = freshLimiter();
    const first = await submitContact(payload, form, context(), { verify: passTurnstile, limiter });
    const second = await submitContact(payload, { ...form, message: "Another question here" }, context(), { verify: passTurnstile, limiter });
    expect(first).toMatchObject({ status: "success", reference: expect.stringMatching(/^INQ-\d{4}-\d{4,}$/) });
    const n = (r: typeof first) => Number((r as { reference: string }).reference.split("-")[2]);
    expect(n(second)).toBe(n(first) + 1);

    const saved = await payload.find({ collection: "inquiries", overrideAccess: true, where: { reference: { equals: (first as { reference: string }).reference } } });
    expect(saved.docs[0]).toMatchObject({ type: "contact", status: "new", name: "Abebe Kebede", preferredLocale: "am", privacyAccepted: true });
  });

  it("silently drops honeypot submissions", async () => {
    const before = (await payload.count({ collection: "inquiries", overrideAccess: true })).totalDocs;
    const result = await submitContact(payload, { ...form, website: "http://spam.example" }, context(), { verify: passTurnstile, limiter: freshLimiter() });
    expect(result).toEqual({ status: "success", reference: null });
    expect((await payload.count({ collection: "inquiries", overrideAccess: true })).totalDocs).toBe(before);
  });

  it("returns field errors, refuses failed spam checks and rate-limits the 6th message in 10 minutes", async () => {
    const limiter = freshLimiter();
    expect(await submitContact(payload, { ...form, email: "x" }, context("ip-2"), { verify: passTurnstile, limiter })).toEqual({
      status: "error",
      fieldErrors: { email: "email" },
    });
    expect(await submitContact(payload, form, context("ip-2"), { verify: async () => false, limiter })).toEqual({
      status: "error",
      formError: "spam",
    });
    for (let i = 0; i < 4; i++) await submitContact(payload, form, context("ip-2"), { verify: passTurnstile, limiter });
    expect(await submitContact(payload, form, context("ip-2"), { verify: passTurnstile, limiter })).toEqual({
      status: "error",
      formError: "rateLimited",
    });
    expect((await submitContact(payload, form, context("ip-3"), { verify: passTurnstile, limiter })).status).toBe("success");
  });
});

// Locally and in CI mail goes to Mailpit over SMTP; its API lets us read what the office receives.
const MAILPIT = process.env.MAILPIT_API_URL ?? "http://localhost:8025";

describe("office notification", () => {
  it.skipIf(!process.env.SMTP_HOST)("emails the office the reference and admin link, without the visitor's details", async () => {
    const startedAt = Date.now() - 1000;
    const message = "Please call me about a baptism for my son";
    const result = await submitContact(payload, { ...form, name: "Private Person", message }, context("ip-mail"), {
      verify: passTurnstile,
      limiter: freshLimiter(),
    });
    const reference = (result as { reference: string }).reference;
    // References restart with each fresh test database, but Mailpit keeps older mail: only count new ones.
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`subject:"${reference}"`)}`).then((r) => r.json());
    const fresh = (search.messages as { ID: string; Created: string }[]).filter((m) => Date.parse(m.Created) >= startedAt);
    expect(fresh).toHaveLength(1);
    const mail = await fetch(`${MAILPIT}/api/v1/message/${fresh[0].ID}`).then((r) => r.json());
    // Other test files may set the office address too (shared test database): any office address will do.
    expect(mail.To.length).toBeGreaterThan(0);
    expect(mail.Text).toContain(reference);
    expect(mail.Text).toMatch(/\/admin\/collections\/inquiries\/\d+/);
    for (const personal of ["Private Person", "abebe@example.org", message]) expect(mail.Text).not.toContain(personal);
  });
});

describe("inquiries are private (spec §3)", () => {
  it("only office, clergy and super_admin can read them; nobody can create through the API", async () => {
    await expect(payload.find({ collection: "inquiries", overrideAccess: false })).rejects.toThrow();
    await expect(payload.find({ collection: "inquiries", ...as(editor) })).rejects.toThrow();
    expect((await payload.find({ collection: "inquiries", ...as(office) })).totalDocs).toBeGreaterThan(0);
    expect((await payload.find({ collection: "inquiries", ...as(clergy) })).totalDocs).toBeGreaterThan(0);

    const data = { type: "contact" as const, status: "new" as const, name: "x", email: "x@example.org", privacyAccepted: true };
    await expect(payload.create({ collection: "inquiries", overrideAccess: false, data })).rejects.toThrow();
    await expect(payload.create({ collection: "inquiries", ...as(office), data })).rejects.toThrow();
  });

  it("office staff change the status but not what the visitor sent; clergy only read", async () => {
    const [inquiry] = (await payload.find({ collection: "inquiries", overrideAccess: true, limit: 1 })).docs;
    const updated = await payload.update({
      collection: "inquiries",
      id: inquiry.id,
      ...as(office),
      data: { status: "in_progress", message: "changed", reference: "INQ-0000-0000" },
    });
    expect(updated.status).toBe("in_progress");
    expect(updated.message).toBe(inquiry.message);
    expect(updated.reference).toBe(inquiry.reference);
    await expect(payload.update({ collection: "inquiries", id: inquiry.id, ...as(clergy), data: { status: "closed" } })).rejects.toThrow();
  });
});
