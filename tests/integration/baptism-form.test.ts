/** Baptism request form submission (spec Phase 2 task 4). */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { submitBaptismRequest } from "../../src/lib/forms/baptism";
import { createRateLimiter } from "../../src/lib/forms/security";

let payload: Payload;

const form = {
  applicantName: "Form Applicant",
  applicantEmail: "form@example.org",
  applicantPhone: "070 123 45 67",
  parishRelationship: "regular",
  candidateName: "Form Child",
  dateOfBirth: "2025-06-01",
  category: "infant",
  guardianName: "Form Applicant",
  guardianRelationship: "Mother",
  guardianConsent: "on",
  preferredPeriod: "December 2026",
  notes: "",
  privacyAccepted: "on",
};
const passTurnstile = async () => true;
const freshLimiter = () => createRateLimiter({ limit: 3, windowMs: 3_600_000 });
const context = (ip = "bap-ip-1") => ({ ipHash: ip, locale: "en" as const, turnstileToken: "token", userAgent: "Test browser" });
const setOpen = (requestsOpen: boolean) =>
  payload.updateGlobal({ slug: "baptism-page", overrideAccess: true, context: { disableRevalidate: true }, data: { requestsOpen } });
const byReference = async (result: unknown) =>
  (await payload.find({ collection: "baptism-requests", overrideAccess: true, where: { reference: { equals: (result as { reference: string }).reference } } })).docs[0];

beforeAll(async () => {
  payload = await getPayload({ config });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("baptism request form submission", () => {
  it("is refused while requests are closed", async () => {
    await setOpen(false);
    expect(await submitBaptismRequest(payload, form, context(), { verify: passTurnstile, limiter: freshLimiter() })).toEqual({
      status: "error",
      formError: "closed",
    });
  });

  it("stores a new request with reference, guardian, language and source", async () => {
    await setOpen(true);
    const now = new Date("2026-10-27T18:30:00.000Z");
    const result = await submitBaptismRequest(payload, form, context(), { verify: passTurnstile, limiter: freshLimiter(), now: () => now });
    expect(result).toMatchObject({ status: "success", reference: expect.stringMatching(/^BAP-\d{4}-\d{4,}$/) });
    expect(await byReference(result)).toMatchObject({
      status: "new",
      applicant: { name: "Form Applicant", email: "form@example.org", phone: "070 123 45 67", preferredLocale: "en", parishRelationship: "regular" },
      // Stockholm midnight on 1 June 2025 (summer time) is 22:00 UTC the day before.
      candidate: { fullName: "Form Child", dateOfBirth: "2025-05-31T22:00:00.000Z", category: "infant" },
      guardian: { name: "Form Applicant", relationship: "Mother", consentConfirmed: true },
      preferredPeriod: "December 2026",
      privacyAccepted: true,
      source: { ipHash: "bap-ip-1", userAgent: "Test browser", submittedAt: now.toISOString() },
    });
  });

  it("stores an adult without guardian details, even if some were typed before switching", async () => {
    const result = await submitBaptismRequest(payload, { ...form, category: "adult", guardianConsent: "" }, context("bap-ip-adult"), {
      verify: passTurnstile,
      limiter: freshLimiter(),
    });
    expect((await byReference(result)).guardian).toMatchObject({ name: null, relationship: null, consentConfirmed: false });
  });

  it("drops honeypot submissions, returns field errors and refuses failed spam checks", async () => {
    const before = (await payload.count({ collection: "baptism-requests", overrideAccess: true })).totalDocs;
    expect(
      await submitBaptismRequest(payload, { ...form, website: "http://spam.example" }, context(), { verify: passTurnstile, limiter: freshLimiter() }),
    ).toEqual({ status: "success", reference: null });
    expect(await submitBaptismRequest(payload, { ...form, guardianConsent: "" }, context(), { verify: passTurnstile, limiter: freshLimiter() })).toEqual({
      status: "error",
      fieldErrors: { guardianConsent: "consent" },
    });
    expect(await submitBaptismRequest(payload, form, context(), { verify: async () => false, limiter: freshLimiter() })).toEqual({
      status: "error",
      formError: "spam",
    });
    expect((await payload.count({ collection: "baptism-requests", overrideAccess: true })).totalDocs).toBe(before);
  });

  it("allows 3 requests per hour from one connection", async () => {
    const limiter = freshLimiter();
    for (let i = 0; i < 3; i++) {
      expect((await submitBaptismRequest(payload, form, context("bap-ip-busy"), { verify: passTurnstile, limiter })).status).toBe("success");
    }
    expect(await submitBaptismRequest(payload, form, context("bap-ip-busy"), { verify: passTurnstile, limiter })).toEqual({
      status: "error",
      formError: "rateLimited",
    });
    expect((await submitBaptismRequest(payload, form, context("bap-ip-other"), { verify: passTurnstile, limiter })).status).toBe("success");
  });
});
