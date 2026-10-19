import type { GregorianDate } from "./ethiopian-calendar";

/** Wall-clock time in Europe/Stockholm (the site's time zone). */
export type WallTime = { hour: number; minute: number; second: number };

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Stockholm",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Stockholm calendar date and wall-clock time of an instant. */
export function stockholmWallTime(instant: Date | string | number): { date: GregorianDate } & WallTime {
  const parts = formatter.formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    date: { year: get("year"), month: get("month"), day: get("day") },
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

const asUtc = (date: GregorianDate, time: WallTime) =>
  Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, time.second);

/** Minutes Stockholm is ahead of UTC at an instant (60 in winter, 120 in summer). */
function offsetMinutes(ms: number): number {
  const wall = stockholmWallTime(ms);
  return Math.round((asUtc(wall.date, wall) - Math.floor(ms / 1000) * 1000) / 60_000);
}

/**
 * The instant at which Stockholm's clocks show `time` on `date`.
 * - Times skipped when clocks go forward (02:00–02:59 on the last Sunday of March) move one hour
 *   later, as clocks do (02:30 → 03:30 CEST).
 * - Times that happen twice when clocks go back (02:00–02:59 on the last Sunday of October) use
 *   the first one (summer time).
 */
export function stockholmInstant(date: GregorianDate, time: WallTime = { hour: 0, minute: 0, second: 0 }): Date {
  const local = asUtc(date, time);
  const before = offsetMinutes(local - 3 * 3_600_000);
  const after = offsetMinutes(local + 3 * 3_600_000);
  const matches = [...new Set([before, after])]
    .map((offset) => local - offset * 60_000)
    .filter((ms) => asUtc(stockholmWallTime(ms).date, stockholmWallTime(ms)) === local);
  return new Date(matches.length ? Math.min(...matches) : local - before * 60_000);
}
