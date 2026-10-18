/**
 * Break-glass MFA reset for server operators, e.g. if the only super_admin loses both
 * their phone and their recovery codes. Normal resets use the "Reset MFA" button in /admin.
 *
 *   ADMIN_EMAIL=someone@example.org pnpm user:reset-mfa
 *   (PowerShell: $env:ADMIN_EMAIL="..."; pnpm user:reset-mfa)
 *
 * Clears the user's MFA and signs them out everywhere; they enrol again at next sign-in.
 */
import { getPayload } from "payload";

import config from "../src/payload.config";
import { input } from "./lib/args";

const email = input("ADMIN_EMAIL")?.toLowerCase();
if (!email) {
  console.error("Usage: ADMIN_EMAIL=someone@example.org pnpm user:reset-mfa");
  process.exit(1);
}

const payload = await getPayload({ config });
const { docs } = await payload.find({
  collection: "users",
  where: { email: { equals: email } },
  limit: 1,
  overrideAccess: true,
});
const user = docs[0];
if (!user) {
  console.error(`No user with email ${email}.`);
  process.exit(1);
}

await payload.update({
  collection: "users",
  id: user.id,
  overrideAccess: true,
  data: {
    mfa: {
      enabled: false,
      enrolledAt: null,
      secret: null,
      pendingSecret: null,
      recoveryCodes: [],
      lastTimeStep: null,
      failedAttempts: 0,
      lockedUntil: null,
    },
    sessions: [],
  } as never,
});
payload.logger.info({ msg: "MFA reset (CLI)", targetUserId: user.id });
console.log(`MFA reset for ${email}. They must enrol again at next sign-in.`);
process.exit(0);
