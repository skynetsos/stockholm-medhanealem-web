import { describe, expect, it } from "vitest";

import { adminCsp, API_CSP, createNonce, FRAME_SOURCES, publicCsp } from "../../src/lib/security/csp";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `) || d === name)?.split(" ").slice(1);

describe("Content Security Policy (D-037)", () => {
  it("public site: scripts only with the nonce, no inline or eval in production", () => {
    const csp = publicCsp("abcdefghijklmnop1234==");
    expect(directive(csp, "script-src")).toEqual(["'self'", "'nonce-abcdefghijklmnop1234=='", "'strict-dynamic'", "https://challenges.cloudflare.com"]);
    expect(csp).not.toContain("unsafe-eval");
    expect(directive(csp, "script-src")).not.toContain("'unsafe-inline'");
    expect(directive(csp, "object-src")).toEqual(["'none'"]);
    expect(directive(csp, "base-uri")).toEqual(["'self'"]);
    expect(directive(csp, "form-action")).toEqual(["'self'"]);
    expect(csp).not.toContain("upgrade-insecure-requests");
    expect(publicCsp("abcdefghijklmnop1234==", { https: true })).toContain("upgrade-insecure-requests");
    expect(directive(publicCsp("abcdefghijklmnop1234==", { dev: true }), "script-src")).toContain("'unsafe-eval'");
  });

  it("public site: frames only from Turnstile, youtube-nocookie, Vimeo and the map", () => {
    expect(directive(publicCsp("abcdefghijklmnop1234=="), "frame-src")).toEqual([
      "https://challenges.cloudflare.com",
      "https://www.youtube-nocookie.com",
      "https://player.vimeo.com",
      "https://www.openstreetmap.org",
    ]);
    expect(FRAME_SOURCES).not.toContain("https://www.youtube.com");
  });

  it("refuses a malformed nonce (it can't break out of the header)", () => {
    expect(() => publicCsp("x'; script-src *")).toThrow();
    expect(() => publicCsp("short")).toThrow();
  });

  it("makes a fresh, well-formed nonce every time", () => {
    const nonces = new Set(Array.from({ length: 50 }, createNonce));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) expect(() => publicCsp(nonce)).not.toThrow();
  });

  it("admin: inline allowed for Payload, but no other site at all", () => {
    const csp = adminCsp();
    expect(directive(csp, "script-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp).not.toMatch(/https?:\/\//);
    expect(directive(csp, "frame-ancestors")).toEqual(["'self'"]);
  });

  it("APIs: nothing runs, nothing loads", () => {
    expect(API_CSP).toBe("default-src 'none'; frame-ancestors 'none'; sandbox");
  });
});
