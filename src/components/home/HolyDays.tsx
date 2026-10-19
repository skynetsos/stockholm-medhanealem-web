import { getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/events/StatusBadge";
import type { DateLabels } from "@/lib/date-labels";
import type { Occurrence } from "@/lib/events/expand";
import type { Event } from "@/payload-types";

import { HomeSection } from "./HomeSection";

/** Up to five upcoming feasts/fasts, each with its Gregorian and Ethiopian date. */
export async function HolyDays({ items, labels }: { items: (Occurrence & { event: Event })[]; labels: DateLabels }) {
  const t = await getTranslations("home");
  const te = await getTranslations("events");

  return (
    <HomeSection id="holy-days" title={t("upcomingHolyDays")}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((o) => (
          <li key={`${o.event.id}-${o.start}`} className="rounded border-t-4 border-gold bg-white p-4 shadow-sm">
            <h3 className={`text-h4 ${o.status === "cancelled" ? "line-through" : ""}`}>{o.event.title}</h3>
            <div className="mt-1">
              <StatusBadge status={o.status} />
            </div>
            <p className="mt-2 font-semibold">
              <time dateTime={o.start}>{labels.days(o)}</time>
              {!o.allDay && ` · ${labels.time(o)}`}
              {o.allDay && <span className="sr-only"> ({te("allDay")})</span>}
            </p>
            <p className="text-muted">{labels.ethiopian(o.date)}</p>
            {o.note && <p className="mt-2">{o.note}</p>}
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
