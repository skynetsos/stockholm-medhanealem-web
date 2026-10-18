import type { Access, FieldAccess, PayloadRequest } from "payload";

import { isMfaSatisfied, type MfaUser } from "../lib/mfa/session";
import { hasRole, type Role } from "./roles";

export { hasRole, requiresMfa, PRIVILEGED_ROLES, ROLES, type Role } from "./roles";

/**
 * A signed-in, active staff member who has completed MFA for this session (if their role needs it).
 * Every staff access rule builds on this, so a privileged user without MFA gets no data at all.
 */
export function isStaff(req: PayloadRequest): boolean {
  const user = req.user as MfaUser | null;
  return Boolean(user && user.active !== false && isMfaSatisfied(user, req.headers));
}

export function isSuperAdminRequest(req: PayloadRequest): boolean {
  return isStaff(req) && hasRole(req.user as MfaUser, "super_admin");
}

export const isSuperAdmin: Access = ({ req }) => isSuperAdminRequest(req);

export const isSuperAdminField: FieldAccess = ({ req }) => isSuperAdminRequest(req);

/** Limits results to the requesting user's own document. */
export const isSelf: Access = ({ req }) => (isStaff(req) && req.user ? { id: { equals: req.user.id } } : false);

export const isSuperAdminOrSelf: Access = (args) => isSuperAdminRequest(args.req) || isSelf(args);

/** Access rule factory: any of the given roles (with MFA where required). */
export const hasRoleAccess =
  (...roles: Role[]): Access =>
  ({ req }) =>
    isStaff(req) && hasRole(req.user as MfaUser, ...roles);

/** Never writable through the API; only server code using overrideAccess may change it. */
export const systemOnly: FieldAccess = () => false;
