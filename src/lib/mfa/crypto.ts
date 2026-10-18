import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "crypto";

import { requireEnv } from "../env";

type KeyPurpose = "secret-encryption" | "session-cookie" | "recovery-codes";

/** Derive a purpose-specific 32-byte key from MFA_ENCRYPTION_KEY (64 hex chars). */
export function deriveKey(purpose: KeyPurpose): Buffer {
  const hex = requireEnv("MFA_ENCRYPTION_KEY");
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error("MFA_ENCRYPTION_KEY must be 64 hex characters (32 bytes).");
  }
  return Buffer.from(
    hkdfSync("sha256", Buffer.from(hex, "hex"), Buffer.alloc(0), `medhanealem-mfa:${purpose}`, 32),
  );
}

/** AES-256-GCM encrypt a TOTP secret for storage. Format: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("secret-encryption"), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, ciphertext].map((part) => (typeof part === "string" ? part : part.toString("base64url"))).join(".");
}

export function decryptSecret(blob: string): string {
  const [version, iv, tag, ciphertext] = blob.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) {
    throw new Error("Unsupported encrypted secret format.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey("secret-encryption"),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const RECOVERY_CODE_COUNT = 8;

/** Recovery codes look like ABCDE-23FGH (50 bits of entropy each). */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const chars = Array.from(randomBytes(10), (byte) => BASE32[byte % 32]).join("");
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}

/** Accepts user input with any case, spaces or dashes; returns canonical form or null. */
export function normalizeRecoveryCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z2-7]{10}$/.test(compact)) return null;
  return `${compact.slice(0, 5)}-${compact.slice(5)}`;
}

/** Keyed hash so stored recovery codes are useless without the server key. */
export function hashRecoveryCode(code: string): string {
  return createHmac("sha256", deriveKey("recovery-codes")).update(code).digest("hex");
}
