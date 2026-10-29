import { APIError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type PayloadRequest } from "payload";

import { checkTransition, isBaptismStatus, rolesFor } from "../baptism/state";
import { stockholmWallTime } from "../stockholm-time";
import { type CaseAction, type CaseCollection, logCaseEvent } from "./events";

type Doc = Record<string, unknown>;
type Relation = number | { id: number } | null | undefined;

const relationId = (value: unknown): number | null => {
  const rel = value as Relation;
  return rel == null ? null : typeof rel === "number" ? rel : rel.id;
};

/** Read a value at a dotted path ("internal.assignedTo"). */
const at = (doc: Doc | undefined, path: string): unknown =>
  path.split(".").reduce<unknown>((value, key) => (value as Doc | undefined)?.[key], doc);

/** A staff member as the audit log names them: their name, else email, else id. */
async function staffName(req: PayloadRequest, id: number | null): Promise<string | null> {
  if (id == null) return null;
  const user = await req.payload.findByID({ collection: "users", id, depth: 0, overrideAccess: true, req, disableErrors: true });
  return user ? user.name || user.email || String(id) : String(id);
}

const formatDate = (value: unknown) => {
  if (!value) return null;
  const { date, hour, minute } = stockholmWallTime(value as string);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.year}-${pad(date.month)}-${pad(date.day)} ${pad(hour)}:${pad(minute)} (Stockholm)`;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export type CaseLogFields = {
  /** Path of the "assigned to" relationship. */
  assignedTo: string;
  /** Notes whose edits are logged (without their content), with the label used in the log. */
  notes?: Record<string, string>;
  /** Decision fields whose new value is logged. */
  decisions?: Record<string, string>;
  /** Date fields whose new value is logged (Stockholm time). */
  dates?: Record<string, string>;
};

/**
 * Writes the audit log (CaseEvents) for a change made to a case: status, assignment, notes,
 * decisions and dates, each with the staff member who made it (or the system). The contents of the
 * notes fields are never copied into the log; only a note written with a status change is (D-032).
 */
export function logCaseChanges(collection: CaseCollection, fields: CaseLogFields): CollectionAfterChangeHook {
  return async ({ doc, previousDoc, operation, req }) => {
    if (operation !== "update") return doc;
    const actorId = (req.user as { id?: number } | null)?.id ?? null;
    const log = (action: CaseAction, entry: { from?: string | null; to?: string | null; note?: string | null }) =>
      logCaseEvent(req.payload, { collection, id: doc.id, action, actorId, ...entry }, req);

    // A note given with the status change (required when declining) goes with it in the log.
    if (doc.status !== previousDoc?.status) await log("status_changed", { from: previousDoc?.status, to: doc.status, note: transitionNote(req) });

    const [before, after] = [relationId(at(previousDoc, fields.assignedTo)), relationId(at(doc, fields.assignedTo))];
    if (before !== after) await log("assigned", { from: await staffName(req, before), to: await staffName(req, after) });

    for (const [path, label] of Object.entries(fields.decisions ?? {})) {
      if (!same(at(previousDoc, path), at(doc, path))) await log("note_added", { note: label, from: at(previousDoc, path) as string, to: at(doc, path) as string });
    }
    for (const [path, label] of Object.entries(fields.dates ?? {})) {
      if (!same(at(previousDoc, path), at(doc, path))) await log("note_added", { note: label, from: formatDate(at(previousDoc, path)), to: formatDate(at(doc, path)) });
    }
    for (const [path, label] of Object.entries(fields.notes ?? {})) {
      if (!same(at(previousDoc, path), at(doc, path))) await log("note_added", { note: label });
    }
    return doc;
  };
}

/** The internal note sent with a status change (src/lib/baptism/transition.ts), if any. */
export const transitionNote = (req: PayloadRequest): string | null => {
  const note = (req.context as { transitionNote?: unknown } | undefined)?.transitionNote;
  return typeof note === "string" && note.trim() ? note.trim() : null;
};

const STATUS_ROLE_LABEL: Record<string, string> = {
  clergy_approver: "a clergy approver",
  office_coordinator: "the office",
};

/**
 * Baptism request status rules (spec Phase 2 task 2): a new request always starts as "new"; a
 * change must follow the allowed transitions and be made by the right role; "confirmed" needs a
 * scheduled date (the applicant's email gives it, task 5); "declined" needs an internal note (D-032).
 */
export const enforceBaptismWorkflow: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (operation === "create") return { ...data, status: "new" };
  const from = originalDoc?.status;
  const to = data.status ?? from;
  if (to === from) return data;
  if (!isBaptismStatus(from) || !isBaptismStatus(to)) throw new APIError("Unknown status.", 400);

  const check = checkTransition(from, to, req.user as { roles?: string[] } | null);
  if (!check.ok && check.reason === "invalid") throw new APIError(`A request cannot go from "${from}" to "${to}".`, 400);
  if (!check.ok) throw new APIError(`Only ${STATUS_ROLE_LABEL[rolesFor(from)[0]]} can change a request in "${from}".`, 403);

  const scheduled = data.internal?.scheduledDate !== undefined ? data.internal.scheduledDate : originalDoc?.internal?.scheduledDate;
  if (to === "confirmed" && !scheduled) throw new APIError("Set the scheduled date before confirming.", 400);
  if (to === "declined" && !transitionNote(req)) throw new APIError("Write an internal note on why the request is declined.", 400);
  return data;
};
