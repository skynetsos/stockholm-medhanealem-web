import config from "@payload-config";
import type { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { CACHE_TAGS } from "../../hooks/revalidate";
import { LAYOUT_TAG } from "../../hooks/revalidateLayout";
import type { Page } from "../../payload-types";
import { pagePath } from "../pages";

/**
 * Addresses of all published pages ("/our-church", "/our-church/history", "/privacy"), the same in
 * every language (D-010). Read by the middleware through /api/site/page-paths; refreshed on save.
 */
export function getPublishedPagePaths(): Promise<string[]> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      const pages = await payload.find({
        collection: "pages",
        overrideAccess: false, // the public sees published pages only
        depth: 0,
        pagination: false,
        select: { section: true, slug: true },
      });
      return pages.docs.map((p) => pagePath(p.section, p.slug)).filter((p): p is string => Boolean(p));
    },
    ["page-paths"],
    { tags: [CACHE_TAGS.pages], revalidate: 300 },
  )();
}

/**
 * A published page in one language (missing translations fall back to Amharic), or null.
 * depth 1 populates images, button links and links inside rich text.
 */
export function getPage(locale: Locale, section: string, slug: string): Promise<Page | null> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      const result = await payload.find({
        collection: "pages",
        locale,
        overrideAccess: false,
        depth: 1,
        limit: 1,
        where: { and: [{ section: { equals: section } }, { slug: { equals: slug } }] },
      });
      return result.docs[0] ?? null;
    },
    ["page", locale, section, slug],
    // Images (publication permission) refresh through the layout tag.
    { tags: [CACHE_TAGS.pages, LAYOUT_TAG], revalidate: 300 },
  )();
}
