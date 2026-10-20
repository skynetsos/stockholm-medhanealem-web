import { locales } from "../i18n/locales";
import { cmsRoutePath, isAppOwned, pageForPath, pagePath } from "./pages";

/**
 * Where the middleware sends a request (D-017). Next.js 15.4 can't server-render a 404 from a page
 * that calls notFound(), so CMS pages are not served by a catch-all route. Instead the middleware
 * rewrites the address of a *published* page to the internal CMS route; any other address matches
 * no route and gets the normal, server-rendered 404.
 *
 * @param publishedPaths published page addresses ("/our-church", "/privacy"), or null when the list
 *   couldn't be loaded; then every possible CMS address is tried (the page shows "not found" itself).
 * @returns the internal path to rewrite to, or null to leave the request alone.
 */
export function cmsRewriteTarget(pathname: string, publishedPaths: ReadonlySet<string> | null): string | null {
  const [locale, ...rest] = pathname.split("/").filter(Boolean);
  if (!locale || !(locales as readonly string[]).includes(locale) || rest.length === 0) return null;
  // The internal route is never addressed directly: send it to a path no route matches (404).
  if (rest[0] === "cms") return `/${locale}/cms/not/a/page`;

  const page = pageForPath(`/${rest.join("/")}`);
  if (!page || isAppOwned(page.section, page.slug)) return null;
  const path = pagePath(page.section, page.slug);
  if (!path || (publishedPaths && !publishedPaths.has(path))) return null;
  return cmsRoutePath(locale, page.section, page.slug);
}

/** How long the middleware keeps the address list (a newly published page appears within this). */
export const PAGE_PATHS_TTL_MS = 30_000;
export const PAGE_PATHS_ENDPOINT = "/api/site/page-paths";

let cached: { paths: Set<string>; expires: number } | null = null;
let loading: Promise<Set<string> | null> | null = null;

/**
 * Published page addresses, fetched from this app's own endpoint and kept in memory for 30 s.
 * On failure the last known list is used (or null if there is none yet).
 */
export async function publishedPagePaths(origin: string, now = Date.now()): Promise<Set<string> | null> {
  if (cached && cached.expires > now) return cached.paths;
  loading ??= fetch(`${origin}${PAGE_PATHS_ENDPOINT}`, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`status ${res.status}`);
      const { paths } = (await res.json()) as { paths: string[] };
      cached = { paths: new Set(paths), expires: Date.now() + PAGE_PATHS_TTL_MS };
      return cached.paths;
    })
    .catch(() => cached?.paths ?? null)
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Test helper: forget the cached list. */
export function resetPagePathsCache() {
  cached = null;
  loading = null;
}
