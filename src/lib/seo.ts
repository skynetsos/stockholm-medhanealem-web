import type { SiteSetting } from "../payload-types";

/**
 * Search engine rules (spec Phase 1 task 8):
 * - only production is indexed (SITE_ENV=production); development and staging are noindex;
 * - Swedish pages stay out of search results until Swedish is switched on in Site settings
 *   (it waits for the Phase 3 language review, Q-004).
 */
export const isProductionSite = () => process.env.SITE_ENV === "production";

/** Languages that appear in search results and the sitemap. */
export function indexedLocales(settings: Pick<SiteSetting, "swedishPublic">): ("am" | "en" | "sv")[] {
  return settings.swedishPublic ? ["am", "en", "sv"] : ["am", "en"];
}

export function isIndexable(locale: string, settings: Pick<SiteSetting, "swedishPublic">): boolean {
  return isProductionSite() && (indexedLocales(settings) as string[]).includes(locale);
}

/** The site's public address without a trailing slash. */
export const siteOrigin = () => (process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000").replace(/\/$/, "");
