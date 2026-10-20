import { describe, expect, it } from "vitest";

import type { Event } from "../../src/payload-types";
import { upcomingSeries } from "../../src/lib/worship";

const TZ = "Europe/Stockholm" as const;
const event = (id: number, data: Partial<Event> & Pick<Event, "type" | "start">): Event =>
  ({ id, title: `Event ${id}`, start_tz: TZ, updatedAt: "", createdAt: "", ...data }) as Event;

const now = new Date("2026-10-20T10:00:00.000Z"); // Tuesday

describe("upcomingSeries", () => {
  const kidase = event(1, {
    type: "weekly_service",
    start: "2026-10-04T06:00:00.000Z",
    end: "2026-10-04T09:30:00.000Z",
    recurrence: { frequency: "weekly" },
    overrides: [
      { date: "2026-11-07T23:00:00.000Z", date_tz: TZ, action: "cancel", note: "Pilgrimage" },
      { date: "2027-02-06T23:00:00.000Z", date_tz: TZ, action: "notice", note: "Too far ahead" },
    ],
  });
  const vespers = event(2, { type: "weekly_service", start: "2026-10-24T15:00:00.000Z", recurrence: { frequency: "weekly" } });
  const feast = event(3, { type: "annual_feast", start: "2027-01-18T23:00:00.000Z", allDay: true, recurrence: { frequency: "yearly" } });

  it("groups each event with its next date and the changes in the next 60 days", () => {
    const series = upcomingSeries([kidase, vespers, feast], ["weekly_service"], now);
    expect(series.map((s) => s.event.id)).toEqual([2, 1]); // Saturday vespers comes before Sunday Kidase
    const k = series.find((s) => s.event.id === 1)!;
    expect(k.next.date).toEqual({ year: 2026, month: 10, day: 25 });
    expect(k.changes.map((c) => [c.date.day, c.status, c.note])).toEqual([[8, "cancelled", "Pilgrimage"]]);
  });

  it("leaves out events of other types and series without coming dates", () => {
    const ended = event(4, { type: "weekly_service", start: "2026-01-04T06:00:00.000Z", recurrence: { frequency: "weekly", until: "2026-03-01T12:00:00.000Z" } });
    expect(upcomingSeries([feast, ended], ["weekly_service"], now)).toEqual([]);
    expect(upcomingSeries([feast], ["annual_feast"], now)[0].next.date).toEqual({ year: 2027, month: 1, day: 19 });
  });
});
