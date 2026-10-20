import type { Event } from "../payload-types";
import { gregorianToJdn, stockholmDate } from "./ethiopian-calendar";
import type { Occurrence } from "./events/expand";
import { upcomingOccurrences } from "./home";

export type Series = {
  event: Event;
  /** The next date still to come (or in progress), cancelled or not. */
  next: Occurrence & { event: Event };
  /** Dates in the next 60 days that are cancelled, moved or carry a notice. */
  changes: (Occurrence & { event: Event })[];
};

const CHANGE_DAYS = 60;

/**
 * Events of the given types that still have dates in the coming year, each with its next date and
 * its upcoming per-date changes, ordered by the next date (worship list pages, D-019).
 */
export function upcomingSeries(events: Event[], types: readonly Event["type"][], now: Date): Series[] {
  const occurrences = upcomingOccurrences(events, now, { types });
  const byEvent = new Map<number, Series>();
  const today = gregorianToJdn(stockholmDate(now));
  for (const o of occurrences) {
    let series = byEvent.get(o.event.id);
    if (!series) {
      series = { event: o.event, next: o, changes: [] };
      byEvent.set(o.event.id, series);
    }
    const isChange = o.status !== "scheduled" || Boolean(o.note);
    if (isChange && gregorianToJdn(o.date) - today <= CHANGE_DAYS) series.changes.push(o);
  }
  return [...byEvent.values()];
}
