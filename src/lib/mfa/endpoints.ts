import QRCode from "qrcode";
import type { Endpoint, PayloadRequest } from "payload";

import { isSuperAdminRequest } from "../../access";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from "./crypto";
import { createMfaToken, mfaCookieHeader, sessionIdOf } from "./session";
import { checkTotp, newTotpSecret, totpUri } from "./totp";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Stored MFA state (hidden fields on the Users collection). */
type MfaState = {
  enabled?: boolean | null;
  enrolledAt?: string | null;
  secret?: string | null;
  pendingSecret?: string | null;
  recoveryCodes?: unknown;
  lastTimeStep?: number | null;
  failedAttempts?: number | null;
  lockedUntil?: string | null;
};

type MfaUserDoc = { id: number | string; email: string; mfa?: MfaState | null };

/** Error codes the admin MFA screen translates. */
export type MfaErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "already_enrolled"
  | "not_enrolled"
  | "no_pending_setup"
  | "invalid_code"
  | "locked"
  | "no_session"
  | "not_found";

const STATUS: Record<MfaErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  already_enrolled: 409,
  not_enrolled: 409,
  no_pending_setup: 400,
  invalid_code: 400,
  locked: 429,
  no_session: 400,
  not_found: 404,
};

const fail = (error: MfaErrorCode) => Response.json({ error }, { status: STATUS[error] });

async function readBody(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json?.();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function loadUser(req: PayloadRequest, id: number | string): Promise<MfaUserDoc | null> {
  try {
    return (await req.payload.findByID({
      collection: "users",
      id,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })) as unknown as MfaUserDoc;
  } catch {
    return null;
  }
}

async function saveMfa(req: PayloadRequest, id: number | string, mfa: MfaState, extra: Record<string, unknown> = {}) {
  await req.payload.update({
    collection: "users",
    id,
    overrideAccess: true,
    data: { mfa, ...extra } as never,
  });
}

function isLocked(mfa: MfaState | null | undefined): boolean {
  return Boolean(mfa?.lockedUntil && new Date(mfa.lockedUntil).getTime() > Date.now());
}

async function registerFailure(req: PayloadRequest, user: MfaUserDoc): Promise<Response> {
  const mfa = user.mfa ?? {};
  const attempts = (mfa.failedAttempts ?? 0) + 1;
  const locked = attempts >= MAX_FAILED_ATTEMPTS;
  await saveMfa(req, user.id, {
    ...mfa,
    failedAttempts: locked ? 0 : attempts,
    lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : mfa.lockedUntil,
  });
  return fail(locked ? "locked" : "invalid_code");
}

function storedCodes(mfa: MfaState | null | undefined): string[] {
  return Array.isArray(mfa?.recoveryCodes) ? (mfa.recoveryCodes as string[]) : [];
}

/** Marks this login session as MFA-verified. */
function verifiedResponse(req: PayloadRequest, data: Record<string, unknown>): Response {
  const sid = sessionIdOf(req.user);
  if (!req.user || !sid) return fail("no_session");
  return Response.json(data, { headers: { "Set-Cookie": mfaCookieHeader(createMfaToken(req.user.id, sid)) } });
}

/** POST /api/users/mfa/setup — start enrolment: new pending secret + QR code. */
const setup: Endpoint = {
  path: "/mfa/setup",
  method: "post",
  handler: async (req) => {
    if (!req.user) return fail("unauthenticated");
    const user = await loadUser(req, req.user.id);
    if (!user) return fail("not_found");
    if (user.mfa?.enabled) return fail("already_enrolled");

    const secret = newTotpSecret();
    await saveMfa(req, user.id, { ...user.mfa, pendingSecret: encryptSecret(secret) });
    const uri = totpUri(secret, user.email);
    const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 240 });
    return Response.json({ uri, qrDataUrl, secret });
  },
};

