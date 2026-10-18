import config from "@payload-config";
import type { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { LAYOUT_TAG } from "../../hooks/revalidateLayout";
import type { Footer, Navigation, SiteSetting } from "../../payload-types";

export type LayoutData = {
  settings: SiteSetting;
  navigation: Navigation;
  footer: Footer;
};

/**
 * Header/footer data for one locale. Read as the public (overrideAccess: false, no user), so
 * staff-only fields never reach a page. Missing translations fall back to Amharic (Payload fallback).
 * Cached for 5 minutes and refreshed immediately when an editor saves a global (LAYOUT_TAG).
 */
export function getLayoutData(locale: Locale): Promise<LayoutData> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      const read = { locale, depth: 0, overrideAccess: false } as const;
      const [settings, navigation, footer] = await Promise.all([
        payload.findGlobal({ slug: "site-settings", ...read }),
        payload.findGlobal({ slug: "navigation", ...read }),
        payload.findGlobal({ slug: "footer", ...read }),
      ]);
      return { settings, navigation, footer };
    },
    ["layout", locale],
    { tags: [LAYOUT_TAG], revalidate: 300 },
  )();
}

/** Locales offered in the public switcher (Swedish only once enabled in Site settings). */
export function publicLocales(settings: Pick<SiteSetting, "swedishPublic">): Locale[] {
  return settings.swedishPublic ? ["am", "en", "sv"] : ["am", "en"];
}
