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
  SECTION_INDEX_SLUG,
]);

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
