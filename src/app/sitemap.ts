import type { MetadataRoute } from "next";

import { getPublishedClergy } from "@/lib/cms/clergy";
import { getLayoutData } from "@/lib/cms/layout";
import { getAvailablePaths } from "@/lib/cms/pages";
import { indexedLocales, siteOrigin } from "@/lib/seo";

/** Read from the database when requested (never at build time); the data itself is cached. */
export const dynamic = "force-dynamic";

/** Built-in pages that always exist. */
const ALWAYS = ["", "/worship/calendar", "/visit"];

/**
 * sitemap.xml (spec Phase 1 task 8): every page that exists, in each indexed language (Swedish
 * once it is public), with the other languages as alternates. Pages that only exist with content
 * come from the same list the middleware uses (D-017), so the sitemap never lists a 404.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ settings }, available, clergy] = await Promise.all([
    getLayoutData("am"),
    getAvailablePaths(),
    getPublishedClergy("am"),
  ]);
  const origin = siteOrigin();
  const locales = indexedLocales(settings);
  const paths = [...new Set([...ALWAYS, ...(clergy.length ? ["/our-church/clergy"] : []), ...available])].sort();

  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${origin}/${locale}${path}`,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${origin}/${l}${path}`])) },
    })),
  );
}
