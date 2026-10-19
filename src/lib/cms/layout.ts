import config from "@payload-config";
import type { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { LAYOUT_TAG } from "../../hooks/revalidateLayout";
import type { Announcement, Footer, Navigation, SiteSetting } from "../../payload-types";

export type LayoutData = {
  settings: SiteSetting;
  navigation: Navigation;
  footer: Footer;
  /** Urgent announcements visible now (the bar at the top of every page). */
  urgent: Announcement[];
};

/**
 * Header/footer data for one locale. Read as the public (overrideAccess: false, no user), so
 * staff-only fields never reach a page. Missing translations fall back to Amharic (Payload fallback).
 * Cached for 5 minutes and refreshed immediately when an editor saves a global or an announcement
 * (LAYOUT_TAG); the bar re-checks expiry when the page renders.
 */
export function getLayoutData(locale: Locale): Promise<LayoutData> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      // depth 1 populates the logo and page links. Public read rules leave them unpopulated (just an
      // id, so they are hidden) unless the image has publication permission / the page is published.
      const read = { locale, depth: 1, overrideAccess: false } as const;
      const [settings, navigation, footer, urgent] = await Promise.all([
        payload.findGlobal({ slug: "site-settings", ...read }),
        payload.findGlobal({ slug: "navigation", ...read }),
        payload.findGlobal({ slug: "footer", ...read }),
        // Public read already limits announcements to those between "show from" and "hide after".
        payload.find({
          collection: "announcements",
          locale,
          depth: 0,
          overrideAccess: false,
          where: { urgent: { equals: true } },
          sort: "-publishAt",
          limit: 3,
        }),
      ]);
      return { settings, navigation, footer, urgent: urgent.docs };
    },
    ["layout", locale],
    { tags: [LAYOUT_TAG], revalidate: 300 },
  )();
}

/** Locales offered in the public switcher (Swedish only once enabled in Site settings). */
export function publicLocales(settings: Pick<SiteSetting, "swedishPublic">): Locale[] {
  return settings.swedishPublic ? ["am", "en", "sv"] : ["am", "en"];
}
