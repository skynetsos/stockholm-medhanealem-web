import { type GregorianDate, gregorianToJdn, jdnToGregorian, stockholmDate } from "../ethiopian-calendar";
import { stockholmInstant, stockholmWallTime } from "../stockholm-time";
import { occursOn, type Recurrence } from "./recurrence";

/** The parts of an Event (as read in one language) that expansion needs. */
export type ExpandableEvent = {
  start: string;
  end?: string | null;
  allDay?: boolean | null;
  recurrence?: Recurrence | null;
  cancelled?: boolean | null;
  overrides?:
    | {
        date?: string | null;
        action?: "cancel" | "move" | "notice" | null;
        newStart?: string | null;
        newEnd?: string | null;
        note?: string | null;
      }[]
    | null;
};

export type OccurrenceStatus = "scheduled" | "cancelled" | "moved";

export type Occurrence = {
  /** Stockholm calendar date it starts on, and the last day it covers (same unless multi-day). */
  date: GregorianDate;
  endDate: GregorianDate;
  /** UTC instants. For all-day events `start` is Stockholm midnight and `end` is null. */
  start: string;
  end: string | null;
  allDay: boolean;
  /** Cancelled occurrences are kept so the site can show them struck through with the notice. */
  status: OccurrenceStatus;
  /** The date in the series this occurrence belongs to (differs from `date` when moved). */
  seriesDate: GregorianDate;
  /** The per-date note (cancel / move / notice), if any. */
  note: string | null;
};

export type DateRange = { from: GregorianDate; to: GregorianDate };

/** Longest range expanded in one call (guards public endpoints such as the iCal feed). */
export const MAX_RANGE_DAYS = 800;

const jdn = gregorianToJdn;
const MIDNIGHT = { hour: 0, minute: 0, second: 0 };

/**
 * Occurrences of an event that overlap `range` (Stockholm dates, both inclusive), sorted by start.
 * Each repeat keeps the local start and end time of the first occurrence across summer/winter time
 * (Kidase is 08:00–11:30 in July and in December). Per-date changes are applied: "cancel" keeps
 * the date with status cancelled, "move" puts it at its new time, "notice" attaches the note.
 */
export function expandEvent(event: ExpandableEvent, range: DateRange): Occurrence[] {
  const from = jdn(range.from);
  const to = jdn(range.to);
  if (to < from) return [];
  if (to - from > MAX_RANGE_DAYS) throw new RangeError(`Date range longer than ${MAX_RANGE_DAYS} days`);

  const allDay = Boolean(event.allDay);
  const first = stockholmWallTime(event.start);
  const last = event.end ? stockholmWallTime(event.end) : null;
  const spanDays = last ? Math.max(0, jdn(last.date) - jdn(first.date)) : 0;
  const durationMs = event.end ? Math.max(0, new Date(event.end).getTime() - new Date(event.start).getTime()) : 0;
  const seriesCancelled = Boolean(event.cancelled);

  const overrides = new Map<number, NonNullable<ExpandableEvent["overrides"]>[number]>();
  for (const row of event.overrides ?? []) if (row.date) overrides.set(jdn(stockholmDate(row.date)), row);

  const overlaps = (startDay: number, endDay: number) => startDay <= to && endDay >= from;
  const occurrences: Occurrence[] = [];

  // Regular dates of the series (multi-day events that began before the range still overlap it).
  for (let day = from - spanDays; day <= to; day++) {
    const date = jdnToGregorian(day);
    const change = overrides.get(day);
    if (change?.action === "move" || !overlaps(day, day + spanDays) || !occursOn(event, date)) continue;
    const endDate = jdnToGregorian(day + spanDays);
    occurrences.push({
      date,
      endDate,
      start: stockholmInstant(date, allDay ? MIDNIGHT : first).toISOString(),
      end: allDay || !last ? null : stockholmInstant(endDate, last).toISOString(),
      allDay,
      status: seriesCancelled || change?.action === "cancel" ? "cancelled" : "scheduled",
      seriesDate: date,
      note: change?.note || null,
    });
  }

  // Moved dates can land anywhere, so they are checked one by one.
  for (const [day, change] of overrides) {
    if (change.action !== "move" || !change.newStart) continue;
    const seriesDate = jdnToGregorian(day);
    if (!occursOn(event, seriesDate)) continue;
    const date = stockholmDate(change.newStart);
    const end = change.newEnd ?? (event.end ? new Date(new Date(change.newStart).getTime() + durationMs).toISOString() : null);
    const endDate = end ? stockholmDate(end) : jdnToGregorian(jdn(date) + spanDays);
    if (!overlaps(jdn(date), jdn(endDate))) continue;
    occurrences.push({
      date,
      endDate,
      start: allDay ? stockholmInstant(date).toISOString() : new Date(change.newStart).toISOString(),
      end: allDay || !end ? null : new Date(end).toISOString(),
      allDay,
      status: seriesCancelled ? "cancelled" : "moved",
      seriesDate,
      note: change.note || null,
    });
  }

  return occurrences.sort((a, b) => a.start.localeCompare(b.start));
}

/** Occurrences of many events in one range, sorted by start, each with its event. */
export function expandEvents<T extends ExpandableEvent>(events: T[], range: DateRange): (Occurrence & { event: T })[] {
  return events
    .flatMap((event) => expandEvent(event, range).map((occurrence) => ({ ...occurrence, event })))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * The next occurrence that takes place (not cancelled) and hasn't finished by `now` (one in progress
 * counts), within `days` (home page "next service").
 */
export function nextScheduled<T extends ExpandableEvent>(events: T[], now: Date, days = 60): (Occurrence & { event: T }) | null {
  const from = stockholmDate(now);
  const to = jdnToGregorian(jdn(from) + days);
  const nowIso = now.toISOString();
  return expandEvents(events, { from, to }).find((o) => o.status !== "cancelled" && (o.end ?? o.start) >= nowIso) ?? null;
}
