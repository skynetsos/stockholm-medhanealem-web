/**
 * Create (or re-invite) a super_admin without ever handling their password.
 *
 *   ADMIN_EMAIL=someone@example.org ADMIN_NAME="Full Name" pnpm user:create-super-admin
 *   (PowerShell: $env:ADMIN_EMAIL="..."; $env:ADMIN_NAME="..."; pnpm user:create-super-admin)
 *
 * The account gets a random throwaway password; the script prints a one-time link
 * (valid 1 hour) where the person sets their own password. They then enrol MFA at first sign-in.
 */
import { randomBytes } from "crypto";
import { getPayload } from "payload";

import config from "../src/payload.config";
import { input } from "./lib/args";

const email = input("ADMIN_EMAIL")?.toLowerCase();
const name = input("ADMIN_NAME");
if (!email || !name) {
  console.error('Usage: ADMIN_EMAIL=someone@example.org ADMIN_NAME="Full Name" pnpm user:create-super-admin');
  process.exit(1);
}

const payload = await getPayload({ config });

const existing = await payload.find({
  collection: "users",
  where: { email: { equals: email } },
  limit: 1,
  overrideAccess: true,
});

if (existing.docs[0]) {
  console.log(`User ${email} already exists — issuing a new set-password link only.`);
} else {
  await payload.create({
    collection: "users",
    data: { email, name, roles: ["super_admin"], active: true, password: randomBytes(32).toString("base64url") },
    overrideAccess: true,
  });
  console.log(`Created super_admin ${name} <${email}>.`);
}

const token = await payload.forgotPassword({
  collection: "users",
  data: { email },
  disableEmail: true,
});

console.log("\nOpen this link to set the password (valid for 1 hour):");
console.log(`${process.env.NEXT_PUBLIC_SERVER_URL}/admin/reset/${token}\n`);
process.exit(0);
