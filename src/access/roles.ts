/** Staff roles from spec §2.1. */
export const ROLES = [
  "super_admin",
  "clergy_approver",
  "office_coordinator",
  "editor",
  "translator",
  "finance",
] as const;
export type Role = (typeof ROLES)[number];

/** Roles that must complete TOTP MFA every session (spec §3). */
export const PRIVILEGED_ROLES: readonly Role[] = [
  "super_admin",
  "clergy_approver",
  "office_coordinator",
];

type UserWithRoles = { roles?: readonly (Role | string)[] | null } | null | undefined;

export function hasRole(user: UserWithRoles, ...roles: Role[]): boolean {
  return Boolean(user?.roles?.some((role) => roles.includes(role as Role)));
}

export function requiresMfa(user: UserWithRoles): boolean {
  return hasRole(user, ...PRIVILEGED_ROLES);
}
