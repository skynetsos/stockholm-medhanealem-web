import { createHash } from "crypto";

/**
 * Spam and abuse protection for public forms (spec §7): IP hashing, rate limiting, Turnstile.
 * Raw IP addresses are never stored or logged; only a salted hash is used, and only in memory.
 */

/**
 * The visitor's IP address. In production every request passes Cloudflare and Caddy (the app port
 * isn't published), so the proxy headers can be trusted: Cloudflare's own header first.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function hashIp(ip: string, salt = process.env.IP_HASH_SALT ?? ""): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Sliding-window rate limiter kept in memory: one app container serves the site (docs/RUNBOOK.md),
 * so a restart only resets the counters. Cloudflare's rate limiting sits in front of it.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  return {
    /** Records an attempt; false when the key already used up its attempts in the window. */
    hit(key: string, now = Date.now()): boolean {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      // Forget idle keys now and then so the map can't grow without bound.
      if (hits.size > 10_000) for (const [k, times] of hits) if (times.every((t) => now - t >= windowMs)) hits.delete(k);
      return true;
    },
    reset() {
      hits.clear();
    },
  };
}

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Cloudflare Turnstile check. Without a secret key the check is skipped outside production (local
 * development) and fails in production, so a missing key can never switch spam protection off.
 */
export async function verifyTurnstile(
  token: string | null,
  { secret = process.env.TURNSTILE_SECRET_KEY, production = process.env.SITE_ENV === "production", fetcher = fetch } = {},
): Promise<boolean> {
  if (!secret) return !production;
  if (!token) return false;
  try {
    const res = await fetcher(SITEVERIFY, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
