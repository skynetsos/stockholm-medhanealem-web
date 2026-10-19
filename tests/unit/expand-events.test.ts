import { describe, expect, it } from "vitest";

import { formatIsoDate } from "../../src/lib/ethiopian-calendar";
import { expandEvent, expandEvents, MAX_RANGE_DAYS, nextScheduled } from "../../src/lib/events/expand";
import { stockholmWallTime } from "../../src/lib/stockholm-time";

type Ymd = [number, number, number];
const d = (year: number, month: number, day: number) => ({ year, month, day });
const range = (from: Ymd, to: Ymd) => ({ from: d(...from), to: d(...to) });
const local = (iso: string | null) => {
  const w = stockholmWallTime(iso!);
  return `${String(w.hour).padStart(2, "0")}:${String(w.minute).padStart(2, "0")}`;
};

// Sunday Kidase 08:00–11:30 Stockholm, weekly from Sunday 4 Oct 2026 (CEST, UTC+2).
const kidase = {
  start: "2026-10-04T06:00:00.000Z",
  end: "2026-10-04T09:30:00.000Z",
  recurrence: { frequency: "weekly" as const },
};

describe("weekly Kidase across DST", () => {
  it("stays 08:00–11:30 when summer time ends (last Sunday of October)", () => {
    const list = expandEvent(kidase, range([2026, 10, 18], [2026, 11, 1]));
    expect(list.map((o) => [o.start, o.end])).toEqual([
      ["2026-10-18T06:00:00.000Z", "2026-10-18T09:30:00.000Z"],
      ["2026-10-25T07:00:00.000Z", "2026-10-25T10:30:00.000Z"], // the change-over Sunday itself
      ["2026-11-01T07:00:00.000Z", "2026-11-01T10:30:00.000Z"],
    ]);
    expect(list.every((o) => local(o.start) === "08:00" && local(o.end) === "11:30")).toBe(true);
  });

  it("stays 08:00–11:30 when summer time starts (last Sunday of March)", () => {
    const list = expandEvent(kidase, range([2027, 3, 21], [2027, 4, 4]));
    expect(list.map((o) => o.start)).toEqual(["2027-03-21T07:00:00.000Z", "2027-03-28T06:00:00.000Z", "2027-04-04T06:00:00.000Z"]);
    expect(list.every((o) => local(o.start) === "08:00" && local(o.end) === "11:30")).toBe(true);
  });

  it("covers a full year with one occurrence per Sunday", () => {
    const list = expandEvent(kidase, range([2027, 1, 1], [2027, 12, 31]));
    expect(list).toHaveLength(52);
    expect(list.every((o) => new Date(`${formatIsoDate(o.date)}T12:00:00Z`).getUTCDay() === 0)).toBe(true);
    expect(list.every((o) => local(o.start) === "08:00")).toBe(true);
  });

  it("respects `until` and the start of the series", () => {
    const series = { ...kidase, recurrence: { frequency: "weekly" as const, until: "2026-10-18T12:00:00.000Z" } };
    expect(expandEvent(series, range([2026, 9, 1], [2026, 12, 31])).map((o) => o.date.day)).toEqual([4, 11, 18]);
  });
});

describe("per-date changes", () => {
  const withChanges = {
    ...kidase,
    overrides: [
      { date: "2026-11-07T23:00:00.000Z", action: "cancel" as const, note: "No Kidase: pilgrimage" },
      { date: "2026-11-14T23:00:00.000Z", action: "move" as const, newStart: "2026-11-14T09:00:00.000Z", note: "Saturday instead" },
      { date: "2026-11-21T23:00:00.000Z", action: "notice" as const, note: "Guest preacher" },
    ],
  };

  it("cancels, moves and annotates single dates without touching the rest", () => {
    const list = expandEvent(withChanges, range([2026, 11, 1], [2026, 11, 29]));
    expect(list.map((o) => [o.date.day, o.status, o.note])).toEqual([
      [1, "scheduled", null],
      [8, "cancelled", "No Kidase: pilgrimage"],
      [14, "moved", "Saturday instead"],
      [22, "scheduled", "Guest preacher"],
      [29, "scheduled", null],
    ]);
    const moved = list.find((o) => o.status === "moved")!;
    expect(moved.seriesDate).toEqual(d(2026, 11, 15));
    expect([moved.start, moved.end]).toEqual(["2026-11-14T09:00:00.000Z", "2026-11-14T12:30:00.000Z"]); // keeps 3½ h
  });

  it("shows a moved date where it lands, even weeks later", () => {
    const far = { ...kidase, overrides: [{ date: "2026-11-14T23:00:00.000Z", action: "move" as const, newStart: "2026-12-19T09:00:00.000Z" }] };
    expect(expandEvent(far, range([2026, 11, 15], [2026, 11, 15]))).toEqual([]);
    expect(expandEvent(far, range([2026, 12, 19], [2026, 12, 19]))).toMatchObject([{ status: "moved", seriesDate: d(2026, 11, 15) }]);
  });

  it("marks every date cancelled when the whole series is cancelled", () => {
    const list = expandEvent({ ...withChanges, cancelled: true }, range([2026, 11, 1], [2026, 11, 29]));
    expect(list).toHaveLength(5);
    expect(list.every((o) => o.status === "cancelled")).toBe(true);
  });
});

