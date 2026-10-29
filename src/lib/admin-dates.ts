import am from "../messages/am.json";
import en from "../messages/en.json";
import { stockholmDate, toEthiopian } from "./ethiopian-calendar";

/**
 * Dates as staff see them in the admin (D-032): Stockholm time, with the Ethiopian date beside the
 * Gregorian one. No server-only imports: admin client components use this.
 */
const TIME_ZONE = "Europe/Stockholm";

type Month = keyof typeof am.calendar.ethiopianMonths;

/** "Sun 6 Dec 2026, 10:00" in Stockholm. */
export const stockholmDateTimeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(
    new Date(iso),
  );

/** "ኅዳር 27 ቀን 2019 ዓ.ም. (Hidar 27, 2019 E.C.)" for the Stockholm calendar day of `iso`. */
export function ethiopianDateLabel(iso: string): string {
  const eth = toEthiopian(stockholmDate(iso));
  const month = `m${eth.month}` as Month;
  const format = (calendar: typeof am.calendar | typeof en.calendar) =>
    calendar.ethiopianDate.replace("{day}", String(eth.day)).replace("{month}", calendar.ethiopianMonths[month]).replace("{year}", String(eth.year));
  return `${format(am.calendar)} (${format(en.calendar)})`;
}
