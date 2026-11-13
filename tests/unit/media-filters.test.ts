import { describe, expect, it } from "vitest";

import { byYear, filterVideos, playable } from "../../src/lib/media-filters";
import type { Video } from "../../src/payload-types";

const video = (id: number, category: Video["category"], date: string, extra: Partial<Video> = {}) =>
  ({ id, title: `v${id}`, kind: "video", category, date, url: "https://youtu.be/dQw4w9WgXcQ", updatedAt: date, createdAt: date, ...extra }) as Video;

const items = playable([
  video(1, "sermon", "2026-03-01T00:00:00.000Z"),
  video(2, "liturgy", "2025-12-31T23:30:00.000Z"), // 1 January 2026 in Stockholm
  video(3, "sermon", "2024-05-05T10:00:00.000Z"),
  video(4, "event", "2026-01-01T10:00:00.000Z", { url: "https://example.org/not-a-video" }),
  video(5, "sermon", "2026-02-01T10:00:00.000Z", { kind: "audio", url: null, audio: { id: 9, title: "a", url: "/api/audio/file/a.mp3", mimeType: "audio/mpeg" } as never }),
]);

describe("video filters (D-042)", () => {
  it("keeps only playable entries: a supported link or an uploaded recording", () => {
    expect(items.map((i) => i.video.id)).toEqual([1, 2, 3, 5]);
    expect(items.find((i) => i.video.id === 5)!.audio?.url).toBe("/api/audio/file/a.mp3");
  });

  it("offers the categories and Stockholm years that have entries", () => {
    const { categories, years, filter } = filterVideos(items, {});
    expect(categories.map((c) => c.value)).toEqual(["sermon", "liturgy"]);
    expect(years).toEqual([2026, 2024]);
    expect(filter).toEqual({ category: null, year: null });
  });

  it("filters by category and year; ignores unknown values", () => {
    expect(filterVideos(items, { category: "sermon", year: "2026" }).items.map((i) => i.video.id)).toEqual([1, 5]);
    expect(filterVideos(items, { year: "2026" }).items.map((i) => i.video.id)).toEqual([1, 2, 5]);
    const odd = filterVideos(items, { category: "<script>", year: "1999" });
    expect(odd.filter).toEqual({ category: null, year: null });
    expect(odd.items).toHaveLength(4);
  });

  it("groups galleries by year, newest first", () => {
    expect(byYear([{ date: "2024-04-05T00:00:00.000Z" }, { date: "2026-01-02T00:00:00.000Z" }, { date: "2024-09-06T00:00:00.000Z" }]).map((g) => [g.year, g.items.length])).toEqual([
      [2026, 1],
      [2024, 2],
    ]);
  });
});
