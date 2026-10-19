/** Shared helpers for integration tests that act as specific staff roles. */
import type { Payload, PayloadRequest } from "payload";

import type { Role } from "../../src/access/roles";
import { createMfaToken, MFA_COOKIE } from "../../src/lib/mfa/session";
import type { User } from "../../src/payload-types";

export const noRevalidate = { disableRevalidate: true };

/** Minimal Lexical document with one paragraph. */
export const rich = (text: string) => ({
  root: {
    type: "root",
    format: "" as const,
    indent: 0,
    version: 1,
    direction: "ltr" as const,
    children: [
      {
        type: "paragraph",
        format: "" as const,
        indent: 0,
        version: 1,
        direction: "ltr" as const,
        textFormat: 0,
        children: [{ type: "text", text, format: 0, detail: 0, mode: "normal", style: "", version: 1 }],
      },
    ],
  },
});

export type Actor = { user: User & { collection: "users" }; req?: Partial<PayloadRequest> };

const PRIVILEGED: Role[] = ["super_admin", "clergy_approver", "office_coordinator"];

/** Create a staff member as the local API sees them; privileged roles get a valid MFA session. */
export async function createActor(
  payload: Payload,
  email: string,
  roles: Role[],
  extra: Partial<User> = {},
): Promise<Actor> {
  const doc = await payload.create({
    collection: "users",
    overrideAccess: true,
    data: { email, password: "Integration-test-Pa55!", name: email, roles, active: true, ...extra },
  });
  if (!roles.some((r) => PRIVILEGED.includes(r))) return { user: { ...doc, collection: "users" } };
  const sid = `test-session-${doc.id}`;
  const user = { ...doc, collection: "users" as const, mfa: { ...doc.mfa, enabled: true }, _sid: sid };
  const headers = new Headers({ cookie: `${MFA_COOKIE}=${createMfaToken(doc.id, sid)}` });
  return { user, req: { headers } };
}

/** Local API options to act as `actor` with access control enforced. */
export const as = (actor: Actor) => ({
  user: actor.user,
  overrideAccess: false as const,
  req: actor.req,
  context: noRevalidate,
});
