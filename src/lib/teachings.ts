/**
 * Where teachings appear (spec §4). No server-only imports: the middleware uses this too.
 * - Faith teachings each have a page: /our-faith/<slug>, listed on /our-faith by category.
 * - Christening, marriage and fitihat teachings are guidance, shown in full on their sacrament page
 *   (/sacraments/baptism etc.; the request forms join them in Phase 2).
 */
export const FAITH_CATEGORIES = ["mysteries", "sacraments", "fasting", "prayers", "faq"] as const;
export type FaithCategory = (typeof FAITH_CATEGORIES)[number];

export const SACRAMENT_PAGES = [
  { page: "baptism", category: "christening" },
  { page: "marriage", category: "marriage" },
  { page: "fitihat", category: "fitihat" },
] as const;
export type SacramentPage = (typeof SACRAMENT_PAGES)[number]["page"];

export const isFaithCategory = (category: string | null | undefined): category is FaithCategory =>
  (FAITH_CATEGORIES as readonly string[]).includes(category ?? "");

/** The public address of a teaching ("/our-faith/fasting-rules", "/sacraments/baptism#godparents"). */
export function teachingPath(category: string | null | undefined, slug: string | null | undefined): string | null {
  if (!slug) return null;
  if (isFaithCategory(category)) return `/our-faith/${slug}`;
  const sacrament = SACRAMENT_PAGES.find((s) => s.category === category);
  return sacrament ? `/sacraments/${sacrament.page}#${slug}` : null;
}

/** Addresses that exist given these published teachings (and whether /our-faith has an intro page). */
export function teachingPaths(teachings: { category?: string | null; slug?: string | null }[], hasFaithIntro: boolean): string[] {
  const paths = new Set<string>();
  for (const t of teachings) {
    if (!t.slug) continue;
    if (isFaithCategory(t.category)) {
      paths.add(`/our-faith/${t.slug}`);
      paths.add("/our-faith");
    }
    const sacrament = SACRAMENT_PAGES.find((s) => s.category === t.category);
    if (sacrament) {
      paths.add(`/sacraments/${sacrament.page}`);
      paths.add("/sacraments");
    }
  }
  if (hasFaithIntro) paths.add("/our-faith");
  return [...paths];
}