/** POST /api/users/mfa/enroll { code } — confirm the first code, enable MFA, issue recovery codes once. */
const enroll: Endpoint = {
  path: "/mfa/enroll",
  method: "post",
  handler: async (req) => {
    if (!req.user) return fail("unauthenticated");
    const user = await loadUser(req, req.user.id);
    if (!user) return fail("not_found");
    const mfa = user.mfa ?? {};
    if (mfa.enabled) return fail("already_enrolled");
    if (!mfa.pendingSecret) return fail("no_pending_setup");
    if (isLocked(mfa)) return fail("locked");

    const { code } = await readBody(req);
    const timeStep = await checkTotp(decryptSecret(mfa.pendingSecret), String(code ?? ""));
    if (timeStep === null) return registerFailure(req, user);

    const recoveryCodes = generateRecoveryCodes();
    await saveMfa(req, user.id, {
      enabled: true,
      enrolledAt: new Date().toISOString(),
      secret: mfa.pendingSecret,
      pendingSecret: null,
      recoveryCodes: recoveryCodes.map(hashRecoveryCode),
      lastTimeStep: timeStep,
      failedAttempts: 0,
      lockedUntil: null,
    });
    // Plaintext recovery codes leave the server exactly once, in this response.
    return verifiedResponse(req, { recoveryCodes });
  },
};

/** POST /api/users/mfa/verify { code } | { recoveryCode } — complete MFA for this session. */
const verifyEndpoint: Endpoint = {
  path: "/mfa/verify",
  method: "post",
  handler: async (req) => {
    if (!req.user) return fail("unauthenticated");
    const user = await loadUser(req, req.user.id);
    if (!user) return fail("not_found");
    const mfa = user.mfa ?? {};
    if (!mfa.enabled || !mfa.secret) return fail("not_enrolled");
    if (isLocked(mfa)) return fail("locked");

    const body = await readBody(req);

    if (typeof body.recoveryCode === "string") {
      const normalized = normalizeRecoveryCode(body.recoveryCode);
      const codes = storedCodes(mfa);
      const hash = normalized ? hashRecoveryCode(normalized) : null;
      if (!hash || !codes.includes(hash)) return registerFailure(req, user);
      const remaining = codes.filter((stored) => stored !== hash);
      await saveMfa(req, user.id, { ...mfa, recoveryCodes: remaining, failedAttempts: 0, lockedUntil: null });
      return verifiedResponse(req, { ok: true, recoveryCodesRemaining: remaining.length });
    }

    const timeStep = await checkTotp(decryptSecret(mfa.secret), String(body.code ?? ""), mfa.lastTimeStep);
    if (timeStep === null) return registerFailure(req, user);
    await saveMfa(req, user.id, { ...mfa, lastTimeStep: timeStep, failedAttempts: 0, lockedUntil: null });
    return verifiedResponse(req, { ok: true, recoveryCodesRemaining: storedCodes(mfa).length });
  },
};

/** POST /api/users/:id/mfa/reset — super_admin only: wipe MFA and sign the user out everywhere. */
const reset: Endpoint = {
  path: "/:id/mfa/reset",
  method: "post",
  handler: async (req) => {
    if (!req.user) return fail("unauthenticated");
    if (!isSuperAdminRequest(req)) return fail("forbidden");
    const id = req.routeParams?.id as string | undefined;
    const target = id ? await loadUser(req, id) : null;
    if (!target) return fail("not_found");

    await saveMfa(
      req,
      target.id,
      {
        enabled: false,
        enrolledAt: null,
        secret: null,
        pendingSecret: null,
        recoveryCodes: [],
        lastTimeStep: null,
        failedAttempts: 0,
        lockedUntil: null,
      },
      { sessions: [] },
    );
    req.payload.logger.info({ msg: "MFA reset", targetUserId: target.id, byUserId: req.user.id });
    return Response.json({ ok: true });
  },
};

export const mfaEndpoints: Endpoint[] = [setup, enroll, verifyEndpoint, reset];
