import { revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from "payload";

/** Cache tags for public content. Pages read through tagged caches are refreshed on save. */
export const CACHE_TAGS = {
  layout: "layout-globals",
  pages: "pages",
  teachings: "teachings",
  events: "events",
  announcements: "announcements",
} as const;

function revalidate(req: PayloadRequest, tags: readonly string[]) {
  if (req.context?.disableRevalidate) return;
  for (const tag of tags) {
    try {
      revalidateTag(tag);
    } catch (error) {
      // Outside a Next.js request (scripts, tests) there is no cache to revalidate.
      req.payload.logger.debug({ msg: "revalidateTag skipped", tag, error: String(error) });
    }
  }
}

/** afterChange + afterDelete hooks that refresh the given cache tags. */
export function revalidateTags(...tags: string[]): {
  afterChange: CollectionAfterChangeHook[];
  afterDelete: CollectionAfterDeleteHook[];
} {
  return {
    afterChange: [({ doc, req }) => (revalidate(req, tags), doc)],
    afterDelete: [({ doc, req }) => (revalidate(req, tags), doc)],
  };
}
