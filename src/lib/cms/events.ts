import config from "@payload-config";
import type { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { CACHE_TAGS } from "../../hooks/revalidate";
import type { Event } from "../../payload-types";

const DAY_MS = 86_400_000;

/**
 * Events that can still have dates: repeating events, and one-off events that haven't ended
 * (enough to find upcoming dates). Read as the public, cached and refreshed when events change.
 * Dates are worked out when the page renders.
 */
export function getActiveEvents(locale: Locale): Promise<Event[]> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      const since = new Date(Date.now() - 2 * DAY_MS).toISOString();
      const result = await payload.find({
        collection: "events",
        locale,
        overrideAccess: false,
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
      });
      return result.docs;
    },
    ["events", locale],
    { tags: [CACHE_TAGS.events], revalidate: 300 },
  )();
}
