import { describe, expect, it } from "vitest";

import { HOME_SECTIONS } from "../../src/globals/Homepage";
import { isLive, latestNotice, nextService, sectionOrder, upcomingHolyDays, urgentAnnouncements } from "../../src/lib/home";
import type { Announcement, Event } from "../../src/payload-types";

const TZ = "Europe/Stockholm" as const;
let id = 0;
const event = (data: Partial<Event> & Pick<Event, "type" | "start">): Event =>
  ({ id: ++id, title: `Event ${id}`, start_tz: TZ, updatedAt: "", createdAt: "", ...data }) as Event;
const notice = (data: Partial<Announcement>): Announcement =>
  ({ id: ++id, title: `Notice ${id}`, publishAt: "2026-10-01T08:00:00.000Z", publishAt_tz: TZ, updatedAt: "", createdAt: "", ...data }) as Announcement;

const now = new Date("2026-10-18T10:00:00.000Z"); // Sunday 12:00 in Stockholm, after Kidase

describe("sectionOrder", () => {
  it("uses the default order until the home page is saved, then the editors' order", () => {
    expect(sectionOrder({})).toEqual(HOME_SECTIONS.map((s) => s.value));
    expect(sectionOrder({ sections: [{ section: "visit" }, { section: "hero" }] })).toEqual(["visit", "hero"]);
    expect(sectionOrder({ sections: [] })).toEqual([]);
  });

  it("ignores unknown or repeated rows (e.g. the old announcement bar row)", () => {
    const rows = [{ section: "announcementBar" }, { section: "hero" }, { section: "hero" }] as { section: "hero" }[];
    expect(sectionOrder({ sections: rows })).toEqual(["hero"]);
  });
});

describe("announcements", () => {
  it("are live between show-from and hide-after", () => {
    expect(isLive(notice({ publishAt: "2026-10-18T09:00:00.000Z" }), now)).toBe(true);
    expect(isLive(notice({ publishAt: "2026-10-18T11:00:00.000Z" }), now)).toBe(false);
    expect(isLive(notice({ expiresAt: "2026-10-18T09:59:00.000Z" }), now)).toBe(false);
  });

  it("urgent ones go to the bar; the home notice is the pinned or newest other one", () => {
    const urgent = notice({ urgent: true, publishAt: "2026-10-17T08:00:00.000Z" });
    const expiredUrgent = notice({ urgent: true, expiresAt: "2026-10-02T00:00:00.000Z" });
    const older = notice({ publishAt: "2026-10-10T08:00:00.000Z" });
    const newer = notice({ publishAt: "2026-10-15T08:00:00.000Z" });
    const pinned = notice({ publishAt: "2026-10-05T08:00:00.000Z", pinned: true });

    expect(urgentAnnouncements([urgent, expiredUrgent, newer], now)).toEqual([urgent]);
    expect(latestNotice([urgent, older, newer], now)).toBe(newer);
    expect(latestNotice([urgent, older, newer, pinned], now)).toBe(pinned);
    expect(latestNotice([urgent], now)).toBeNull();
  });
});

// Weekly Kidase Sunday 08:00–11:30 from 4 Oct 2026.
const kidase = event({
  type: "weekly_service",
  start: "2026-10-04T06:00:00.000Z",
  end: "2026-10-04T09:30:00.000Z",
  recurrence: { frequency: "weekly" },
});

describe("nextService", () => {
  it("is the next timed service, skipping cancelled dates, all-day events and other types", () => {
    const cancelledNext = {
      ...kidase,
      overrides: [{ date: "2026-10-24T22:00:00.000Z", date_tz: TZ, action: "cancel" as const }],
    };
    const allDayFeast = event({ type: "annual_feast", start: "2026-10-19T22:00:00.000Z", allDay: true });
    const concert = event({ type: "special", start: "2026-10-19T16:00:00.000Z" });
    const result = nextService([cancelledNext, allDayFeast, concert], now);
    expect(result?.event.id).toBe(kidase.id);
    expect(result?.date).toEqual({ year: 2026, month: 11, day: 1 });
  });

  it("is null when nothing is scheduled", () => {
    expect(nextService([], now)).toBeNull();
  });
});

describe("upcomingHolyDays", () => {
  const timket = event({ type: "annual_feast", start: "2027-01-18T23:00:00.000Z", allDay: true, recurrence: { frequency: "yearly" } });
  const tsome = event({ type: "fast", start: "2026-11-24T23:00:00.000Z", end: "2027-01-05T23:00:00.000Z", allDay: true });
  const monthly = event({ type: "monthly_feast", start: "2026-10-07T07:00:00.000Z", recurrence: { frequency: "monthly", ethiopianDay: 27 } });
  const featuredSpecial = event({ type: "special", start: "2026-12-05T10:00:00.000Z", featured: true });

  it("lists feasts, fasts and featured events by date, each once", () => {
    const list = upcomingHolyDays([kidase, timket, tsome, monthly, featuredSpecial], [], now);
    expect(list.map((o) => o.event.id)).toEqual([tsome.id, featuredSpecial.id, timket.id]);
  });

  it("uses the editors' picks when set, and stops at five", () => {
    expect(upcomingHolyDays([kidase, timket, monthly], [monthly.id], now).map((o) => o.event.id)).toEqual([monthly.id]);
    const many = Array.from({ length: 7 }, (_, i) =>
      event({ type: "annual_feast", start: `2026-11-${String(10 + i).padStart(2, "0")}T10:00:00.000Z` }),
    );
    expect(upcomingHolyDays(many, [], now)).toHaveLength(5);
  });

  it("keeps a fast that is under way", () => {
    expect(upcomingHolyDays([tsome], [], new Date("2026-12-20T12:00:00.000Z")).map((o) => o.event.id)).toEqual([tsome.id]);
  });
});
