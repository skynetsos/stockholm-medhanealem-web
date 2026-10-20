import config from "@payload-config";
import type { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { CACHE_TAGS } from "../../hooks/revalidate";
import { LAYOUT_TAG } from "../../hooks/revalidateLayout";
import type { Page } from "../../payload-types";
import { sectionPaths, worshipPaths } from "../content-paths";
import { hasDepartmentContent } from "../departments";
import { publicMedia } from "../media";
import { pagePath } from "../pages";
import { teachingPaths } from "../teachings";
import { routing } from "../../i18n/routing";
import { getActiveEvents } from "./events";

/**
 * Addresses that exist because of published content, the same in every language (D-010): CMS pages
 * ("/our-church", "/privacy"), faith teachings ("/our-faith/fasting") and the sacrament pages that
 * have guidance ("/sacraments/baptism"), worship lists with events and the livestream page when a
 * livestream link is set, and the Sunday School, News and Media pages with content. Read by the
 * middleware through /api/site/paths (D-017–D-020); refreshed when that content is saved.
 */
export function getAvailablePaths(): Promise<string[]> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      // The public sees published pages and teachings only.
      const read = { overrideAccess: false, depth: 0, pagination: false } as const;
      const [pages, teachings, events, settings, departments, posts, galleries, videos] = await Promise.all([
        payload.find({ collection: "pages", ...read, select: { section: true, slug: true } }),
        payload.find({ collection: "teachings", ...read, select: { category: true, slug: true } }),
        // Event types aren't translated, so any language's list will do.
        getActiveEvents(routing.defaultLocale),
        payload.findGlobal({ slug: "site-settings", overrideAccess: false, depth: 0 }),
        // Text is translated; whether a department has any shows in the default language (fallback).
        payload.find({ collection: "departments", ...read, select: { slug: true, summary: true, body: true } }),
        payload.find({ collection: "posts", ...read, select: { slug: true } }),
        // depth 1: only images that may be shown publicly are populated.
        payload.find({ collection: "galleries", overrideAccess: false, depth: 1, pagination: false, select: { slug: true, images: true } }),
        payload.count({ collection: "videos", overrideAccess: false }),
      ]);
      const pagePaths = pages.docs.map((p) => pagePath(p.section, p.slug)).filter((p): p is string => Boolean(p));
      return [
        ...new Set([
          ...pagePaths,
          ...teachingPaths(teachings.docs, pagePaths.includes("/our-faith")),
          ...worshipPaths(events, settings.livestreamUrl),
          ...sectionPaths({
            hasSundaySchoolIntro: pagePaths.includes("/sunday-school"),
            departments: departments.docs.map((d) => ({ slug: d.slug, hasContent: hasDepartmentContent(d) })),
            posts: posts.docs,
            galleries: galleries.docs.map((g) => ({ slug: g.slug, hasPublicImage: (g.images ?? []).some((i) => publicMedia(i)) })),
            hasVideos: videos.totalDocs > 0,
          }),
        ]),
      ];
    },
    ["available-paths"],
    {
      tags: [
        CACHE_TAGS.pages,
        CACHE_TAGS.teachings,
        CACHE_TAGS.events,
        CACHE_TAGS.departments,
        CACHE_TAGS.posts,
        CACHE_TAGS.galleries,
        CACHE_TAGS.videos,
        LAYOUT_TAG,
      ],
      revalidate: 300,
    },
  )();
}

/**
 * A published page in one language (missing translations fall back to Amharic), or null.
 * depth 1 populates images, button links and links inside rich text.
 */
export function getPage(locale: Locale, section: string, slug: string): Promise<Page | null> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config });
      const result = await payload.find({
        collection: "pages",
        locale,
        overrideAccess: false,
        depth: 1,
        limit: 1,
        where: { and: [{ section: { equals: section } }, { slug: { equals: slug } }] },
      });
      return result.docs[0] ?? null;
    },
    ["page", locale, section, slug],
    // Images (publication permission) refresh through the layout tag.
    { tags: [CACHE_TAGS.pages, LAYOUT_TAG], revalidate: 300 },
  )();
}
