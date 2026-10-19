/**
 * Ethiopian (Ge'ez) calendar ⇄ Gregorian conversion, via Julian Day Numbers.
 *
 * The Ethiopian year has 12 months of 30 days plus Pagume (month 13) with 5 days, or 6 in a leap
 * year. An Ethiopian year Y is a leap year when Y % 4 === 3 (its Pagume has 6 days), so the next
 * Meskerem 1 (Enkutatash) falls on 12 September instead of 11 September in Gregorian years that
 * precede a Gregorian leap year. Valid for the Gregorian range used by the site (1900–2099 is
 * exercised by tests; the arithmetic itself has no range limit).
 *
 * All functions work on calendar dates (no time of day). To get the Ethiopian date of an instant,
 * first take its calendar date in Europe/Stockholm (see `stockholmDate`).
 */

export type GregorianDate = { year: number; month: number; day: number };
export type EthiopianDate = { year: number; month: number; day: number };

/** Julian Day Number of Meskerem 1, year 1 (Amete Mihret era). */
const ETHIOPIAN_EPOCH_JDN = 1724221;

export function isEthiopianLeapYear(year: number): boolean {
  return ((year % 4) + 4) % 4 === 3;
}

export function daysInEthiopianMonth(year: number, month: number): number {
  if (month >= 1 && month <= 12) return 30;
  if (month === 13) return isEthiopianLeapYear(year) ? 6 : 5;
  return 0;
}

export function isValidEthiopianDate({ year, month, day }: EthiopianDate): boolean {
  return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day) && day >= 1 && day <= daysInEthiopianMonth(year, month);
}

/** Proleptic Gregorian → JDN (Fliegel–Van Flandern). */
export function gregorianToJdn({ year, month, day }: GregorianDate): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function jdnToGregorian(jdn: number): GregorianDate {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

export function ethiopianToJdn({ year, month, day }: EthiopianDate): number {
  return ETHIOPIAN_EPOCH_JDN - 1 + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day;
}

export function jdnToEthiopian(jdn: number): EthiopianDate {
  // Count 4-year cycles from one year before the epoch, so each cycle ends with the leap year
  // (year % 4 === 3) and its sixth Pagume day falls at r === 1460.
  const offset = ETHIOPIAN_EPOCH_JDN - 365;
  const r = (jdn - offset) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  return {
    year: 4 * Math.floor((jdn - offset) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: (n % 30) + 1,
  };
}

export function toEthiopian(date: GregorianDate): EthiopianDate {
  return jdnToEthiopian(gregorianToJdn(date));
}

export function toGregorian(date: EthiopianDate): GregorianDate {
  if (!isValidEthiopianDate(date)) throw new RangeError(`Invalid Ethiopian date ${date.year}-${date.month}-${date.day}`);
  return jdnToGregorian(ethiopianToJdn(date));
}

/** Calendar date of an instant in Europe/Stockholm (the site's time zone). */
export function stockholmDate(instant: Date | string): GregorianDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** "YYYY-MM-DD" for a calendar date (Gregorian or Ethiopian). */
export function formatIsoDate({ year, month, day }: { year: number; month: number; day: number }): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIsoDate(value: string): GregorianDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const date = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  const roundTrip = jdnToGregorian(gregorianToJdn(date));
  return roundTrip.year === date.year && roundTrip.month === date.month && roundTrip.day === date.day ? date : null;
}

/**
 * Fasika (Ethiopian Orthodox Easter) for a Gregorian year: the Alexandrian computus on the Julian
 * calendar (Meeus), shifted to Gregorian (+13 days for 1900–2099). Same date as other Orthodox
 * churches; Ethiopian sources compute it with Bahire Hasab.
 */
export function fasika(gregorianYear: number): GregorianDate {
  if (gregorianYear < 1900 || gregorianYear > 2099) throw new RangeError("fasika() is defined for 1900–2099");
  const a = gregorianYear % 4;
  const b = gregorianYear % 7;
  const c = gregorianYear % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const julianMonth = Math.floor((d + e + 114) / 31);
  const julianDay = ((d + e + 114) % 31) + 1;
  // Julian calendar date → JDN, then +0 (JDN is calendar-independent) → Gregorian.
  const y = gregorianYear + 4800 - Math.floor((14 - julianMonth) / 12);
  const m = julianMonth + 12 * Math.floor((14 - julianMonth) / 12) - 3;
  const jdn = julianDay + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  return jdnToGregorian(jdn);
}
