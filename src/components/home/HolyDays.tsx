import { getTranslations } from "next-intl/server";

import { EventCard } from "@/components/events/EventCard";
import type { DateLabels } from "@/lib/date-labels";
import type { Occurrence } from "@/lib/events/expand";
import type { Event } from "@/payload-types";

import { HomeSection } from "./HomeSection";

/** Up to five upcoming feasts/fasts, each with its Gregorian and Ethiopian date. */
export async function HolyDays({ items, labels }: { items: (Occurrence & { event: Event })[]; labels: DateLabels }) {
  const t = await getTranslations("home");

  return (
    <HomeSection id="holy-days" title={t("upcomingHolyDays")}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((o) => (
          <li key={`${o.event.id}-${o.start}`}>
            <EventCard occurrence={o} labels={labels} />
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
