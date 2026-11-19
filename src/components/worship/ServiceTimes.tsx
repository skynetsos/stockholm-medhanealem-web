import { getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/events/StatusBadge";
import type { DateLabels } from "@/lib/date-labels";
import type { Series } from "@/lib/worship";

/**
 * The weekly services as cards with the time large (the reference layout's "service times", D-049):
 * name, time (24-hour), "every <weekday>", and the next date's status when it is cancelled or moved.
 */
export async function ServiceTimes({ series, labels }: { series: Series[]; labels: DateLabels }) {
  const te = await getTranslations("events");
  if (!series.length) return null;
  return (
    <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
      {series.map(({ event, next }) => (
        <li key={event.id} className="flex flex-col items-center gap-1 rounded-md border border-primary/15 bg-white p-6 text-center shadow-sm">
          <h3 className="font-serif text-h4">{event.title}</h3>
          <p className="font-serif text-2xl font-semibold text-primary">{next.allDay ? te("allDay") : labels.time(next)}</p>
          <p className="text-muted">
            {event.recurrence?.frequency === "weekly" ? te("repeatWeekly", { weekday: labels.weekday(next.date) }) : labels.day(next.date)}
          </p>
          {next.status !== "scheduled" && (
            <p className="mt-1 text-sm">
              {labels.day(next.date)} <StatusBadge status={next.status} />
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
