import { getTranslations } from "next-intl/server";

import type { DateLabels } from "@/lib/date-labels";
import type { Occurrence } from "@/lib/events/expand";
import type { Event } from "@/payload-types";

import { StatusBadge } from "./StatusBadge";

/** One date of an event: title, status, Gregorian and Ethiopian date, time, place, note (spec §5). */
export async function EventCard({
  occurrence,
  labels,
  defaultLocation,
}: {
  occurrence: Occurrence & { event: Event };
  labels: DateLabels;
  defaultLocation?: string | null;
}) {
  const te = await getTranslations("events");
  const { event } = occurrence;
  const location = event.location || defaultLocation;

  return (
    <article className="h-full rounded border-t-4 border-gold bg-white p-4 shadow-sm">
      <h3 className={`text-h4 ${occurrence.status === "cancelled" ? "line-through" : ""}`}>{event.title}</h3>
      <div className="mt-1">
        <StatusBadge status={occurrence.status} />
      </div>
      <p className="mt-2 font-semibold">
        <time dateTime={occurrence.start}>{labels.days(occurrence)}</time>
        {!occurrence.allDay && ` · ${labels.time(occurrence)}`}
        {occurrence.allDay && <span className="sr-only"> ({te("allDay")})</span>}
      </p>
      <p className="text-muted">{labels.ethiopian(occurrence.date)}</p>
      {location && (
        <p className="mt-2">
          <span className="font-semibold">{te("location")}:</span> {location}
        </p>
      )}
      {occurrence.note && <p className="mt-2">{occurrence.note}</p>}
    </article>
  );
}
