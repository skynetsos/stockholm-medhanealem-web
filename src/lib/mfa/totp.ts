import { generateSecret, generateURI, verify } from "otplib";

/** Issuer label shown in authenticator apps. */
export const MFA_ISSUER = "medhanealem.se";

export function newTotpSecret(): string {
  return generateSecret();
}

export function totpUri(secret: string, accountLabel: string): string {
  return generateURI({ issuer: MFA_ISSUER, label: accountLabel, secret });
}

/**
 * Verify a 6-digit TOTP code, allowing ±30 s clock drift.
 * Returns the matched time step, or null. Codes at or before `afterTimeStep` are rejected (replay protection).
 */
export async function checkTotp(
  secret: string,
  token: string,
  afterTimeStep?: number | null,
): Promise<number | null> {
  if (!/^\d{6}$/.test(token)) return null;
  const result = await verify({
    secret,
    token,
    epochTolerance: 30,
    ...(typeof afterTimeStep === "number" ? { afterTimeStep } : {}),
  });
  return result.valid && "timeStep" in result ? result.timeStep : null;
}
