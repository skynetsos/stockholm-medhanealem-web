import config from "@payload-config";
import type { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { LAYOUT_TAG } from "../../hooks/revalidateLayout";
import type { BaptismPage } from "../../payload-types";

/**
 * The Baptism page settings for one locale, read as the public (missing translations fall back to
 * Amharic). Cached like the other settings and refreshed when it is saved (LAYOUT_TAG).
 */
export function getBaptismPage(locale: Locale): Promise<BaptismPage> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      return payload.findGlobal({ slug: "baptism-page", locale, depth: 0, overrideAccess: false });
    },
    ["baptism-page", locale],
    { tags: [LAYOUT_TAG], revalidate: 300 },
  )();
}

/** Requirements with text in this language (or its fallback); empty rows are left out. */
export const baptismRequirements = (page: Pick<BaptismPage, "requirements">) =>
  (page.requirements ?? []).filter((r) => r.item?.trim()).map((r) => ({ id: r.id ?? r.item, item: r.item, detail: r.detail?.trim() || null }));
