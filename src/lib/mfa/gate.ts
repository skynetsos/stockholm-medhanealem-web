import { isMfaSatisfied, type MfaUser } from "./session";

export const MFA_ADMIN_PATH = "/admin/mfa";

/** Admin routes reachable before MFA: Payload's auth screens and the MFA screen itself. */
const OPEN_ADMIN_SEGMENTS = new Set([
  "login",
  "logout",
  "logout-inactivity",
  "forgot",
  "reset",
  "create-first-user",
  "unauthorized",
  "mfa",
]);

/**
 * Decide whether an /admin request must be sent to the MFA screen.
 * Returns the redirect path, or null to let Payload render the page.
 */
export function adminMfaRedirect(args: {
  user: MfaUser | null | undefined;
  headers: Headers;
  segments: string[] | undefined;
}): string | null {
  const first = args.segments?.[0];
  if (first && OPEN_ADMIN_SEGMENTS.has(first)) return null;
  // Unauthenticated requests are handled by Payload's own login redirect.
  if (!args.user) return null;
  return isMfaSatisfied(args.user, args.headers) ? null : MFA_ADMIN_PATH;
}
