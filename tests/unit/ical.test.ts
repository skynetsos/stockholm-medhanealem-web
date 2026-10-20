import { describe, expect, it } from "vitest";

import { buildCalendar, escapeText, foldLine } from "../../src/lib/ical";

const d = (year: number, month: number, day: number) => ({ year, month, day });
const now = new Date("2026-10-20T08:00:00.000Z");

describe("ical", () => {
  it("escapes text values", () => {
    expect(escapeText("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
  });

  it("folds long lines at 75 bytes without splitting Ethiopic characters", () => {
    const line = `SUMMARY:${"መድኃኔዓለም".repeat(10)}`;
    const folded = foldLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(line);
  });

  it("writes timed, all-day and cancelled dates", () => {
    const ics = buildCalendar({
      name: "Medhanealem",
      domain: "medhanealem.se",
      now,
      events: [
        {
          eventId: 7,
          title: "ቅዳሴ",
          date: d(2026, 10, 25),
          endDate: d(2026, 10, 25),
          seriesDate: d(2026, 10, 25),
          start: "2026-10-25T07:00:00.000Z",
          end: "2026-10-25T10:30:00.000Z",
          allDay: false,
          status: "scheduled",
          note: "Guest preacher",
          location: "Pålsbodagränd 3, Bandhagen",
        },
        {
          eventId: 9,
          title: "Tsome Nebiyat",
          date: d(2026, 11, 25),
          endDate: d(2027, 1, 6),
          seriesDate: d(2026, 11, 25),
          start: "2026-11-24T23:00:00.000Z",
          end: null,
          allDay: true,
          status: "cancelled",
          note: null,
        },
      ],
    });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("UID:7-20261025@medhanealem.se");
    expect(ics).toContain("DTSTART:20261025T070000Z\r\nDTEND:20261025T103000Z");
    expect(ics).toContain("LOCATION:Pålsbodagränd 3\\, Bandhagen");
    expect(ics).toContain("DESCRIPTION:Guest preacher");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261125\r\nDTEND;VALUE=DATE:20270107"); // exclusive end
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("DTSTAMP:20261020T080000Z");
  });
});
