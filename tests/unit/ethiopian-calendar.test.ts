import { describe, expect, it } from "vitest";

import {
  daysInEthiopianMonth,
  fasika,
  gregorianToJdn,
  isEthiopianLeapYear,
  isValidEthiopianDate,
  jdnToGregorian,
  parseIsoDate,
  stockholmDate,
  toEthiopian,
  toGregorian,
} from "../../src/lib/ethiopian-calendar";

const g = (year: number, month: number, day: number) => ({ year, month, day });
const e = g;

describe("Julian Day Numbers", () => {
  it("matches known reference values", () => {
    expect(gregorianToJdn(g(2000, 1, 1))).toBe(2451545);
    expect(gregorianToJdn(g(1970, 1, 1))).toBe(2440588);
    expect(jdnToGregorian(2451545)).toEqual(g(2000, 1, 1));
  });
});

describe("Enkutatash (Meskerem 1)", () => {
  it.each([
    [2017, g(2024, 9, 11)],
    [2018, g(2025, 9, 11)],
    [2019, g(2026, 9, 11)],
    [2020, g(2027, 9, 12)], // follows leap year 2019 (Pagume 6) → 12 Sep before Gregorian leap 2028
    [2021, g(2028, 9, 11)],
    [2016, g(2023, 9, 12)],
  ])("Meskerem 1, %i E.C. = %o", (year, greg) => {
    expect(toGregorian(e(year, 1, 1))).toEqual(greg);
    expect(toEthiopian(greg)).toEqual(e(year, 1, 1));
  });
});

describe("fixed feasts", () => {
  it("Meskel (Meskerem 17) is 27 Sep, or 28 Sep in years starting on the 12th", () => {
    expect(toGregorian(e(2019, 1, 17))).toEqual(g(2026, 9, 27));
    expect(toGregorian(e(2020, 1, 17))).toEqual(g(2027, 9, 28));
  });

  it("Genna (Tahsas 29) is 7 Jan; in the year after Pagume 6 Tahsas 29 is 8 Jan (Genna then kept on Tahsas 28)", () => {
    expect(toGregorian(e(2018, 4, 29))).toEqual(g(2026, 1, 7));
    expect(toGregorian(e(2019, 4, 29))).toEqual(g(2027, 1, 7));
    expect(toGregorian(e(2020, 4, 29))).toEqual(g(2028, 1, 8));
    expect(toGregorian(e(2020, 4, 28))).toEqual(g(2028, 1, 7));
  });

  it("Timket (Tir 11) is 19 Jan, or 20 Jan in the year after Pagume 6", () => {
    expect(toGregorian(e(2018, 5, 11))).toEqual(g(2026, 1, 19));
    expect(toGregorian(e(2019, 5, 11))).toEqual(g(2027, 1, 19));
    expect(toGregorian(e(2020, 5, 11))).toEqual(g(2028, 1, 20));
  });
});

describe("Fasika (Alexandrian computus)", () => {
  it.each([
    [2026, g(2026, 4, 12)],
    [2027, g(2027, 5, 2)],
    [2028, g(2028, 4, 16)],
    [2029, g(2029, 4, 8)],
    [2030, g(2030, 4, 28)],
  ])("%i → %o", (year, date) => {
    expect(fasika(year)).toEqual(date);
  });

  it("is always a Sunday", () => {
    for (let year = 1990; year <= 2099; year++) {
      const { month, day } = fasika(year);
      expect(new Date(Date.UTC(year, month - 1, day)).getUTCDay(), String(year)).toBe(0);
    }
  });
});

describe("leap years and Pagume", () => {
  it("Pagume has 6 days when year % 4 === 3, otherwise 5", () => {
    expect(isEthiopianLeapYear(2019)).toBe(true);
    expect(isEthiopianLeapYear(2018)).toBe(false);
    expect(daysInEthiopianMonth(2019, 13)).toBe(6);
    expect(daysInEthiopianMonth(2018, 13)).toBe(5);
    expect(daysInEthiopianMonth(2018, 4)).toBe(30);
  });

  it("Pagume 6 exists only in leap years", () => {
    expect(toGregorian(e(2019, 13, 6))).toEqual(g(2027, 9, 11));
    expect(isValidEthiopianDate(e(2018, 13, 6))).toBe(false);
    expect(() => toGregorian(e(2018, 13, 6))).toThrow(RangeError);
    expect(() => toGregorian(e(2018, 1, 31))).toThrow(RangeError);
  });
});

describe("round trips", () => {
  it("every day from 1900 to 2099 converts there and back", () => {
    const start = gregorianToJdn(g(1900, 1, 1));
    const end = gregorianToJdn(g(2099, 12, 31));
    for (let jdn = start; jdn <= end; jdn++) {
      const greg = jdnToGregorian(jdn);
      const eth = toEthiopian(greg);
      expect(isValidEthiopianDate(eth)).toBe(true);
      if (gregorianToJdn(toGregorian(eth)) !== jdn) {
        throw new Error(`round trip failed at JDN ${jdn}`);
      }
    }
  });
});

describe("helpers", () => {
  it("takes the calendar date in Stockholm, not UTC", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Stockholm (winter, UTC+1).
    expect(stockholmDate("2026-12-31T23:30:00Z")).toEqual(g(2027, 1, 1));
    // 22:30 UTC on 28 Jun is 00:30 on 29 Jun in Stockholm (summer, UTC+2).
    expect(stockholmDate("2026-06-28T22:30:00Z")).toEqual(g(2026, 6, 29));
  });

  it("parses only real ISO dates", () => {
    expect(parseIsoDate("2026-11-01")).toEqual(g(2026, 11, 1));
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("1/11/2026")).toBeNull();
  });
});
