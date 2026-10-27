import type { Payload, PayloadRequest } from "payload";

import { BAPTISM_STATUS_VALUES } from "../baptism/state";
import { gregorianToJdn, stockholmDate } from "../ethiopian-calendar";
import type { CaseCollection } from "./events";

/** Statuses per case collection, in workflow order (spec §2.12, §2.14). */
export const CASE_STATUSES: Record<CaseCollection, readonly string[]> = {
  "baptism-requests": BAPTISM_STATUS_VALUES,
  inquiries: ["new", "in_progress", "closed"],
};

/** Statuses that still need someone to act. */
export const OPEN_STATUSES: Record<CaseCollection, readonly string[]> = {
  "baptism-requests": ["new", "info_needed", "clergy_review", "scheduling", "confirmed"],
  inquiries: ["new", "in_progress"],
};

/** Where the "assigned to" field is in each collection. */
export const ASSIGNEE_FIELD: Record<CaseCollection, string> = {
  "baptism-requests": "internal.assignedTo",
  inquiries: "assignedTo",
};

/** One status, or "open" (all statuses that still need someone to act). */
export type CaseFilter = { status?: string; assignedTo?: number | string };

/** Admin list address with a filter, in Payload's query-string format. */
export function caseListHref(collection: CaseCollection, filter: CaseFilter = {}): string {
  const params = new URLSearchParams();
  if (filter.status === "open") params.set("where[and][0][status][in]", OPEN_STATUSES[collection].join(","));
  else if (filter.status) params.set("where[and][0][status][equals]", filter.status);
  if (filter.assignedTo !== undefined) params.set(`where[and][1][${ASSIGNEE_FIELD[collection]}][equals]`, String(filter.assignedTo));
  const query = params.toString();
  return `/admin/collections/${collection}${query ? `?${query}` : ""}`;
}

/**
 * The filter the list shows now (only the simple filters made by caseListHref are recognised).
 * Accepts the page's raw query keys ("where[and][0][status][equals]") or an already parsed `where`.
 */
export function currentFilter(collection: CaseCollection, searchParams: Record<string, unknown> | undefined): CaseFilter {
  const conditions: [field: string, op: string, value: string][] = [];
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    const flat = key.match(/^where\[and\]\[\d+\]\[([^\]]+)\]\[(equals|in)\]$/);
    if (flat && typeof value === "string") conditions.push([flat[1], flat[2], value]);
  }
  const and = (searchParams?.where as { and?: Record<string, Record<string, unknown>>[] } | undefined)?.and ?? [];
  for (const condition of and) {
    for (const [field, ops] of Object.entries(condition)) {
      for (const [op, value] of Object.entries(ops ?? {})) conditions.push([field, op, Array.isArray(value) ? value.join(",") : String(value)]);
    }
  }
  const find = (field: string, op: string) => conditions.find(([f, o]) => f === field && o === op)?.[2];
  const openList = find("status", "in");
  return {
    status: find("status", "equals") ?? (openList === OPEN_STATUSES[collection].join(",") ? "open" : undefined),
    assignedTo: find(ASSIGNEE_FIELD[collection], "equals"),
  };
}

/** Whole days since the case was sent, counted in Stockholm calendar days. */
export function caseAgeDays(createdAt: string, now = new Date()): number {
  return Math.max(0, gregorianToJdn(stockholmDate(now)) - gregorianToJdn(stockholmDate(createdAt)));
}

export type CaseCounts = { byStatus: Record<string, number>; open: number; mine: number };

/**
 * Number of cases per status, and open cases assigned to `actor`, read with the actor's own access
 * (MFA included), so a role without access gets null rather than numbers.
 */
export async function caseCounts(
  payload: Payload,
  collection: CaseCollection,
  actor: { user: { id: number | string }; req?: Partial<PayloadRequest> },
): Promise<CaseCounts | null> {
  const count = async (where: Record<string, unknown>) =>
    (await payload.count({ collection, where: where as never, user: actor.user, overrideAccess: false, req: actor.req })).totalDocs;
  try {
    const statuses = CASE_STATUSES[collection];
    const totals = await Promise.all(statuses.map((status) => count({ status: { equals: status } })));
    const byStatus = Object.fromEntries(statuses.map((status, i) => [status, totals[i]]));
    const open = OPEN_STATUSES[collection].reduce((sum, status) => sum + byStatus[status], 0);
    const mine = await count({ and: [{ status: { in: OPEN_STATUSES[collection] } }, { [ASSIGNEE_FIELD[collection]]: { equals: actor.user.id } }] });
    return { byStatus, open, mine };
  } catch {
    return null; // no read access
  }
}
