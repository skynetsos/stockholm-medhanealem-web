import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload } from "payload";

import type { BaptismRequest } from "../../payload-types";
import { logCaseEvent } from "../cases/events";

/** Final statuses whose cases are archived after the retention period (spec Phase 2 task 8). */
const FINAL = ["completed", "declined"] as const;
export const DEFAULT_RETENTION_MONTHS = 24;

/** The moment `months` calendar months before `now` (UTC; a day either way doesn't matter here). */
export function retentionCutoff(now: Date, months: number): Date {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return cutoff;
}

/**
 * What archiving removes (spec: "personal fields nulled, reference + status + dates kept"): every
 * name, contact detail, date of birth, free-text note and the IP hash/browser. Kept: reference,
 * status, category, language, staff assignment, clergy decision, scheduled date, sent/created/
 * updated dates and the privacy consent flag (evidence the request was made lawfully).
 */
export const ARCHIVED_FIELDS = {
  applicant: { name: null, email: null, phone: null, parishRelationship: null },
  candidate: { fullName: null, dateOfBirth: null },
  guardian: { name: null, relationship: null, consentConfirmed: null },
  preferredPeriod: null,
  notes: null,
  internal: { officeNotes: null, clergyNotes: null },
  source: { ipHash: null, userAgent: null },
} as const;

export type RetentionCase = { id: number; reference: string; status: string; closedAt: string };
export type RetentionReport = { dryRun: boolean; months: number; cutoff: string; cases: RetentionCase[] };

/** When a case reached its final status: its last status change in the audit log, else its last update. */
async function closedAt(payload: Payload, doc: BaptismRequest): Promise<string> {
  const { docs } = await payload.find({
    collection: "case-events",
    overrideAccess: true,
    depth: 0,
    limit: 1,
    sort: "-at",
    where: {
      and: [
        { "request.relationTo": { equals: "baptism-requests" } },
        { "request.value": { equals: doc.id } },
        { action: { equals: "status_changed" } },
        { to: { equals: doc.status } },
      ],
    },
  });
  return docs[0]?.at ?? doc.updatedAt;
}

/**
 * Retention job (spec Phase 2 task 8, D-035): archives completed and declined baptism cases that
 * closed more than `retentionMonthsBaptism` months ago (Site settings, default 24; the number is for
 * the legal review). With `dryRun` nothing changes: the report lists what would be archived.
 * Archiving removes the personal fields, clears the notes written with status changes in the
 * audit log (e.g. why a request was declined, D-032), and logs an "archived" entry. Cases already
 * archived are skipped, so running it twice changes nothing.
 */
export async function runRetention(payload: Payload, { dryRun, now = new Date() }: { dryRun: boolean; now?: Date }): Promise<RetentionReport> {
  const settings = await payload.findGlobal({ slug: "site-settings", overrideAccess: true, depth: 0 });
  const months = settings.retentionMonthsBaptism && settings.retentionMonthsBaptism >= 1 ? settings.retentionMonthsBaptism : DEFAULT_RETENTION_MONTHS;
  const cutoff = retentionCutoff(now, months);

  // Candidates: final and not archived, last changed before the cutoff (closing comes before that).
  const { docs } = await payload.find({
    collection: "baptism-requests",
    overrideAccess: true,
    depth: 0,
    pagination: false,
    where: {
      and: [{ status: { in: [...FINAL] } }, { archivedAt: { exists: false } }, { updatedAt: { less_than: cutoff.toISOString() } }],
    },
  });

  const due: RetentionCase[] = [];
  for (const doc of docs) {
    const closed = await closedAt(payload, doc);
    if (new Date(closed) < cutoff) due.push({ id: doc.id, reference: doc.reference ?? String(doc.id), status: doc.status, closedAt: closed });
  }
  if (dryRun) return { dryRun, months, cutoff: cutoff.toISOString(), cases: due };

  for (const item of due) await archiveCase(payload, item.id, now);
  return { dryRun, months, cutoff: cutoff.toISOString(), cases: due };
}

/** Archives one case in one transaction: personal data removed, audit notes cleared, entry logged. */
async function archiveCase(payload: Payload, id: number, now: Date) {
  // `retention` tells the audit hook not to log the cleared fields one by one (one "archived" entry instead).
  const req = await createLocalReq({ context: { retention: true } }, payload);
  await initTransaction(req);
  try {
    await payload.update({
      collection: "baptism-requests",
      id,
      overrideAccess: true,
      req,
      data: { ...ARCHIVED_FIELDS, archivedAt: now.toISOString(), archivedAt_tz: "Europe/Stockholm" } as never,
    });
    const notes = await payload.find({
      collection: "case-events",
      overrideAccess: true,
      req,
      depth: 0,
      pagination: false,
      where: {
        and: [
          { "request.relationTo": { equals: "baptism-requests" } },
          { "request.value": { equals: id } },
          { action: { equals: "status_changed" } },
          { note: { exists: true } },
        ],
      },
    });
    for (const event of notes.docs) await payload.update({ collection: "case-events", id: event.id, overrideAccess: true, req, data: { note: null } });
    await logCaseEvent(payload, { collection: "baptism-requests", id, action: "archived", note: "Personal data removed by the retention job" }, req);
    await commitTransaction(req);
  } catch (error) {
    await killTransaction(req);
    throw error;
  }
}
