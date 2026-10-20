import config from "@payload-config";
import type { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { CACHE_TAGS } from "../../hooks/revalidate";
import { LAYOUT_TAG } from "../../hooks/revalidateLayout";
import type { Teaching } from "../../payload-types";

/**
 * Published (clergy-approved) teachings in one language, oldest first, with images and page links
 * in their text populated. Cached and refreshed when a teaching (or an image) is saved.
 */
export function getPublishedTeachings(locale: Locale): Promise<Teaching[]> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      const result = await payload.find({
        collection: "teachings",
        locale,
        overrideAccess: false,
        depth: 1,
        pagination: false,
        sort: "createdAt",
      });
      return result.docs;
    },
    ["teachings", locale],
    { tags: [CACHE_TAGS.teachings, LAYOUT_TAG], revalidate: 300 },
  )();
}
