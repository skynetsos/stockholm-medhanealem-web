import { formatIsoDate, gregorianToJdn, jdnToGregorian } from "./ethiopian-calendar";
import type { Occurrence } from "./events/expand";

/**
 * iCalendar (RFC 5545) feed of event dates. Ethiopian monthly/yearly rules can't be expressed as
 * RRULEs, so every date is its own VEVENT; times are UTC, all-day events use DATE values.
 */
export type IcalEvent = Pick<Occurrence, "date" | "endDate" | "start" | "end" | "allDay" | "status" | "seriesDate" | "note"> & {
  eventId: number | string;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
};

/** Escape TEXT values: backslash, semicolon, comma and newlines. */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold a content line at 75 octets (UTF-8), never splitting a character (Ethiopic is 3 bytes). */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const utc = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dateValue = (d: { year: number; month: number; day: number }) => formatIsoDate(d).replace(/-/g, "");

export function buildCalendar({
  name,
  events,
  domain,
  now = new Date(),
}: {
  name: string;
  events: IcalEvent[];
  domain: string;
  now?: Date;
}): string {
  const stamp = utc(now.toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Stockholm Medhanealem//Website//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-WR-TIMEZONE:Europe/Stockholm",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];
  for (const e of events) {
    const description = [e.note, e.description].filter(Boolean).join("\n\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.eventId}-${dateValue(e.seriesDate)}@${domain}`,
      `DTSTAMP:${stamp}`,
      ...(e.allDay
        ? [
            `DTSTART;VALUE=DATE:${dateValue(e.date)}`,
            // DTEND is exclusive: the day after the last day.
            `DTEND;VALUE=DATE:${dateValue(jdnToGregorian(gregorianToJdn(e.endDate) + 1))}`,
          ]
        : [`DTSTART:${utc(e.start)}`, ...(e.end ? [`DTEND:${utc(e.end)}`] : [])]),
      `SUMMARY:${escapeText(e.title)}`,
      ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
      ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
      ...(e.url ? [`URL:${e.url}`] : []),
      `STATUS:${e.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
