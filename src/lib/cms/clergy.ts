import config from "@payload-config";
import type { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { CACHE_TAGS } from "../../hooks/revalidate";
import { LAYOUT_TAG } from "../../hooks/revalidateLayout";
import type { Clergy } from "../../payload-types";

/** Published clergy profiles in their set order, photos populated (permitted ones only). */
export function getPublishedClergy(locale: Locale): Promise<Clergy[]> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      const result = await payload.find({
        collection: "clergy",
        locale,
        overrideAccess: false,
        depth: 1,
        limit: 100,
        sort: "order",
        where: { published: { equals: true } },
      });
      return result.docs;
    },
    ["clergy", locale],
    { tags: [CACHE_TAGS.clergy, LAYOUT_TAG], revalidate: 300 },
  )();
}
