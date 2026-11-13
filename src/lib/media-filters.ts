import type { Audio, Video } from "../payload-types";
import { stockholmDate } from "./ethiopian-calendar";
import { parseVideoUrl, type VideoRef } from "./video";

/** Video categories in display order, with their message keys. */
export const VIDEO_CATEGORIES: { value: Video["category"]; key: "sermon" | "liturgy" | "event" | "sundaySchool" }[] = [
  { value: "sermon", key: "sermon" },
  { value: "liturgy", key: "liturgy" },
  { value: "event", key: "event" },
  { value: "sunday-school", key: "sundaySchool" },
];

export type VideoFilter = { category: Video["category"] | null; year: number | null };
export type PlayableVideo = { video: Video; ref: VideoRef | null; audio: (Audio & { url: string }) | null };

/** Entries that can be played: an uploaded recording (audio entries) or a supported video link. */
export function playable(videos: Video[]): PlayableVideo[] {
  return videos.flatMap((video) => {
    const audio = video.kind === "audio" && video.audio && typeof video.audio === "object" && video.audio.url ? (video.audio as Audio & { url: string }) : null;
    const ref = parseVideoUrl(video.url);
    return audio || ref ? [{ video, ref, audio }] : [];
  });
}

const yearOf = (video: Video) => stockholmDate(video.date).year;

/**
 * Applies the ?category= and ?year= filters (unknown values are ignored) and lists the categories
 * and years that have entries, newest year first, to offer as filters.
 */
export function filterVideos(items: PlayableVideo[], query: Record<string, string | string[] | undefined>) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const categories = VIDEO_CATEGORIES.filter((c) => items.some((i) => i.video.category === c.value));
  const years = [...new Set(items.map((i) => yearOf(i.video)))].sort((a, b) => b - a);
  const category = categories.find((c) => c.value === one(query.category))?.value ?? null;
  const year = years.find((y) => String(y) === one(query.year)) ?? null;
  const filter: VideoFilter = { category, year };
  return {
    filter,
    categories,
    years,
    items: items.filter((i) => (!category || i.video.category === category) && (!year || yearOf(i.video) === year)),
  };
}

/** Galleries grouped by their Stockholm year, newest year first (for /media, D-042). */
export function byYear<T extends { date: string }>(items: T[]): { year: number; items: T[] }[] {
  const groups = new Map<number, T[]>();
  for (const item of items) {
    const year = stockholmDate(item.date).year;
    groups.set(year, [...(groups.get(year) ?? []), item]);
  }
  return [...groups.entries()].sort(([a], [b]) => b - a).map(([year, list]) => ({ year, items: list }));
}
