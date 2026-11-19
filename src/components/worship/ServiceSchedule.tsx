import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getActiveEvents } from "@/lib/cms/events";
import { getLayoutData } from "@/lib/cms/layout";
import { getDateLabels } from "@/lib/date-labels";
import { addressLines, mapLink } from "@/lib/visit";
import { upcomingSeries, yearFeasts } from "@/lib/worship";

import { FeastBand } from "./FeastBand";
import { ServiceTimes } from "./ServiceTimes";

/**
 * The service schedule on /worship, in the reference layout (D-049): weekly service cards and the
 * location card above the church's own text, and the feast band below it. `children` is the page's
 * text (its CMS blocks). Each part is hidden while it has no content.
 */
export async function ServiceSchedule({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const [t, te, events, labels, { settings }] = await Promise.all([
    getTranslations("home"),
    getTranslations("events"),
    getActiveEvents(locale),
    getDateLabels(),
    getLayoutData(locale),
  ]);
  const now = new Date();
  const weekly = upcomingSeries(events, ["weekly_service"], now);
  const feasts = yearFeasts(events, now);
  const address = addressLines(settings);
  const map = mapLink(settings);
  const phone = settings.phone?.trim();

  return (
    <>
      {(weekly.length > 0 || address.length > 0) && (
        <section aria-labelledby="service-times-title" className="mx-auto max-w-4xl px-gutter pt-12 text-center">
          <h2 id="service-times-title" className="mb-6">
            {t("serviceTimes")}
          </h2>
          <ServiceTimes series={weekly} labels={labels} />
          {address.length > 0 && (
            <div className="mt-6 rounded-md border border-primary/15 bg-white p-6 text-start shadow-sm">
              <h3 className="font-serif text-h4">{te("location")}</h3>
              <address className="mt-2 not-italic">
                {address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              {phone && (
                <p className="mt-1">
                  <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>
                </p>
              )}
              {map && (
                <p className="mt-1">
                  <a href={map} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center">
                    {t("openMap")}
                  </a>
                </p>
              )}
            </div>
          )}
        </section>
      )}
      {children}
      <div className="mt-12">
        <FeastBand
          id="feasts"
          title={t("feastDays")}
          items={feasts}
          labels={labels}
          footer={
            <Link href="/worship/calendar" className="inline-flex min-h-11 items-center font-medium text-cream">
              {t("fullCalendar")}
            </Link>
          }
        />
      </div>
    </>
  );
}
