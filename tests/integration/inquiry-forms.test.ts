/** Sunday School, marriage, fitihat and volunteer forms (spec Phase 2 task 7). */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { submitInquiry } from "../../src/lib/forms/inquiry";
import { createRateLimiter } from "../../src/lib/forms/security";

let payload: Payload;
const MAILPIT = process.env.MAILPIT_API_URL ?? "http://localhost:8025";
const startedAt = Date.now() - 1000;

const contact = { name: "Form Person", email: "form-person@example.org", phone: "", privacyAccepted: "on" };
const deps = () => ({ verify: async () => true, limiter: createRateLimiter({ limit: 5, windowMs: 600_000 }) });
const context = (ip: string) => ({ ipHash: ip, locale: "am" as const, turnstileToken: "t" });
const stored = async (result: unknown) =>
  (await payload.find({ collection: "inquiries", overrideAccess: true, where: { reference: { equals: (result as { reference: string }).reference } } })).docs[0];

beforeAll(async () => {
  payload = await getPayload({ config });
  await payload.updateGlobal({
    slug: "site-settings",
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: { officeNotificationEmails: [{ email: "forms-office@test.local" }] },
  });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("inquiry forms", () => {
  it("store a Sunday School registration with the child's name and age", async () => {
    const result = await submitInquiry(payload, "sunday_school", { ...contact, childName: "Liya", childAge: "7", message: "" }, context("f-1"), deps());
    expect(await stored(result)).toMatchObject({ type: "sunday_school", status: "new", childName: "Liya", childAge: 7, message: null, preferredLocale: "am" });
  });

  it("store a volunteer's interests and availability", async () => {
    const result = await submitInquiry(payload, "volunteer", { ...contact, interests: ["choir", "media"], availability: "Saturdays" }, context("f-2"), deps());
    expect(await stored(result)).toMatchObject({ type: "volunteer", interests: ["choir", "media"], availability: "Saturdays" });
  });

  it("store marriage and fitihat messages with their own type", async () => {
    const marriage = await submitInquiry(payload, "marriage", { ...contact, message: "We hope to marry next summer." }, context("f-3"), deps());
    const fitihat = await submitInquiry(payload, "funeral", { ...contact, message: "Prayer for our late father, please." }, context("f-3"), deps());
    expect((await stored(marriage)).type).toBe("marriage");
    expect((await stored(fitihat)).type).toBe("funeral");
  });

  it("share one rate limit across all forms", async () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 600_000 });
    const send = (form: "marriage" | "volunteer") =>
      submitInquiry(payload, form, { ...contact, message: "A message long enough.", interests: ["events"] }, context("f-busy"), { verify: async () => true, limiter });
    for (let i = 0; i < 5; i++) expect((await send(i % 2 ? "marriage" : "volunteer")).status).toBe("success");
    expect(await send("marriage")).toEqual({ status: "error", formError: "rateLimited" });
  });

  it.skipIf(!process.env.SMTP_HOST)("email the office the reference and the kind of message, without personal data", async () => {
    const result = await submitInquiry(payload, "sunday_school", { ...contact, childName: "Private Child", childAge: "9" }, context("f-mail"), deps());
    const reference = (result as { reference: string }).reference;
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`subject:"${reference}"`)}`).then((r) => r.json());
    const [mail] = (search.messages as { ID: string; Created: string; Subject: string }[]).filter((m) => Date.parse(m.Created) >= startedAt);
    expect(mail.Subject).toBe(`New message from the website (Sunday School): ${reference}`);
    const full = await fetch(`${MAILPIT}/api/v1/message/${mail.ID}`).then((r) => r.json());
    for (const personal of ["Form Person", "form-person@example.org", "Private Child"]) expect(full.Text).not.toContain(personal);
  });
});
