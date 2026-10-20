/**
 * Where a CMS Page lives on the site (spec §4). A page's path is its section prefix + slug; the slug
 * "index" is the section's landing page (e.g. /our-church). "Other" pages live at the top level
 * (/privacy, /cookies). Paths are the same in every language; next-intl adds /am, /en or /sv.
 */
export const PAGE_SECTIONS = [
  { value: "our-church", label: "Our Church" },
  { value: "our-faith", label: "Our Faith" },
  { value: "sunday-school", label: "Sunday School" },
  { value: "worship", label: "Worship & Calendar" },
  { value: "support", label: "Support" },
  { value: "visit", label: "Visit & Contact" },
  { value: "other", label: "Other (top-level page, e.g. /privacy)" },
] as const;

export type PageSection = (typeof PAGE_SECTIONS)[number]["value"];

export const SECTION_INDEX_SLUG = "index";

/** Top-level paths owned by app routes, which an "other" page must not take. */
export const RESERVED_TOP_LEVEL_SLUGS = new Set([
  "our-church",
  "our-faith",
  "worship",
  "sunday-school",
  "sacraments",
  "news",
  "media",
  "support",
  "visit",
  "search",
  "admin",
  "api",
  "cms", // internal route that renders CMS pages (see cmsRoutePath)
  SECTION_INDEX_SLUG,
]);

/**
 * Addresses inside a section that belong to the site's own routes (spec §4), which a CMS page must
 * not take. "*" means every address below the section is the site's (teachings, departments); only
 * the section's landing page ("index") can then be a CMS page.
 */
export const APP_OWNED_SECTION_SLUGS: Partial<Record<PageSection, readonly string[] | "*">> = {
  "our-church": ["clergy"],
  "our-faith": "*",
  "sunday-school": "*",
  worship: ["weekly", "monthly-feasts", "annual-feasts", "calendar", "livestream"],
  support: ["volunteer"],
};

/** True when the site's own routes serve this address, so it can never be a CMS page. */
export function isAppOwned(section: string, slug: string): boolean {
  if (section === "other") return RESERVED_TOP_LEVEL_SLUGS.has(slug);
  if (slug === SECTION_INDEX_SLUG) return false;
  const owned = APP_OWNED_SECTION_SLUGS[section as PageSection];
  return owned === "*" || Boolean(owned?.includes(slug));
}

/**
 * The section and slug a site path (without locale) would be served from as a CMS page, or null
 * when no CMS page can live there. "/our-church" → our-church/index, "/privacy" → other/privacy.
 */
export function pageForPath(path: string): { section: PageSection; slug: string } | null {
  const segments = path.split("/").filter(Boolean);
  const isSection = (s: string) => s !== "other" && PAGE_SECTIONS.some((p) => p.value === s);
  if (segments.length === 1) {
    const [first] = segments;
    return isSection(first) ? { section: first as PageSection, slug: SECTION_INDEX_SLUG } : { section: "other", slug: first };
  }
  if (segments.length === 2 && isSection(segments[0])) return { section: segments[0] as PageSection, slug: segments[1] };
  return null;
}

/**
 * Internal route that renders CMS pages. The middleware rewrites the public address of a published
 * page to it (D-017); the address itself is never linked and answers 404 when requested directly.
 */
export const cmsRoutePath = (locale: string, section: string, slug: string) => `/${locale}/cms/${section}/${slug}`;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlugFormat(slug: unknown): true | string {
  if (typeof slug !== "string" || slug === "") return "Enter a slug, e.g. history";
  if (slug.length > 80) return "Keep the slug under 80 characters";
  if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters a–z, digits and single hyphens only (e.g. our-history)";
  return true;
}

export function pagePath(section: string | null | undefined, slug: string | null | undefined): string | null {
  if (!slug || validateSlugFormat(slug) !== true) return null;
  if (!section || section === "other") return slug === SECTION_INDEX_SLUG ? null : `/${slug}`;
  if (!PAGE_SECTIONS.some((s) => s.value === section)) return null;
  return slug === SECTION_INDEX_SLUG ? `/${section}` : `/${section}/${slug}`;
}
