import config from "@payload-config";
import type { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { CACHE_TAGS } from "../../hooks/revalidate";
import { LAYOUT_TAG } from "../../hooks/revalidateLayout";
import type { Department, Gallery, Post, Video } from "../../payload-types";

/**
 * Public content for the Sunday School, News and Media pages, one language at a time, read as the
 * public and cached; refreshed when the collection (or an image: LAYOUT_TAG) changes. depth 1
 * populates images, but only those that may be shown publicly.
 */
const cached = <T>(key: string, tag: string, locale: Locale, load: () => Promise<T>) =>
  unstable_cache(load, [key, locale], { tags: [tag, LAYOUT_TAG], revalidate: 300 })();

const read = (locale: Locale) => ({ locale, overrideAccess: false, depth: 1 }) as const;

export const getDepartments = (locale: Locale): Promise<Department[]> =>
  cached("departments", CACHE_TAGS.departments, locale, async () => {
    const payload = await getPayload({ config });
    return (await payload.find({ collection: "departments", ...read(locale), pagination: false, sort: "order" })).docs;
  });

/** The newest published posts first (up to 100). */
export const getPosts = (locale: Locale): Promise<Post[]> =>
  cached("posts", CACHE_TAGS.posts, locale, async () => {
    const payload = await getPayload({ config });
    return (await payload.find({ collection: "posts", ...read(locale), limit: 100, sort: "-publishedAt" })).docs;
  });

/** Published galleries, newest first. */
export const getGalleries = (locale: Locale): Promise<Gallery[]> =>
  cached("galleries", CACHE_TAGS.galleries, locale, async () => {
    const payload = await getPayload({ config });
    return (await payload.find({ collection: "galleries", ...read(locale), pagination: false, sort: "-date" })).docs;
  });

/** Videos and recordings, newest first (up to 100). */
export const getVideos = (locale: Locale): Promise<Video[]> =>
  cached("videos", CACHE_TAGS.videos, locale, async () => {
    const payload = await getPayload({ config });
    return (await payload.find({ collection: "videos", ...read(locale), depth: 0, limit: 100, sort: "-date" })).docs;
  });
