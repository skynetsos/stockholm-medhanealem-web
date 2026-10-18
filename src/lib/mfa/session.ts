import { createHmac, timingSafeEqual } from "crypto";
import { generateCookie, parseCookies } from "payload";

import { requiresMfa } from "../../access/roles";
import { deriveKey } from "./crypto";

/**
 * MFA proof for one Payload login session. The cookie is bound to the user id and the
 * Payload session id (`_sid`), so logging out or a super_admin reset invalidates it.
 * It expires after 8 hours regardless of token refreshes (spec §8: 8h privileged sessions).
 */
export const MFA_COOKIE = "medhanealem-mfa";
export const MFA_SESSION_SECONDS = 8 * 60 * 60;

type Claims = { u: string; s: string; e: number };

export type MfaUser = {
  id: string | number;
  roles?: readonly string[] | null;
  active?: boolean | null;
  mfa?: { enabled?: boolean | null } | null;
};

function sign(payload: string): string {
  return createHmac("sha256", deriveKey("session-cookie")).update(payload).digest("base64url");
}

export function createMfaToken(userId: string | number, sid: string, now = Date.now()): string {
  const claims: Claims = { u: String(userId), s: sid, e: Math.floor(now / 1000) + MFA_SESSION_SECONDS };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyMfaToken(
  token: string | undefined,
  userId: string | number,
  sid: string | undefined,
  now = Date.now(),
): boolean {
  if (!token || !sid) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Claims;
    return claims.u === String(userId) && claims.s === sid && claims.e > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

/** Payload sets `_sid` on req.user when sessions are enabled. */
export function sessionIdOf(user: unknown): string | undefined {
  const sid = (user as { _sid?: unknown } | null)?._sid;
  return typeof sid === "string" ? sid : undefined;
}

/** True when the user needs no MFA, or has completed MFA for this exact session. */
export function isMfaSatisfied(user: MfaUser | null | undefined, headers: Headers | undefined): boolean {
  if (!user) return false;
  if (!requiresMfa(user)) return true;
  if (!user.mfa?.enabled || !headers) return false;
  return verifyMfaToken(parseCookies(headers).get(MFA_COOKIE), user.id, sessionIdOf(user));
}

function isSecure(): boolean {
  return (process.env.NEXT_PUBLIC_SERVER_URL ?? "").startsWith("https://");
}

export function mfaCookieHeader(token: string): string {
  return generateCookie<false>({
    name: MFA_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecure(),
    path: "/",
    maxAge: MFA_SESSION_SECONDS,
    returnCookieAsObject: false,
  });
}
