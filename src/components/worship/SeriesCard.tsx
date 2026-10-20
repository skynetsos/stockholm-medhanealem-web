import { getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/events/StatusBadge";
import type { DateLabels } from "@/lib/date-labels";
import { ethiopianAnchor } from "@/lib/events/recurrence";
import type { Series } from "@/lib/worship";

/**
 * One service or feast with its rule ("Every Sunday · 08:00–11:30", "Every Ethiopian month on day
 * 27", "Every year on Tir 11"), the next date, place, description and upcoming per-date changes.
 */
export async function SeriesCard({
  series,
  labels,
  defaultLocation,
  livestreamUrl,
  heading: Heading = "h2",
}: {
  series: Series;
  labels: DateLabels;
  defaultLocation?: string | null;
  livestreamUrl?: string | null;
  heading?: "h2" | "h3";
}) {
  const t = await getTranslations("events");
  const { event, next, changes } = series;
  const frequency = event.recurrence?.frequency ?? "none";
  const anchor = ethiopianAnchor(event);
  const rule =
    frequency === "weekly"
      ? t("repeatWeekly", { weekday: labels.weekday(next.seriesDate) })
      : frequency === "monthly"
        ? t("repeatMonthly", { day: String(anchor.day) })
        : frequency === "yearly"
          ? t("repeatYearly", { date: labels.ethiopianDayMonth(anchor.day, anchor.month) })
          : null;
  const location = event.location || defaultLocation;
  const livestream = event.livestreamUrl || livestreamUrl;

  return (
    <article className={`rounded border-s-4 border-gold bg-white p-5 shadow-sm ${event.cancelled ? "opacity-80" : ""}`}>
      <Heading className={`text-h3 ${event.cancelled ? "line-through" : ""}`}>{event.title}</Heading>
      {event.cancelled && (
        <div className="mt-1">
          <StatusBadge status="cancelled" />
        </div>
      )}
      <p className="mt-2 text-lg font-semibold">
        {rule ?? labels.days(next)}
        {!next.allDay && ` · ${labels.time(next)}`}
      </p>
      {location && (
        <p className="mt-1">
          <span className="font-semibold">{t("location")}:</span> {location}
        </p>
      )}
      {event.description && <p className="mt-3 whitespace-pre-line">{event.description}</p>}

      {rule && (
        <p className="mt-3">
          <span className="font-semibold">{t("next")}:</span>{" "}
          <time dateTime={next.start}>{labels.days(next)}</time> · {labels.ethiopian(next.date)} <StatusBadge status={next.status} />
        </p>
      )}
      {!rule && <p className="text-muted">{labels.ethiopian(next.date)}</p>}

      {changes.length > 0 && (
        <div className="mt-3">
          <p className="font-semibold">{t("changes")}</p>
          <ul className="mt-1 space-y-1">
            {changes.map((o) => (
              <li key={o.start}>
                <time dateTime={o.start}>{labels.days(o)}</time>
                {o.status === "moved" && !o.allDay && ` · ${labels.time(o)}`} <StatusBadge status={o.status} />
                {o.note && <span className="ms-1">{o.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {livestream?.startsWith("https://") && !event.cancelled && (
        <p className="mt-3">
          <a href={livestream} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center">
            {t("watchLive")}
          </a>
        </p>
      )}
    </article>
  );
}
