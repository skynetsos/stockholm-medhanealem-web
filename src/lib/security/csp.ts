/**
 * Content Security Policies (spec Phase 2 task 10, D-037). No server-only imports: the middleware
 * (edge runtime) and next.config use this.
 */

/** Frames the public site may show, and nothing else (D-037). */
export const FRAME_SOURCES = [
  "https://challenges.cloudflare.com", // Turnstile spam check on the forms
  "https://www.youtube-nocookie.com", // videos (privacy-enhanced player, D-019)
  "https://player.vimeo.com",
  "https://www.openstreetmap.org", // map on /visit, after a click (D-021)
] as const;

type Options = { dev?: boolean; https?: boolean };

const join = (directives: Record<string, string[]>) =>
  Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" ").trim())
    .join("; ");

/**
 * The public site: scripts only with this response's nonce. `'strict-dynamic'` lets those scripts
 * load others (Next.js chunks, the Turnstile script added by our form); the host list is the
 * fallback for browsers without it. Styles may be inline: Next.js images and Turnstile set style
 * attributes, and CSS can't run code.
 */
export function publicCsp(nonce: string, { dev = false, https = false }: Options = {}): string {
  if (!/^[A-Za-z0-9+/=_-]{16,}$/.test(nonce)) throw new Error("Invalid CSP nonce");
  return join({
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", "https://challenges.cloudflare.com", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", "https://challenges.cloudflare.com"],
    "frame-src": [...FRAME_SOURCES],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
    ...(https ? { "upgrade-insecure-requests": [] } : {}),
  });
}

/**
 * The Payload admin: its React app relies on inline scripts and styles, so it gets its own policy
 * with 'unsafe-inline' but no third-party sources at all; only signed-in staff use it.
 */
export function adminCsp({ dev = false, https = false }: Options = {}): string {
  return join({
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'"],
    "frame-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
    ...(https ? { "upgrade-insecure-requests": [] } : {}),
  });
}

/**
 * API responses (JSON, uploaded files): nothing may run or load. An uploaded SVG opened directly
 * can't execute script.
 */
export const API_CSP = "default-src 'none'; frame-ancestors 'none'; sandbox";

/** A fresh nonce: 16 random bytes, base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/** Development server (eval for fast refresh) and HTTPS (upgrade any http:// subresource). */
export const cspOptions = (): Options => ({
  dev: process.env.NODE_ENV === "development",
  https: (process.env.NEXT_PUBLIC_SERVER_URL ?? "").startsWith("https://"),
});
