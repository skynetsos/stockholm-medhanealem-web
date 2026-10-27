import type { Payload, PayloadRequest } from "payload";

import type { CaseEvent } from "../../payload-types";

/** Spec §2.13 audit actions. */
export const CASE_ACTIONS = ["created", "status_changed", "note_added", "email_sent", "assigned"] as const;
export type CaseAction = (typeof CASE_ACTIONS)[number];

export type CaseCollection = "baptism-requests" | "inquiries";

export type CaseEventInput = {
  collection: CaseCollection;
  id: number;
  action: CaseAction;
  /** The staff member who acted; omit for the system (website form, emails, retention job). */
  actorId?: number | null;
  from?: string | null;
  to?: string | null;
  note?: string | null;
};

/**
 * Append an entry to the audit log (CaseEvents). Server code only: nobody can create one through
 * the API. Pass `req` to write inside the same transaction as the change being logged.
 */
export async function logCaseEvent(payload: Payload, event: CaseEventInput, req?: Partial<PayloadRequest>) {
  return payload.create({
    collection: "case-events",
    overrideAccess: true,
    req,
    data: {
      request: { relationTo: event.collection, value: event.id } as CaseEvent["request"],
      actorType: event.actorId ? "user" : "system",
      actor: event.actorId ?? undefined,
      action: event.action,
      from: event.from ?? undefined,
      to: event.to ?? undefined,
      note: event.note ?? undefined,
      at: new Date().toISOString(),
      at_tz: "Europe/Stockholm",
    },
  });
}
