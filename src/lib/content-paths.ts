import type { EventType } from "../collections/shared/eventTypes";
import { SACRAMENT_PAGES } from "./teachings";

/**
 * Site addresses whose page exists only when there is content for it. The middleware sends these to
 * the 404 when they aren't in the list of available addresses (D-017, D-018, D-019). No server-only
 * imports: the middleware uses this.
 */

/** The baptism request form (Phase 2 task 4). */
export const BAPTISM_REQUEST_PATH = "/sacraments/baptism/request";

/** The request form exists while requests are open and the baptism page itself exists (D-029). */
export const baptismRequestPaths = (paths: readonly string[], requestsOpen: boolean | null | undefined) =>
  requestsOpen && paths.includes("/sacraments/baptism") ? [BAPTISM_REQUEST_PATH] : [];

/** Sunday School registration (Phase 2 task 7); "join" can't be a department's address. */
export const SUNDAY_SCHOOL_JOIN_PATH = "/sunday-school/join";
export const RESERVED_DEPARTMENT_SLUGS = ["join"] as const;

/** Worship list pages and the event types each one shows. */
export const WORSHIP_LISTS = {
  weekly: ["weekly_service"],
  "monthly-feasts": ["monthly_feast"],
  "annual-feasts": ["annual_feast", "fast"],
} as const satisfies Record<string, readonly EventType[]>;
export type WorshipList = keyof typeof WORSHIP_LISTS;

export function isContentGatedPath(path: string): boolean {
  const [first, second, third, ...more] = path.split("/").filter(Boolean);
  if (more.length) return false;
  if (third !== undefined) {
    if (path === BAPTISM_REQUEST_PATH) return true;
    return first === "media" && second === "galleries"; // /media/galleries/<slug>
  }
  switch (first) {
    case "our-faith":
    case "sunday-school":
    case "news":
      return true;
    case "sacraments":
      return !second || SACRAMENT_PAGES.some((s) => s.page === second);
    case "worship":
      return second === "livestream" || Object.hasOwn(WORSHIP_LISTS, second ?? "");
    case "media":
      return !second || second === "videos";
    default:
      return false;
  }
}

/** Worship addresses that exist given these events and the site's livestream link. */
export function worshipPaths(events: { type?: string | null }[], livestreamUrl: string | null | undefined): string[] {
  const types = new Set(events.map((e) => e.type));
  const paths = Object.entries(WORSHIP_LISTS)
    .filter(([, listTypes]) => listTypes.some((t) => types.has(t)))
    .map(([list]) => `/worship/${list}`);
  if (livestreamUrl?.startsWith("https://")) paths.push("/worship/livestream");
  return paths;
}

/**
 * Sunday School, News and Media addresses that exist given this content (D-020):
 * - /sunday-school (and its registration form) with an intro page or a department with text; each
 *   such department's page
 * - /news and each published post
 * - /media, each published gallery with at least one image that may be shown, /media/videos
 */
export function sectionPaths({
  hasSundaySchoolIntro,
  departments,
  posts,
  galleries,
  hasVideos,
}: {
  hasSundaySchoolIntro: boolean;
  departments: { slug: string; hasContent: boolean }[];
  posts: { slug: string }[];
  galleries: { slug: string; hasPublicImage: boolean }[];
  hasVideos: boolean;
}): string[] {
  const paths: string[] = [];
  const shownDepartments = departments.filter((d) => d.hasContent);
  // The registration form (Phase 2 task 7) belongs to the Sunday School section.
  if (hasSundaySchoolIntro || shownDepartments.length) paths.push("/sunday-school", SUNDAY_SCHOOL_JOIN_PATH);
  paths.push(...shownDepartments.map((d) => `/sunday-school/${d.slug}`));
  if (posts.length) paths.push("/news", ...posts.map((p) => `/news/${p.slug}`));
  const shownGalleries = galleries.filter((g) => g.hasPublicImage);
  paths.push(...shownGalleries.map((g) => `/media/galleries/${g.slug}`));
  if (hasVideos) paths.push("/media/videos");
  if (shownGalleries.length || hasVideos) paths.push("/media");
  return paths;
}
