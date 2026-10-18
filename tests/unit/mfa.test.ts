import { beforeAll, describe, expect, it } from "vitest";

import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from "../../src/lib/mfa/crypto";
import { adminMfaRedirect, MFA_ADMIN_PATH } from "../../src/lib/mfa/gate";
import { createMfaToken, MFA_COOKIE, MFA_SESSION_SECONDS, verifyMfaToken } from "../../src/lib/mfa/session";

beforeAll(() => {
  process.env.MFA_ENCRYPTION_KEY = "0".repeat(63) + "1";
});

describe("secret encryption", () => {
  it("round-trips and produces a different ciphertext each time", () => {
    const a = encryptSecret("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
    const b = encryptSecret("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
  });

  it("rejects tampered ciphertext", () => {
    const parts = encryptSecret("secret").split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });
});

describe("recovery codes", () => {
  it("generates 8 unique codes in XXXXX-XXXXX format", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    codes.forEach((code) => expect(code).toMatch(/^[A-Z2-7]{5}-[A-Z2-7]{5}$/));
  });

  it("normalises user input and hashes deterministically", () => {
    expect(normalizeRecoveryCode(" abcde 23fgh ")).toBe("ABCDE-23FGH");
    expect(normalizeRecoveryCode("abcde-23fg")).toBeNull();
    expect(hashRecoveryCode("ABCDE-23FGH")).toBe(hashRecoveryCode("ABCDE-23FGH"));
    expect(hashRecoveryCode("ABCDE-23FGH")).not.toContain("ABCDE");
  });
});

describe("MFA session token", () => {
  const now = Date.UTC(2026, 9, 18, 12);

  it("is bound to the user and Payload session id", () => {
    const token = createMfaToken(7, "sid-a", now);
    expect(verifyMfaToken(token, 7, "sid-a", now)).toBe(true);
    expect(verifyMfaToken(token, 8, "sid-a", now)).toBe(false);
    expect(verifyMfaToken(token, 7, "sid-b", now)).toBe(false);
    expect(verifyMfaToken(token, 7, undefined, now)).toBe(false);
  });

  it("expires after 8 hours", () => {
    const token = createMfaToken(7, "sid-a", now);
    expect(verifyMfaToken(token, 7, "sid-a", now + (MFA_SESSION_SECONDS - 1) * 1000)).toBe(true);
    expect(verifyMfaToken(token, 7, "sid-a", now + MFA_SESSION_SECONDS * 1000)).toBe(false);
  });

  it("rejects a forged signature", () => {
    const [payload] = createMfaToken(7, "sid-a", now).split(".");
    expect(verifyMfaToken(`${payload}.forged`, 7, "sid-a", now)).toBe(false);
  });
});

describe("admin MFA gate", () => {
  const privileged = { id: 1, roles: ["office_coordinator"], mfa: { enabled: false }, _sid: "s1" };
  const editor = { id: 2, roles: ["editor"], mfa: { enabled: false }, _sid: "s2" };
  const noCookie = new Headers();

  it("sends privileged users without MFA to the MFA screen", () => {
    expect(adminMfaRedirect({ user: privileged, headers: noCookie, segments: [] })).toBe(MFA_ADMIN_PATH);
    expect(adminMfaRedirect({ user: privileged, headers: noCookie, segments: ["collections", "users"] })).toBe(
      MFA_ADMIN_PATH,
    );
  });

  it("leaves auth screens, the MFA screen and non-privileged users alone", () => {
    for (const open of ["mfa", "login", "logout", "reset"]) {
      expect(adminMfaRedirect({ user: privileged, headers: noCookie, segments: [open] })).toBeNull();
    }
    expect(adminMfaRedirect({ user: editor, headers: noCookie, segments: [] })).toBeNull();
    expect(adminMfaRedirect({ user: null, headers: noCookie, segments: [] })).toBeNull();
  });

  it("lets an enrolled user through with a valid cookie for their session", () => {
    const user = { ...privileged, mfa: { enabled: true } };
    const headers = new Headers({ cookie: `${MFA_COOKIE}=${createMfaToken(1, "s1")}` });
    expect(adminMfaRedirect({ user, headers, segments: [] })).toBeNull();
  });
});
