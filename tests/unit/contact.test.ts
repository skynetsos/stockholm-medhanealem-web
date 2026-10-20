import { describe, expect, it, vi } from "vitest";

import { parseContact } from "../../src/lib/forms/contact-schema";
import { clientIp, createRateLimiter, hashIp, verifyTurnstile } from "../../src/lib/forms/security";
import { formatReference } from "../../src/lib/reference";

const valid = { name: "Abebe", email: "abebe@example.org", phone: "", message: "Hello, when is Kidase?", privacyAccepted: "on" };

describe("contact form validation", () => {
  it("accepts a valid message and trims it", () => {
    const result = parseContact({ ...valid, name: "  Abebe  " });
    expect(result).toEqual({ ok: true, data: { ...valid, privacyAccepted: true } });
  });

  it("returns one error code per field", () => {
    const result = parseContact({ name: "", email: "not-an-email", phone: "abc", message: "short", privacyAccepted: undefined });
    expect(result).toEqual({
      ok: false,
      errors: { name: "required", email: "email", phone: "phone", message: "messageShort", privacyAccepted: "privacy" },
    });
    expect(parseContact({ ...valid, message: "x".repeat(4001) })).toMatchObject({ ok: false, errors: { message: "tooLong" } });
    expect(parseContact({ ...valid, phone: "+46 8 123 45 67" }).ok).toBe(true);
  });
});

describe("spam protection", () => {
  it("hashes IPs with the salt and never returns the IP", () => {
    expect(hashIp("1.2.3.4", "a")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("1.2.3.4", "a")).toBe(hashIp("1.2.3.4", "a"));
    expect(hashIp("1.2.3.4", "a")).not.toBe(hashIp("1.2.3.4", "b"));
  });

  it("reads the visitor IP from Cloudflare, then the proxy headers", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 10.0.0.1" }))).toBe("1.1.1.1");
    expect(clientIp(new Headers())).toBe("unknown");
  });

  it("rate-limits 5 per 10 minutes per key", () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 600_000 });
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(limiter.hit("a", t0 + i)).toBe(true);
    expect(limiter.hit("a", t0 + 10)).toBe(false);
    expect(limiter.hit("b", t0 + 10)).toBe(true); // other visitors unaffected
    expect(limiter.hit("a", t0 + 600_001)).toBe(true); // window passed
  });

  it("verifies Turnstile tokens with Cloudflare; without a key only outside production", async () => {
    const ok = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
    const bad = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false })));
    expect(await verifyTurnstile("token", { secret: "s", production: true, fetcher: ok })).toBe(true);
    expect(await verifyTurnstile("token", { secret: "s", production: true, fetcher: bad })).toBe(false);
    expect(await verifyTurnstile(null, { secret: "s", production: true, fetcher: ok })).toBe(false);
    expect(await verifyTurnstile(null, { secret: "", production: false })).toBe(true);
    expect(await verifyTurnstile("token", { secret: "", production: true })).toBe(false);
    expect(await verifyTurnstile("token", { secret: "s", fetcher: vi.fn().mockRejectedValue(new Error("down")) })).toBe(false);
  });
});

describe("references", () => {
  it("formats INQ-YYYY-NNNN", () => {
    expect(formatReference("INQ", 2026, 42)).toBe("INQ-2026-0042");
    expect(formatReference("INQ", 2026, 12345)).toBe("INQ-2026-12345");
  });
});
