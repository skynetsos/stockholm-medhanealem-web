import { describe, expect, it } from "vitest";

import { stockholmInstant, stockholmWallTime } from "../../src/lib/stockholm-time";

const d = (year: number, month: number, day: number) => ({ year, month, day });
const t = (hour: number, minute = 0) => ({ hour, minute, second: 0 });

describe("stockholmInstant", () => {
  it("uses UTC+1 in winter and UTC+2 in summer", () => {
    expect(stockholmInstant(d(2026, 12, 6), t(8)).toISOString()).toBe("2026-12-06T07:00:00.000Z");
    expect(stockholmInstant(d(2027, 7, 4), t(8)).toISOString()).toBe("2027-07-04T06:00:00.000Z");
  });

  it("is correct on both DST change days", () => {
    // Clocks go back 03:00 → 02:00 on Sunday 25 Oct 2026; forward 02:00 → 03:00 on Sunday 28 Mar 2027.
    expect(stockholmInstant(d(2026, 10, 25), t(8)).toISOString()).toBe("2026-10-25T07:00:00.000Z");
    expect(stockholmInstant(d(2026, 10, 25), t(1)).toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(stockholmInstant(d(2027, 3, 28), t(8)).toISOString()).toBe("2027-03-28T06:00:00.000Z");
    expect(stockholmInstant(d(2027, 3, 28), t(1)).toISOString()).toBe("2027-03-28T00:00:00.000Z");
  });

  it("moves a skipped time forward and picks the first of a repeated time", () => {
    expect(stockholmInstant(d(2027, 3, 28), t(2, 30)).toISOString()).toBe("2027-03-28T01:30:00.000Z"); // 03:30 CEST
    expect(stockholmInstant(d(2026, 10, 25), t(2, 30)).toISOString()).toBe("2026-10-25T00:30:00.000Z"); // 02:30 CEST
  });

  it("defaults to midnight and round-trips with stockholmWallTime", () => {
    expect(stockholmInstant(d(2027, 1, 19)).toISOString()).toBe("2027-01-18T23:00:00.000Z");
    expect(stockholmWallTime("2027-07-04T09:30:00.000Z")).toEqual({ date: d(2027, 7, 4), hour: 11, minute: 30, second: 0 });
  });
});