describe("Ethiopian-calendar repeats", () => {
  it("monthly on the 27th (Medhanealem) at 09:00 local, before and after the clock change", () => {
    const medhanealem = { start: "2026-10-07T07:00:00.000Z", recurrence: { frequency: "monthly" as const, ethiopianDay: 27 } };
    const list = expandEvent(medhanealem, range([2026, 10, 1], [2026, 12, 31]));
    expect(list.map((o) => o.date)).toEqual([d(2026, 10, 7), d(2026, 11, 6), d(2026, 12, 6)]);
    expect(list.map((o) => local(o.start))).toEqual(["09:00", "09:00", "09:00"]);
  });

  it("yearly all-day feast (Timket, Tir 11) moves in the Gregorian calendar", () => {
    const timket = { start: "2027-01-18T23:00:00.000Z", allDay: true, recurrence: { frequency: "yearly" as const } };
    const list = expandEvent(timket, range([2027, 1, 1], [2028, 12, 31]));
    expect(list.map((o) => [o.date, o.start, o.end])).toEqual([
      [d(2027, 1, 19), "2027-01-18T23:00:00.000Z", null],
      [d(2028, 1, 20), "2028-01-19T23:00:00.000Z", null],
    ]);
  });

  it("a multi-day fast that began before the range still shows in it", () => {
    const fast = { start: "2027-02-28T23:00:00.000Z", end: "2027-04-23T22:00:00.000Z", allDay: true };
    expect(expandEvent(fast, range([2027, 4, 1], [2027, 4, 7]))).toMatchObject([{ date: d(2027, 3, 1), endDate: d(2027, 4, 24) }]);
    expect(expandEvent(fast, range([2027, 4, 25], [2027, 4, 30]))).toEqual([]);
  });
});

describe("ranges and helpers", () => {
  it("rejects over-long ranges and returns nothing for reversed ones", () => {
    expect(() => expandEvent(kidase, range([2026, 1, 1], [2030, 1, 1]))).toThrow(RangeError);
    expect(MAX_RANGE_DAYS).toBeGreaterThanOrEqual(366);
    expect(expandEvent(kidase, range([2026, 12, 1], [2026, 11, 1]))).toEqual([]);
  });

  it("merges events in start order", () => {
    const vespers = { start: "2026-10-10T16:00:00.000Z", recurrence: { frequency: "weekly" as const } };
    const list = expandEvents([kidase, vespers], range([2026, 10, 10], [2026, 10, 18]));
    expect(list.map((o) => [o.event === kidase ? "kidase" : "vespers", o.date.day])).toEqual([
      ["vespers", 10],
      ["kidase", 11],
      ["vespers", 17],
      ["kidase", 18],
    ]);
  });

  it("finds the next service, skipping a cancelled Sunday", () => {
    const series = { ...kidase, overrides: [{ date: "2026-10-24T22:00:00.000Z", action: "cancel" as const }] };
    expect(nextScheduled([series], new Date("2026-10-18T10:00:00.000Z"))?.date).toEqual(d(2026, 11, 1));
    expect(nextScheduled([series], new Date("2026-10-18T05:00:00.000Z"))?.date).toEqual(d(2026, 10, 18));
  });
});
