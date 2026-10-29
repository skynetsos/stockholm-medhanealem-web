import { describe, expect, it } from "vitest";

import { retentionCutoff } from "../../src/lib/baptism/retention";
import { cronAuth } from "../../src/lib/cron-auth";

describe("retention (D-035)", () => {
  it("counts back whole months", () => {
    expect(retentionCutoff(new Date("2029-01-15T12:00:00.000Z"), 24).toISOString()).toBe("2027-01-15T12:00:00.000Z");
    expect(retentionCutoff(new Date("2026-10-29T03:00:00.000Z"), 1).toISOString()).toBe("2026-09-29T03:00:00.000Z");
  });

  it("checks the cron secret, and treats a missing or example secret as not set up", () => {
    const secret = "a-long-cron-secret-123456";
    const headers = (value?: string) => new Headers(value ? { authorization: value } : {});
    expect(cronAuth(headers(`Bearer ${secret}`), secret)).toBe("ok");
    expect(cronAuth(headers("Bearer nope"), secret)).toBe("unauthorized");
    expect(cronAuth(headers(), secret)).toBe("unauthorized");
    expect(cronAuth(headers(secret), secret)).toBe("unauthorized");
    expect(cronAuth(headers("Bearer x"), "")).toBe("unconfigured");
    expect(cronAuth(headers("Bearer replace-with-random-hex"), "replace-with-random-hex")).toBe("unconfigured");
  });
});
