import { APIError, type CollectionBeforeOperationHook } from "payload";

import { clientIp, createRateLimiter, hashIp } from "../forms/security";

/**
 * Admin sign-in limit per connection (spec Phase 2 task 10, D-037): at most 10 sign-in or
 * password-reset attempts per IP hash in 15 minutes, on top of Payload's own lockout of an account
 * after 5 wrong passwords (Users: maxLoginAttempts). This stops one connection trying many
 * accounts, or flooding staff with reset emails.
 */
export const adminLoginLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });

const LIMITED = new Set(["login", "forgotPassword"]);

export const limitAdminLogins: CollectionBeforeOperationHook = ({ operation, req, args }) => {
  if (!LIMITED.has(operation) || !req.headers) return args;
  // In production every request passes Cloudflare and Caddy, which always add the client's address.
  // Without one it is server code (scripts, the local API) or a direct local connection: nothing to limit.
  const ip = clientIp(req.headers);
  if (ip === "unknown") return args;
  if (!adminLoginLimiter.hit(hashIp(ip))) {
    throw new APIError("Too many sign-in attempts from your connection. Try again in 15 minutes.", 429);
  }
  return args;
};
