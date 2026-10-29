import type { UIFieldServerProps } from "payload";

import { stockholmDateTimeLabel } from "../../../lib/admin-dates";
import type { CaseCollection } from "../../../lib/cases/events";
import type { CaseEvent, User } from "../../../payload-types";
import styles from "./Cases.module.css";

type T = (key: string, options?: Record<string, unknown>) => string;

/**
 * Case page timeline (spec Phase 2 task 6): every audit entry for this case, oldest first, with
 * who and when (Stockholm time). Read with the viewer's own access, like the list.
 */
export async function CaseTimeline({ id, collectionSlug, payload, req, i18n }: UIFieldServerProps) {
  if (!id || !req.user) return null;
  const t = i18n.t as unknown as T;
  let events: CaseEvent[];
  try {
    events = (
      await payload.find({
        collection: "case-events",
        where: { and: [{ "request.relationTo": { equals: collectionSlug } }, { "request.value": { equals: id } }] },
        sort: "at",
        depth: 1,
        limit: 500,
        user: req.user,
        overrideAccess: false,
        req,
      })
    ).docs;
  } catch {
    return null; // no access to the audit log
  }

  const status = (value?: string | null) => (value ? t(`cases:status_${value}`) : "—");
  const describe = (event: CaseEvent): string => {
    switch (event.action) {
      case "created":
        return t("cases:event_created");
      case "status_changed":
        return t("cases:event_status_changed", { from: status(event.from), to: status(event.to) });
      case "assigned":
        return t("cases:event_assigned", { from: event.from || t("cases:nobody"), to: event.to || t("cases:nobody") });
      case "email_sent":
        return `${t("cases:event_email_sent")}: ${event.note ?? ""}`;
      default:
        return [event.note || t("cases:event_note_added"), event.from || event.to ? `${event.from ?? "—"} → ${event.to ?? "—"}` : null].filter(Boolean).join(": ");
    }
  };
  // A note written with a status change (e.g. why a request was declined) is shown under it.
  const extraNote = (event: CaseEvent) => (event.action === "status_changed" ? event.note : null);
  const actor = (event: CaseEvent) => {
    if (event.actorType === "system") return t("cases:system");
    const user = event.actor as User | number | null | undefined;
    return typeof user === "object" && user ? user.name || user.email : "—";
  };

  return (
    <section aria-labelledby="case-timeline" className={styles.timeline} data-collection={collectionSlug as CaseCollection}>
      <h3 id="case-timeline">{t("cases:timeline")}</h3>
      {events.length === 0 ? (
        <p>{t("cases:timelineEmpty")}</p>
      ) : (
        <ol>
          {events.map((event) => (
            <li key={event.id}>
              <time dateTime={event.at}>{stockholmDateTimeLabel(event.at)}</time>
              <span className={styles.actor}>{actor(event)}</span>
              <span>{describe(event)}</span>
              {extraNote(event) && <blockquote className={styles.eventNote}>{extraNote(event)}</blockquote>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
