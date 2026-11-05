import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload } from "payload";

import type { SiteSetting } from "../../payload-types";
import { type CaseCollection, logCaseEvent } from "./events";

/** The moment `months` calendar months before `now` (UTC; a day either way doesn't matter here). */
export function retentionCutoff(now: Date, months: number): Date {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return cutoff;
}

type Policy = {
  /** Statuses after which a case is archived once the period has passed. */
  final: readonly string[];
  /** Site settings field with the number of months, and its default. */
  setting: keyof Pick<SiteSetting, "retentionMonthsBaptism" | "retentionMonthsInquiries">;
  defaultMonths: number;
  /** What archiving sets: every personal field to null. */
  cleared: Record<string, unknown>;
};

/**
 * Retention policies (D-035). Archiving removes every name, contact detail, date of birth,
 * free-text note and the IP hash/browser. Kept: reference, type/category, status, language,
 * assignee, clergy decision, scheduled date, sent/created/updated dates and the privacy-consent flag
 * (evidence the request was made lawfully).
 */
export const RETENTION_POLICIES: Record<CaseCollection, Policy> = {
  // Spec Phase 2 task 8: "archive completed/declined cases older than retentionMonthsBaptism".
  "baptism-requests": {
    final: ["completed", "declined"],
    setting: "retentionMonthsBaptism",
    defaultMonths: 24,
    cleared: {
      applicant: { name: null, email: null, phone: null, parishRelationship: null },
      candidate: { fullName: null, dateOfBirth: null },
      guardian: { name: null, relationship: null, consentConfirmed: null },
      preferredPeriod: null,
      notes: null,
      internal: { officeNotes: null, clergyNotes: null },
      source: { ipHash: null, userAgent: null },
    },
  },
  // Closed inquiries, after 12 months by default (decided by Biruk, 2026-11-05).
  inquiries: {
    final: ["closed"],
    setting: "retentionMonthsInquiries",
    defaultMonths: 12,
    cleared: { name: null, email: null, phone: null, message: null, childName: null, childAge: null, interests: null, availability: null },
  },
};

export type RetentionCase = { id: number; reference: string; status: string; closedAt: string };
export type RetentionResult = { collection: CaseCollection; months: number; cutoff: string; cases: RetentionCase[] };
export type RetentionReport = { dryRun: boolean; results: RetentionResult[] };

type CaseDoc = { id: number; reference?: string | null; status: string; updatedAt: string };

/** When a case reached its final status: its last status change in the audit log, else its last update. */
async function closedAt(payload: Payload, collection: CaseCollection, doc: CaseDoc): Promise<string> {
  const { docs } = await payload.find({
    collection: "case-events",
    overrideAccess: true,
    depth: 0,
    limit: 1,
    sort: "-at",
    where: {
      and: [
        { "request.relationTo": { equals: collection } },
        { "request.value": { equals: doc.id } },
        { action: { equals: "status_changed" } },
        { to: { equals: doc.status } },
      ],
    },
  });
  return docs[0]?.at ?? doc.updatedAt;
}

/**
 * Retention job (spec Phase 2 task 8, D-035): archives completed and declined baptism cases and
 * closed inquiries whose final status is older than their retention period (Site settings). With
 * `dryRun` nothing changes: the report lists what would be archived. Archiving removes the personal
 * fields, clears the notes written with status changes in the audit log (e.g. why a request was
 * declined, D-032), and logs an "archived" entry. Cases already archived are skipped, so running
 * it twice changes nothing.
 */
export async function runRetention(payload: Payload, { dryRun, now = new Date() }: { dryRun: boolean; now?: Date }): Promise<RetentionReport> {
  const settings = await payload.findGlobal({ slug: "site-settings", overrideAccess: true, depth: 0 });
  const results: RetentionResult[] = [];

  for (const [collection, policy] of Object.entries(RETENTION_POLICIES) as [CaseCollection, Policy][]) {
    const configured = settings[policy.setting];
    const months = configured && configured >= 1 ? configured : policy.defaultMonths;
    const cutoff = retentionCutoff(now, months);

    // Candidates: final and not archived, last changed before the cutoff (closing comes before that).
    const { docs } = await payload.find({
      collection,
      overrideAccess: true,
      depth: 0,
      pagination: false,
      where: { and: [{ status: { in: [...policy.final] } }, { archivedAt: { exists: false } }, { updatedAt: { less_than: cutoff.toISOString() } }] },
    });

    const cases: RetentionCase[] = [];
    for (const doc of docs as CaseDoc[]) {
      const closed = await closedAt(payload, collection, doc);
      if (new Date(closed) < cutoff) cases.push({ id: doc.id, reference: doc.reference ?? String(doc.id), status: doc.status, closedAt: closed });
    }
    if (!dryRun) for (const item of cases) await archiveCase(payload, collection, policy, item.id, now);
    results.push({ collection, months, cutoff: cutoff.toISOString(), cases });
  }
  return { dryRun, results };
}

/** Archives one case in one transaction: personal data removed, audit notes cleared, entry logged. */
async function archiveCase(payload: Payload, collection: CaseCollection, policy: Policy, id: number, now: Date) {
  // `retention` tells the audit hook not to log the cleared fields one by one (one "archived" entry instead).
  const req = await createLocalReq({ context: { retention: true } }, payload);
  await initTransaction(req);
  try {
    await payload.update({
      collection,
      id,
      overrideAccess: true,
      req,
      data: { ...policy.cleared, archivedAt: now.toISOString(), archivedAt_tz: "Europe/Stockholm" } as never,
    });
    const notes = await payload.find({
      collection: "case-events",
      overrideAccess: true,
      req,
      depth: 0,
      pagination: false,
      where: {
        and: [
          { "request.relationTo": { equals: collection } },
          { "request.value": { equals: id } },
          { action: { equals: "status_changed" } },
          { note: { exists: true } },
        ],
      },
    });
    for (const event of notes.docs) await payload.update({ collection: "case-events", id: event.id, overrideAccess: true, req, data: { note: null } });
    await logCaseEvent(payload, { collection, id, action: "archived", note: "Personal data removed by the retention job" }, req);
    await commitTransaction(req);
  } catch (error) {
    await killTransaction(req);
    throw error;
  }
}
