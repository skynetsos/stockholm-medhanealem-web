import { type GregorianDate, gregorianToJdn, jdnToGregorian, stockholmDate, toEthiopian } from "../ethiopian-calendar";

/**
 * Event recurrence (spec §2.4). Dates are calendar dates in Europe/Stockholm; times come from the
 * event's start/end and stay at the same local time across DST (expansion into dated occurrences: `expand.ts`).
 * - weekly:  same weekday as the first occurrence
 * - monthly: every Ethiopian month on `ethiopianDay` (e.g. 27 for Medhanealem); Pagume is included
 *            only when it has that day
 * - yearly:  every Ethiopian year on `ethiopianMonth` + `ethiopianDay` (fixed feasts; movable feasts
 *            such as Fasika are entered as separate one-off events)
 */
export const RECURRENCE_FREQUENCIES = ["none", "weekly", "monthly", "yearly"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export type Recurrence = {
  frequency?: RecurrenceFrequency | null;
  ethiopianDay?: number | null;
  ethiopianMonth?: number | null;
  until?: string | null;
};

export type RecurringEvent = { start: string; recurrence?: Recurrence | null };

const jdn = (d: GregorianDate) => gregorianToJdn(d);

/** Ethiopian day/month the rule repeats on, defaulting to those of the first occurrence. */
export function ethiopianAnchor(event: RecurringEvent): { day: number; month: number } {
  const first = toEthiopian(stockholmDate(event.start));
  return {
    day: event.recurrence?.ethiopianDay ?? first.day,
    month: event.recurrence?.ethiopianMonth ?? first.month,
  };
}

/** Does the event (series) fall on this Stockholm calendar date? */
export function occursOn(event: RecurringEvent, date: GregorianDate): boolean {
  const day = jdn(date);
  const first = jdn(stockholmDate(event.start));
  if (day < first) return false;
  const until = event.recurrence?.until;
  if (until && day > jdn(stockholmDate(until))) return false;

  const frequency = event.recurrence?.frequency ?? "none";
  switch (frequency) {
    case "none":
      return day === first;
    case "weekly":
      return (day - first) % 7 === 0;
    case "monthly":
      return toEthiopian(date).day === ethiopianAnchor(event).day;
    case "yearly": {
      const eth = toEthiopian(date);
      const anchor = ethiopianAnchor(event);
      return eth.month === anchor.month && eth.day === anchor.day;
    }
    default:
      return false;
  }
}

/** Next occurrence on or after `from` (searching up to ~2 years), for messages and defaults. */
export function nextOccurrenceDate(event: RecurringEvent, from: GregorianDate): GregorianDate | null {
  const start = Math.max(jdn(from), jdn(stockholmDate(event.start)));
  for (let d = start; d < start + 800; d++) {
    const date = jdnToGregorian(d);
    if (occursOn(event, date)) return date;
  }
  return null;
}
