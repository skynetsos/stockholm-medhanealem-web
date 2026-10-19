import { HOME_SECTIONS } from "../globals/Homepage";
import type { Announcement, Event, Homepage } from "../payload-types";
import { gregorianToJdn, jdnToGregorian, stockholmDate } from "./ethiopian-calendar";
import { expandEvents, nextScheduled, type Occurrence } from "./events/expand";

export type HomeSection = (typeof HOME_SECTIONS)[number]["value"];

/** Event types offered as the "next service" (a time is required, so all-day events are skipped). */
export const SERVICE_TYPES: readonly Event["type"][] = ["weekly_service", "monthly_feast", "annual_feast"];
/** Event types listed as upcoming holy days when the editors haven't picked any. */
export const HOLY_DAY_TYPES: readonly Event["type"][] = ["annual_feast", "fast"];
export const HOLY_DAYS_LIMIT = 5;

/**
 * Sections in the editors' order, each once. A home page that was never saved uses the default
 * order; an empty list (every row removed) shows no sections.
 */
export function sectionOrder(homepage: Pick<Homepage, "sections">): HomeSection[] {
  const known = new Set<string>(HOME_SECTIONS.map((s) => s.value));
  const rows = homepage.sections ?? HOME_SECTIONS.map((s) => ({ section: s.value }));
  const seen = new Set<string>();
  return rows
    .map((row) => row.section as string)
    .filter((section) => known.has(section) && !seen.has(section) && seen.add(section)) as HomeSection[];
}

/** Visible to the public right now (the API filters too; cached copies can be up to 5 minutes old). */
export function isLive(announcement: Pick<Announcement, "publishAt" | "expiresAt">, now: Date): boolean {
  const t = now.getTime();
  return (
    new Date(announcement.publishAt).getTime() <= t &&
    (!announcement.expiresAt || new Date(announcement.expiresAt).getTime() > t)
  );
}

const byPinnedThenNewest = (a: Announcement, b: Announcement) =>
  Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.publishAt.localeCompare(a.publishAt);

/** Urgent announcements for the bar at the top of every page, newest first. */
export function urgentAnnouncements(list: Announcement[], now: Date): Announcement[] {
  return list.filter((a) => a.urgent && isLive(a, now)).sort((a, b) => b.publishAt.localeCompare(a.publishAt));
}

/** The home page notice: pinned first, then the newest. Urgent ones are already in the bar. */
export function latestNotice(list: Announcement[], now: Date): Announcement | null {
  return list.filter((a) => !a.urgent && isLive(a, now)).sort(byPinnedThenNewest)[0] ?? null;
}

/** The next service still to come or in progress, within 60 days. */
export function nextService(events: Event[], now: Date): (Occurrence & { event: Event }) | null {
  return nextScheduled(
    events.filter((e) => SERVICE_TYPES.includes(e.type) && !e.allDay),
    now,
  );
}

/**
 * Upcoming holy days (up to 5, each event once, at its next date within a year): the events the
 * editors picked on the Home page, or else featured events and annual feasts/fasts. Cancelled
 * dates stay in the list, marked, so people know.
 */
export function upcomingHolyDays(
  events: Event[],
  featuredIds: number[],
  now: Date,
  limit = HOLY_DAYS_LIMIT,
): (Occurrence & { event: Event })[] {
  const picked = featuredIds.length
    ? events.filter((e) => featuredIds.includes(e.id))
    : events.filter((e) => e.featured || HOLY_DAY_TYPES.includes(e.type));
  const from = stockholmDate(now);
  const to = jdnToGregorian(gregorianToJdn(from) + 365);
  const today = gregorianToJdn(from);
  const nowIso = now.toISOString();

  const seen = new Set<number>();
  return expandEvents(picked, { from, to })
    .filter((o) => (o.allDay ? gregorianToJdn(o.endDate) >= today : (o.end ?? o.start) >= nowIso))
    .filter((o) => !seen.has(o.event.id) && seen.add(o.event.id))
    .slice(0, limit);
}
