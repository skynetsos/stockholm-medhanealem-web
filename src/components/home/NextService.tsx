import { getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/events/StatusBadge";
import type { DateLabels } from "@/lib/date-labels";
import type { Occurrence } from "@/lib/events/expand";
import type { Event, SiteSetting } from "@/payload-types";

import { HomeSection } from "./HomeSection";

/** The next service still to come (or in progress), with time, Ethiopian date and place. */
export async function NextService({
  occurrence,
  settings,
  labels,
}: {
  occurrence: Occurrence & { event: Event };
  settings: SiteSetting;
  labels: DateLabels;
}) {
  const t = await getTranslations("home");
  const te = await getTranslations("events");
  const { event } = occurrence;
  const location = event.location || settings.defaultLocation;
  const livestream = event.livestreamUrl || settings.livestreamUrl;

  return (
    <HomeSection id="next-service" title={t("nextService")}>
      <div className="rounded border-s-4 border-gold bg-white p-5 shadow-sm">
        <h3 className="flex flex-wrap items-center gap-2">
          {event.title} <StatusBadge status={occurrence.status} />
        </h3>
        <p className="mt-2 text-lg font-semibold text-ink">
          <time dateTime={occurrence.start}>
            {labels.day(occurrence.date)} · {labels.time(occurrence)}
          </time>
        </p>
        <p className="text-muted">{labels.ethiopian(occurrence.date)}</p>
        {location && (
          <p className="mt-2">
            <span className="font-semibold">{te("location")}:</span> {location}
          </p>
        )}
        {occurrence.note && <p className="mt-2">{occurrence.note}</p>}
        {livestream?.startsWith("https://") && (
          <p className="mt-3">
            <a href={livestream} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center">
              {te("watchLive")}
            </a>
          </p>
        )}
      </div>
    </HomeSection>
  );
}
