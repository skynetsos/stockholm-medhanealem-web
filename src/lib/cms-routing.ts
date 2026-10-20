import { locales } from "../i18n/locales";
import { cmsRoutePath, isAppOwned, pageForPath, pagePath } from "./pages";
import { isContentGatedPath } from "./teachings";

/**
 * Where the middleware sends a request (D-017, D-018). Next.js 15.4 can't server-render a 404 from a
 * page that calls notFound(), so pages whose existence depends on content are decided here, from
 * the list of available addresses (published pages, teachings, sacrament pages with guidance):
 * - a published CMS page's address is rewritten to the internal CMS route;
 * - a content-gated address (/our-faith/…, /sacraments/…) that isn't available goes to a path no
 *   route matches, i.e. the normal server-rendered 404;
 * - everything else is left alone (built-in routes, or no route → 404).
 *
 * @param available available addresses ("/our-church", "/our-faith/fasting"), or null when the list
 *   couldn't be loaded: then nothing is sent to the 404 and every possible CMS address is tried
 *   (those pages show "not found" themselves if there is nothing).
 * @returns the internal path to rewrite to, or null to leave the request alone.
 */
export function rewriteTarget(pathname: string, available: ReadonlySet<string> | null): string | null {
  const [locale, ...rest] = pathname.split("/").filter(Boolean);
  if (!locale || !(locales as readonly string[]).includes(locale) || rest.length === 0) return null;
  const notFound = `/${locale}/cms/not/a/page`;
  // The internal route is never addressed directly.
  if (rest[0] === "cms") return notFound;

  const requested = `/${rest.join("/")}`;
  if (isContentGatedPath(requested)) return available && !available.has(requested) ? notFound : null;

  const page = pageForPath(requested);
  if (!page || isAppOwned(page.section, page.slug)) return null;
  const path = pagePath(page.section, page.slug);
  if (!path || (available && !available.has(path))) return null;
  return cmsRoutePath(locale, page.section, page.slug);
}

/** How long the middleware keeps the address list (newly published content appears within this). */
export const PATHS_TTL_MS = 30_000;
export const PATHS_ENDPOINT = "/api/site/paths";

let cached: { paths: Set<string>; expires: number } | null = null;
let loading: Promise<Set<string> | null> | null = null;

/**
 * Available addresses, fetched from this app's own endpoint and kept in memory for 30 s.
 * On failure the last known list is used (or null if there is none yet).
 */
export async function availablePaths(origin: string, now = Date.now()): Promise<Set<string> | null> {
  if (cached && cached.expires > now) return cached.paths;
  loading ??= fetch(`${origin}${PATHS_ENDPOINT}`, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`status ${res.status}`);
      const { paths } = (await res.json()) as { paths: string[] };
      cached = { paths: new Set(paths), expires: Date.now() + PATHS_TTL_MS };
      return cached.paths;
    })
    .catch(() => cached?.paths ?? null)
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Test helper: forget the cached list. */
export function resetPathsCache() {
  cached = null;
  loading = null;
}
