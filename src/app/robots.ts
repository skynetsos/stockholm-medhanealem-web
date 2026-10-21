import type { MetadataRoute } from "next";

import { isProductionSite, siteOrigin } from "@/lib/seo";

/**
 * robots.txt (spec Phase 1 task 8): production lets search engines in (not the admin or APIs) and
 * points to the sitemap; development and staging keep them out entirely.
 */
export const dynamic = "force-dynamic"; // SITE_ENV is read when the server runs, not at build time

export default function robots(): MetadataRoute.Robots {
  if (!isProductionSite()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
