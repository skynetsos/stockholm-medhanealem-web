import { describe, expect, it } from "vitest";

import { nextOccurrenceDate, occursOn } from "../../src/lib/events/recurrence";

const d = (year: number, month: number, day: number) => ({ year, month, day });

// Sunday Kidase 08:00 Stockholm (CEST, UTC+2) starting Sunday 4 Oct 2026.
const kidase = { start: "2026-10-04T06:00:00.000Z", recurrence: { frequency: "weekly" as const } };

describe("weekly", () => {
  it("falls on every following Sunday, across the October DST change", () => {
    expect(occursOn(kidase, d(2026, 10, 4))).toBe(true);
    expect(occursOn(kidase, d(2026, 10, 25))).toBe(true); // DST ends that night
    expect(occursOn(kidase, d(2026, 11, 1))).toBe(true);
    expect(occursOn(kidase, d(2026, 10, 31))).toBe(false);
    expect(occursOn(kidase, d(2026, 9, 27))).toBe(false); // before the series starts
  });

  it("stops after `until`", () => {
    const series = { ...kidase, recurrence: { frequency: "weekly" as const, until: "2026-11-30T12:00:00.000Z" } };
    expect(occursOn(series, d(2026, 11, 29))).toBe(true);
    expect(occursOn(series, d(2026, 12, 6))).toBe(false);
  });

  it("uses the Stockholm date of the start, not the UTC date", () => {
    // 00:30 Monday in Stockholm is still Sunday in UTC.
    const lateNight = { start: "2026-10-04T22:30:00.000Z", recurrence: { frequency: "weekly" as const } };
    expect(occursOn(lateNight, d(2026, 10, 5))).toBe(true);
    expect(occursOn(lateNight, d(2026, 10, 4))).toBe(false);
  });
});

describe("monthly (Ethiopian day)", () => {
  // Medhanealem monthly feast: the 27th of every Ethiopian month.
  const medhanealem = { start: "2026-10-07T07:00:00.000Z", recurrence: { frequency: "monthly" as const, ethiopianDay: 27 } };

  it("falls on the 27th of each Ethiopian month", () => {
    expect(occursOn(medhanealem, d(2026, 10, 7))).toBe(true); // Meskerem 27, 2019
    expect(occursOn(medhanealem, d(2026, 11, 6))).toBe(true); // Tikimt 27
    expect(occursOn(medhanealem, d(2026, 11, 7))).toBe(false);
    expect(nextOccurrenceDate(medhanealem, d(2026, 11, 7))).toEqual(d(2026, 12, 6)); // Hidar 27
  });

  it("skips Pagume when it has no such day", () => {
    const sixth = { start: "2026-09-16T07:00:00.000Z", recurrence: { frequency: "monthly" as const, ethiopianDay: 6 } };
    expect(occursOn(sixth, d(2027, 9, 11))).toBe(true); // Pagume 6, 2019 (leap)
    expect(occursOn(sixth, d(2028, 9, 10))).toBe(false); // Pagume 5, 2020 (no 6th)
  });
});

describe("yearly (Ethiopian month + day)", () => {
  // Timket, Tir 11: 19 Jan 2027, 20 Jan 2028.
  const timket = { start: "2027-01-19T08:00:00.000Z", recurrence: { frequency: "yearly" as const } };

  it("follows the Ethiopian date, which moves in the Gregorian calendar", () => {
    expect(occursOn(timket, d(2027, 1, 19))).toBe(true);
    expect(occursOn(timket, d(2028, 1, 20))).toBe(true);
    expect(occursOn(timket, d(2028, 1, 19))).toBe(false);
  });
});

describe("one-off events", () => {
  it("occur only on their own date", () => {
    const once = { start: "2026-12-24T17:00:00.000Z" };
    expect(occursOn(once, d(2026, 12, 24))).toBe(true);
    expect(occursOn(once, d(2026, 12, 31))).toBe(false);
  });
});
