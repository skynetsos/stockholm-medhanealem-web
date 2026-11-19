import type { ReactNode } from "react";

import type { DateLabels } from "@/lib/date-labels";
import type { Occurrence } from "@/lib/events/expand";
import type { Event } from "@/payload-types";

import { StatusBadge } from "@/components/events/StatusBadge";

/**
 * The year's feasts and fasts on a full-width green band, two columns (the reference layout's feast
 * list, D-049): date (and time) line, name, Ethiopian date. From the calendar data, so it follows the
 * events the office enters and confirms.
 */
export function FeastBand({
  id,
  title,
  items,
  labels,
  footer,
}: {
  id: string;
  title: string;
  items: (Occurrence & { event: Event })[];
  labels: DateLabels;
  footer?: ReactNode;
}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby={`${id}-title`} className="on-dark bg-primary py-14 text-cream">
      <div className="mx-auto max-w-4xl px-gutter">
        <h2 id={`${id}-title`} className="text-center font-serif tracking-wide text-gold uppercase">
          {title}
        </h2>
        <span aria-hidden className="mx-auto mt-5 block h-px w-24 bg-gold/60" />
        <ul className="mt-8 grid gap-x-12 sm:grid-cols-2">
          {items.map((o) => (
            <li key={`${o.event.id}-${o.start}`} className="border-b border-cream/20 py-5">
              <p className="text-xs tracking-wider text-cream/80 uppercase">
                <time dateTime={o.start}>{labels.days(o)}</time>
                {!o.allDay && <> · {labels.time(o)}</>}
              </p>
              <h3 className="mt-1 flex flex-wrap items-center gap-2 font-serif text-h4 text-cream">
                {o.event.title} {o.status !== "scheduled" && <StatusBadge status={o.status} />}
              </h3>
              <p className="mt-0.5 text-sm text-cream/85">{labels.ethiopian(o.date)}</p>
            </li>
          ))}
        </ul>
        {footer && <div className="mt-8 text-center">{footer}</div>}
      </div>
    </section>
  );
}
