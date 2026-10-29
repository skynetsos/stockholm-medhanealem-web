import { createHash, timingSafeEqual } from "crypto";

/**
 * Whether a cron request carries the shared secret (`Authorization: Bearer <CRON_SECRET>`).
 * "unconfigured" when the server has no real secret: the job then refuses to run rather than
 * running unprotected. Compared in constant time.
 */
export function cronAuth(headers: Headers, secret = process.env.CRON_SECRET): "ok" | "unauthorized" | "unconfigured" {
  if (!secret || secret.startsWith("replace-with") || secret.length < 16) return "unconfigured";
  const given = headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1] ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(secret)) ? "ok" : "unauthorized";
}
