import config from "@payload-config";
import type { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { CACHE_TAGS } from "../../hooks/revalidate";
import { LAYOUT_TAG } from "../../hooks/revalidateLayout";
import type { Announcement, Event, Gallery, Homepage } from "../../payload-types";

export type HomeData = {
  homepage: Homepage;
  /** Repeating events, and one-off events that haven't ended (enough to find upcoming dates). */
  events: Event[];
  /** Announcements visible to the public (urgent ones included; the page picks what it needs). */
  announcements: Announcement[];
  /** The newest published gallery, images populated only where publication is permitted. */
  gallery: Gallery | null;
};

const DAY_MS = 86_400_000;

/**
 * Everything the home page shows besides the layout, for one locale, read as the public.
 * Cached for 5 minutes and refreshed when events, announcements, galleries, images or the
 * Home page global change. Dates (next service etc.) are worked out when the page renders.
 */
export function getHomeData(locale: Locale): Promise<HomeData> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      const read = { locale, overrideAccess: false } as const;
      const since = new Date(Date.now() - 2 * DAY_MS).toISOString();

      const [homepage, events, announcements, galleries] = await Promise.all([
        // depth 1: hero/teaser images, picked events and page links
        payload.findGlobal({ slug: "homepage", ...read, depth: 1 }),
        payload.find({
          collection: "events",
          ...read,
          depth: 0,
          limit: 500,
          sort: "start",
          where: {
            or: [
              { "recurrence.frequency": { in: ["weekly", "monthly", "yearly"] } },
              { start: { greater_than_equal: since } },
              { end: { greater_than_equal: since } },
            ],
          },
        }),
        payload.find({ collection: "announcements", ...read, depth: 0, limit: 20, sort: "-publishAt" }),
        payload.find({ collection: "galleries", ...read, depth: 1, limit: 1, sort: "-date" }),
      ]);
      return {
        homepage,
        events: events.docs,
        announcements: announcements.docs,
        gallery: galleries.docs[0] ?? null,
      };
    },
    ["home", locale],
    {
      tags: [LAYOUT_TAG, CACHE_TAGS.events, CACHE_TAGS.announcements, CACHE_TAGS.galleries],
      revalidate: 300,
    },
  )();
}
