import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getActiveEvents } from "@/lib/cms/events";
import { getLayoutData } from "@/lib/cms/layout";
import { WORSHIP_LISTS, type WorshipList as ListName } from "@/lib/content-paths";
import { getDateLabels } from "@/lib/date-labels";
import { upcomingSeries } from "@/lib/worship";

import { SeriesCard } from "./SeriesCard";

const TITLE_KEYS = { weekly: "weekly", "monthly-feasts": "monthlyFeasts", "annual-feasts": "annualFeasts" } as const;

export async function worshipListMetadata(locale: string, list: ListName): Promise<Metadata> {
  const t = await getTranslations({ locale: locale as Locale, namespace: "worship" });
  return { title: t(TITLE_KEYS[list]), alternates: localeAlternates(locale, `/worship/${list}`) };
}

/**
 * /worship/weekly, /monthly-feasts, /annual-feasts (spec §4): the services or feasts of that kind,
 * each with its rule and next date; annual feasts and fasts in two groups. Exists only when there
 * are such events (D-019).
 */
export async function WorshipList({ locale, list }: { locale: string; list: ListName }) {
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, events, labels, { settings }] = await Promise.all([
    getTranslations("worship"),
    getActiveEvents(locale as Locale),
    getDateLabels(),
    getLayoutData(locale as Locale),
  ]);
  const now = new Date();
  const groups =
    list === "annual-feasts"
      ? [
          { title: t("feasts"), series: upcomingSeries(events, ["annual_feast"], now) },
          { title: t("fasts"), series: upcomingSeries(events, ["fast"], now) },
        ].filter((g) => g.series.length)
      : [{ title: null, series: upcomingSeries(events, WORSHIP_LISTS[list], now) }].filter((g) => g.series.length);
  if (!groups.length) return <NotFoundContent />;

  return (
    <main id="main" className="mx-auto max-w-3xl px-gutter py-12">
      <h1>{t(TITLE_KEYS[list])}</h1>
      <p className="mt-2">
        <Link href="/worship/calendar">{t("calendar")}</Link>
      </p>
      {groups.map((group) => (
        <section key={group.title ?? list} aria-label={group.title ?? undefined} className="mt-8">
          {group.title && <h2 className="mb-4">{group.title}</h2>}
          <ul className="space-y-4">
            {group.series.map((series) => (
              <li key={series.event.id}>
                <SeriesCard
                  series={series}
                  labels={labels}
                  defaultLocation={settings.defaultLocation}
                  livestreamUrl={list === "weekly" ? settings.livestreamUrl : null}
                  heading={group.title ? "h3" : "h2"}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
