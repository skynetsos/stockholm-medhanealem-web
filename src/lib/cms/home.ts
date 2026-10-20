import config from "@payload-config";
import type { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { CACHE_TAGS } from "../../hooks/revalidate";
import { LAYOUT_TAG } from "../../hooks/revalidateLayout";
import type { Announcement, Gallery, Homepage } from "../../payload-types";

export type HomeData = {
  homepage: Homepage;
  /** Announcements visible to the public (urgent ones included; the page picks what it needs). */
  announcements: Announcement[];
  /** The newest published gallery, images populated only where publication is permitted. */
  gallery: Gallery | null;
};

/**
 * The home page's own content besides the layout and events (getActiveEvents), for one locale,
 * read as the public. Cached for 5 minutes and refreshed when announcements, galleries, images or
 * the Home page global change.
 */
export function getHomeData(locale: Locale): Promise<HomeData> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      const read = { locale, overrideAccess: false } as const;

      const [homepage, announcements, galleries] = await Promise.all([
        // depth 1: hero/teaser images, picked events and page links
        payload.findGlobal({ slug: "homepage", ...read, depth: 1 }),
        payload.find({ collection: "announcements", ...read, depth: 0, limit: 20, sort: "-publishAt" }),
        payload.find({ collection: "galleries", ...read, depth: 1, limit: 1, sort: "-date" }),
      ]);
      return {
        homepage,
        announcements: announcements.docs,
        gallery: galleries.docs[0] ?? null,
      };
    },
    ["home", locale],
    {
      tags: [LAYOUT_TAG, CACHE_TAGS.announcements, CACHE_TAGS.galleries],
      revalidate: 300,
    },
  )();
}
