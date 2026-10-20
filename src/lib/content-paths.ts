import type { EventType } from "../collections/shared/eventTypes";
import { SACRAMENT_PAGES } from "./teachings";

/**
 * Site addresses whose page exists only when there is content for it. The middleware sends these to
 * the 404 when they aren't in the list of available addresses (D-017, D-018, D-019). No server-only
 * imports: the middleware uses this.
 */

/** Worship list pages and the event types each one shows. */
export const WORSHIP_LISTS = {
  weekly: ["weekly_service"],
  "monthly-feasts": ["monthly_feast"],
  "annual-feasts": ["annual_feast", "fast"],
} as const satisfies Record<string, readonly EventType[]>;
export type WorshipList = keyof typeof WORSHIP_LISTS;

export function isContentGatedPath(path: string): boolean {
  const [first, second, ...more] = path.split("/").filter(Boolean);
  if (more.length) return false;
  if (first === "our-faith") return true;
  if (first === "sacraments") return !second || SACRAMENT_PAGES.some((s) => s.page === second);
  if (first === "worship") return second === "livestream" || Object.hasOwn(WORSHIP_LISTS, second ?? "");
  return false;
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
