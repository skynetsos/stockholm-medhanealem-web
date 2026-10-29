/**
 * Reference numbers under concurrency (spec §2.12/§2.14, D-034): simultaneous submissions must never
 * get the same reference, including the first ones of a new year and right after a restart.
 */
import { sql } from "@payloadcms/db-postgres";
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import { submitBaptismRequest } from "../../src/lib/forms/baptism";
import { createRateLimiter } from "../../src/lib/forms/security";
import { nextReference } from "../../src/lib/reference";

let payload: Payload;
const N = 20;

const form = {
  applicantName: "Concurrent Applicant",
  applicantEmail: "concurrent@example.org",
  applicantPhone: "",
  parishRelationship: "member",
  candidateName: "Concurrent Candidate",
  dateOfBirth: "2000-01-01",
  category: "adult",
  guardianName: "",
  guardianRelationship: "",
  guardianConsent: "",
  preferredPeriod: "",
  notes: "",
  privacyAccepted: "on",
};

const execute = (query: string) =>
  (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }).drizzle.execute(sql.raw(query));

beforeAll(async () => {
  payload = await getPayload({ config });
  await payload.updateGlobal({ slug: "baptism-page", overrideAccess: true, context: { disableRevalidate: true }, data: { requestsOpen: true } });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("reference numbers under concurrency", () => {
  it(`gives ${N} simultaneous baptism requests ${N} different references`, async () => {
    const limiter = createRateLimiter({ limit: 1000, windowMs: 60_000 });
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        submitBaptismRequest(payload, form, { ipHash: `concurrent-${i}`, locale: "en", turnstileToken: "t", userAgent: "test" }, { verify: async () => true, limiter }),
      ),
    );
    const references = results.map((r) => (r as { reference?: string }).reference);
    expect(results.every((r) => r.status === "success")).toBe(true);
    expect(new Set(references).size).toBe(N);
  });

  it(`stays unique for ${N} at once right after the sequence was dropped (dev restart)`, async () => {
    const year = new Date().getFullYear();
    // More stored references than requests below, so every one of them needs the restart recovery.
    const stored0 = await payload.count({ collection: "baptism-requests", overrideAccess: true });
    for (let i = stored0.totalDocs; i < N + 5; i++) {
      await payload.create({
        collection: "baptism-requests",
        overrideAccess: true,
        data: { status: "new", applicant: { name: "Filler", email: "f@example.org", preferredLocale: "en" }, candidate: { fullName: "Filler", category: "adult" }, privacyAccepted: true },
      });
    }
    await execute(`DROP SEQUENCE IF EXISTS "ref_bap_${year}"`);
    const references = await Promise.all(Array.from({ length: N }, () => nextReference(payload, "BAP")));
    expect(new Set(references).size).toBe(N);
    // And continues above every stored reference.
    const stored = await payload.find({ collection: "baptism-requests", overrideAccess: true, limit: 0, select: { reference: true } });
    const highest = Math.max(...stored.docs.map((d) => Number(d.reference!.split("-")[2])));
    expect(Math.min(...references.map((r) => Number(r.split("-")[2])))).toBeGreaterThan(highest);
  });

  it(`creates a new year's sequence once, even with ${N} first requests at the same moment`, async () => {
    const newYear = new Date("2031-01-01T00:30:00.000Z"); // 01:30 on New Year's Day in Stockholm
    await execute(`DROP SEQUENCE IF EXISTS "ref_inq_2031"`);
    const references = await Promise.all(Array.from({ length: N }, () => nextReference(payload, "INQ", newYear)));
    expect(new Set(references).size).toBe(N);
    expect(references.map((r) => Number(r.split("-")[2])).sort((a, b) => a - b)).toEqual(Array.from({ length: N }, (_, i) => i + 1));
    await execute(`DROP SEQUENCE IF EXISTS "ref_inq_2031"`);
  });
});
