import { hasRole, type Role } from "../../access/roles";

/** Spec §2.12 statuses, in workflow order. */
export const BAPTISM_STATUS_VALUES = ["new", "info_needed", "clergy_review", "scheduling", "confirmed", "completed", "declined"] as const;
export type BaptismStatus = (typeof BAPTISM_STATUS_VALUES)[number];

/** Spec Phase 2 task 2: the allowed next statuses. `completed` and `declined` are final. */
export const BAPTISM_TRANSITIONS: Record<BaptismStatus, readonly BaptismStatus[]> = {
  new: ["info_needed", "clergy_review", "declined"],
  info_needed: ["clergy_review", "declined"],
  clergy_review: ["scheduling", "info_needed", "declined"],
  scheduling: ["confirmed", "info_needed"],
  confirmed: ["completed", "scheduling"],
  completed: [],
  declined: [],
};

/** Only clergy approvers decide a case under clergy review (spec: "clergy_approver only"). */
const CLERGY_DECIDES: readonly BaptismStatus[] = ["clergy_review"];
/** Every other step is the office's (super admins may stand in). */
const OFFICE_ROLES: Role[] = ["office_coordinator", "super_admin"];

type UserWithRoles = { roles?: readonly string[] | null } | null | undefined;

export const isBaptismStatus = (value: unknown): value is BaptismStatus => BAPTISM_STATUS_VALUES.includes(value as BaptismStatus);

/** Who may move a case out of `from`. */
export const rolesFor = (from: BaptismStatus): Role[] => (CLERGY_DECIDES.includes(from) ? ["clergy_approver"] : OFFICE_ROLES);

export type TransitionCheck = { ok: true } | { ok: false; reason: "invalid" | "role" };

/** Whether `user` may change a case from `from` to `to`. Without a user, the system acts (role not checked). */
export function checkTransition(from: BaptismStatus, to: BaptismStatus, user?: UserWithRoles): TransitionCheck {
  if (!BAPTISM_TRANSITIONS[from].includes(to)) return { ok: false, reason: "invalid" };
  if (user && !hasRole(user, ...rolesFor(from))) return { ok: false, reason: "role" };
  return { ok: true };
}

/** The statuses `user` can move a case to from `from` (status buttons in the admin, task 6). */
export const allowedTransitions = (from: BaptismStatus, user?: UserWithRoles): BaptismStatus[] =>
  BAPTISM_TRANSITIONS[from].filter((to) => checkTransition(from, to, user).ok);

export const isFinal = (status: BaptismStatus) => BAPTISM_TRANSITIONS[status].length === 0;
