import { getFormatter, getTranslations } from "next-intl/server";

import { type GregorianDate, gregorianToJdn, toEthiopian } from "./ethiopian-calendar";
import type { Occurrence } from "./events/expand";
import { stockholmInstant } from "./stockholm-time";

type MonthKey = `ethiopianMonths.m${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13}`;

const DAY = { weekday: "long", day: "numeric", month: "long", year: "numeric" } as const;
const TIME = { hour: "2-digit", minute: "2-digit" } as const;

/**
 * Localized date labels for the public site, always in Stockholm time (next-intl's timeZone).
 * Gregorian names come from the browser-independent Intl data; Ethiopian month names from messages.
 */
export async function getDateLabels() {
  const format = await getFormatter();
  const t = await getTranslations("calendar");

  const ethiopian = (date: GregorianDate) => {
    const eth = toEthiopian(date);
    // Strings, so numbers aren't grouped ("2,019").
    return t("ethiopianDate", {
      day: String(eth.day),
      month: t(`ethiopianMonths.m${eth.month}` as MonthKey),
      year: String(eth.year),
    });
  };

  return {
    ethiopian,
    day: (date: GregorianDate) => format.dateTime(stockholmInstant(date), DAY),
    /** "Sunday 18 October 2026", or a range for multi-day events. */
    days: (o: Pick<Occurrence, "date" | "endDate">) =>
      gregorianToJdn(o.endDate) > gregorianToJdn(o.date)
        ? format.dateTimeRange(stockholmInstant(o.date), stockholmInstant(o.endDate), DAY)
        : format.dateTime(stockholmInstant(o.date), DAY),
    /** "08:00–11:30" (or the start time alone). */
    time: (o: Pick<Occurrence, "start" | "end">) =>
      o.end ? format.dateTimeRange(new Date(o.start), new Date(o.end), TIME) : format.dateTime(new Date(o.start), TIME),
    /** A plain date from an instant, e.g. an announcement's publish time. */
    instant: (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "long", year: "numeric" }),
  };
}

export type DateLabels = Awaited<ReturnType<typeof getDateLabels>>;
