import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { type CalendarEntry, CalendarMonth } from "@/components/worship/CalendarMonth";
import { localeAlternates } from "@/i18n/alternates";
import { getActiveEvents } from "@/lib/cms/events";
import { getLayoutData } from "@/lib/cms/layout";
import { getDateLabels } from "@/lib/date-labels";
import { formatIsoDate, stockholmDate } from "@/lib/ethiopian-calendar";
import { expandEvents } from "@/lib/events/expand";

type Props = { params: Promise<{ locale: string }> };

/** Months shown: the current one and the next 12. */
const MONTHS_AHEAD = 12;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "worship" });
  return { title: t("calendar"), alternates: localeAlternates(locale, "/worship/calendar") };
}

/**
 * /worship/calendar (spec §4, §5 EventCalendar): month view of every service, feast and fast with
 * Gregorian and Ethiopian dates, plus the iCal subscription link. Always available.
 */
export default async function CalendarPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, events, labels, { settings }] = await Promise.all([
    getTranslations("worship"),
    getActiveEvents(locale as Locale, { sinceDays: 40 }),
    getDateLabels(),
    getLayoutData(locale as Locale),
  ]);

  const today = stockholmDate(new Date());
  const lastMonthStart = new Date(Date.UTC(today.year, today.month - 1 + MONTHS_AHEAD, 1));
  const lastMonthEnd = new Date(Date.UTC(lastMonthStart.getUTCFullYear(), lastMonthStart.getUTCMonth() + 1, 0));
  const range = {
    from: { year: today.year, month: today.month, day: 1 },
    to: { year: lastMonthEnd.getUTCFullYear(), month: lastMonthEnd.getUTCMonth() + 1, day: lastMonthEnd.getUTCDate() },
  };
  const entries: CalendarEntry[] = expandEvents(events, range).map((o) => ({
    key: `${o.event.id}-${o.start}`,
    title: o.event.title,
    date: formatIsoDate(o.date),
    endDate: formatIsoDate(o.endDate),
    time: o.allDay ? null : labels.time(o),
    status: o.status,
    note: o.note,
    location: o.event.location || settings.defaultLocation || null,
  }));

  return (
    <main id="main" className="mx-auto max-w-site px-gutter py-12">
      <h1>{t("calendar")}</h1>
      <p className="mb-6 mt-2">
        {/* An API route, not a page: no language prefix; the language is a parameter. */}
        <a href={`/api/ical?lang=${locale}`} className="inline-flex min-h-11 items-center">
          {t("subscribe")}
        </a>
      </p>
      <CalendarMonth
        entries={entries}
        today={formatIsoDate(today)}
        firstMonth={formatIsoDate(range.from).slice(0, 7)}
        lastMonth={formatIsoDate(range.to).slice(0, 7)}
      />
    </main>
  );
}
