/** Events (spec §2.4) with per-date overrides, and Announcements (spec §2.5). */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import type { Event } from "../../src/payload-types";
import { type Actor, as, createActor } from "./helpers";

let payload: Payload;
let editor: Actor;
let clergy: Actor;
let translatorEn: Actor;

const TZ = "Europe/Stockholm";
// Sunday Kidase 08:00–11:30 Stockholm summer time (UTC+2), first on Sunday 4 Oct 2026.
const KIDASE_START = "2026-10-04T06:00:00.000Z";
const KIDASE_END = "2026-10-04T09:30:00.000Z";
/** Stockholm midnight as UTC for a winter (UTC+1) or summer (UTC+2) date. */
const stockholmMidnight = (isoDate: string, summer: boolean) =>
  new Date(`${isoDate}T00:00:00${summer ? "+02:00" : "+01:00"}`).toISOString();

async function kidase(overrides: Event["overrides"] = []) {
  return payload.create({
    collection: "events",
    ...as(editor),
    locale: "am",
    data: {
      title: "ሰንበት ቅዳሴ",
      type: "weekly_service",
      start: KIDASE_START,
      start_tz: TZ,
      end: KIDASE_END,
      end_tz: TZ,
      recurrence: { frequency: "weekly" },
      overrides,
    },
  });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  editor = await createActor(payload, "events-editor@test.local", ["editor"]);
  clergy = await createActor(payload, "events-clergy@test.local", ["clergy_approver"]);
  translatorEn = await createActor(payload, "events-translator@test.local", ["translator"], { translatorLocales: ["en"] });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("events", () => {
  it("stores UTC with the Stockholm zone and computes the Ethiopian date", async () => {
    const event = await kidase();
    expect(event.start).toBe(KIDASE_START);
    expect(event.start_tz).toBe(TZ);
    expect(event.ethiopianDate).toBe("2019-01-24"); // 4 Oct 2026 = Meskerem 24, 2019 E.C.
  });

  it("monthly and yearly rules store their Ethiopian anchor from the start date", async () => {
    const monthly = await payload.create({
      collection: "events",
      ...as(editor),
      data: { title: "Medhanealem", type: "monthly_feast", start: "2026-10-07T07:00:00.000Z", start_tz: TZ, recurrence: { frequency: "monthly" } },
    });
    expect(monthly.recurrence).toMatchObject({ frequency: "monthly", ethiopianDay: 27, ethiopianMonth: null });

    const yearly = await payload.create({
      collection: "events",
      ...as(editor),
      data: { title: "Timket", type: "annual_feast", start: "2027-01-19T08:00:00.000Z", start_tz: TZ, recurrence: { frequency: "yearly" } },
    });
    expect(yearly.recurrence).toMatchObject({ frequency: "yearly", ethiopianDay: 11, ethiopianMonth: 5 });
  });

  it("rejects an end before the start", async () => {
    await expect(
      payload.create({
        collection: "events",
        ...as(editor),
        data: { title: "x", type: "special", start: KIDASE_END, start_tz: TZ, end: KIDASE_START, end_tz: TZ },
      }),
    ).rejects.toThrow(/end must be after/);
  });
});

describe("changes to single dates (per-occurrence overrides)", () => {
  it("cancels one Sunday without touching the series", async () => {
    // Sunday 1 Nov 2026 (winter time).
    const event = await kidase([{ date: stockholmMidnight("2026-11-01", false), date_tz: TZ, action: "cancel", note: "Diocesan service in Oslo" }]);
    expect(event.overrides).toHaveLength(1);
    expect(event.recurrence?.frequency).toBe("weekly");
    expect(event.start).toBe(KIDASE_START);
    expect(event.cancelled).toBe(false);
  });

  it("works on the Sunday DST ends (25 Oct 2026)", async () => {
    await expect(kidase([{ date: stockholmMidnight("2026-10-25", true), date_tz: TZ, action: "notice", note: "Clocks go back" }])).resolves.toBeTruthy();
  });

  it("rejects a date the event does not take place on", async () => {
    await expect(
      kidase([{ date: stockholmMidnight("2026-11-02", false), date_tz: TZ, action: "cancel" }]), // a Monday
    ).rejects.toThrow(/does not take place on 2026-11-02/);
    await expect(
      kidase([{ date: stockholmMidnight("2026-09-27", true), date_tz: TZ, action: "cancel" }]), // before the series
    ).rejects.toThrow(/does not take place/);
  });

  it("allows one change per date", async () => {
    const date = stockholmMidnight("2026-11-08", false);
    await expect(
      kidase([
        { date, date_tz: TZ, action: "cancel" },
        { date, date_tz: TZ, action: "notice" },
      ]),
    ).rejects.toThrow(/already has a change/);
  });

  it("a move needs a new start, and its end after that", async () => {
    const date = stockholmMidnight("2026-11-15", false);
    await expect(kidase([{ date, date_tz: TZ, action: "move" }])).rejects.toThrow(/needs its new start/);
    await expect(
      kidase([
        { date, date_tz: TZ, action: "move", newStart: "2026-11-15T10:00:00.000Z", newStart_tz: TZ, newEnd: "2026-11-15T09:00:00.000Z", newEnd_tz: TZ },
      ]),
    ).rejects.toThrow(/new end must be after/);
    const moved = await kidase([
      { date, date_tz: TZ, action: "move", newStart: "2026-11-15T10:00:00.000Z", newStart_tz: TZ, newEnd: "2026-11-15T12:00:00.000Z", newEnd_tz: TZ },
    ]);
    expect(moved.overrides?.[0]).toMatchObject({ action: "move", newStart: "2026-11-15T10:00:00.000Z" });
  });
});

describe("event access (spec §3)", () => {
  it("the public reads events; clergy read but cannot create", async () => {
    const event = await kidase();
    const pub = await payload.find({ collection: "events", overrideAccess: false, where: { id: { equals: event.id } } });
    expect(pub.totalDocs).toBe(1);
    await expect(
      payload.create({ collection: "events", ...as(clergy), data: { title: "x", type: "special", start: KIDASE_START, start_tz: TZ } }),
    ).rejects.toThrow();
  });

  it("a translator changes text in their language but not times or overrides", async () => {
    const event = await kidase([{ date: stockholmMidnight("2026-11-22", false), date_tz: TZ, action: "notice", note: "ማስታወቂያ" }]);
    const updated = await payload.update({
      collection: "events",
      id: event.id,
      ...as(translatorEn),
      locale: "en",
      data: {
        title: "Sunday Kidase",
        start: "2026-10-04T07:00:00.000Z",
        overrides: [{ ...event.overrides![0], action: "cancel", note: "Notice" }],
      },
    });
    expect(updated.title).toBe("Sunday Kidase");
    expect(updated.start).toBe(KIDASE_START);
    expect(updated.overrides?.[0]).toMatchObject({ action: "notice", note: "Notice" });
  });
});

describe("announcements", () => {
  const now = Date.now();
  const iso = (offsetHours: number) => new Date(now + offsetHours * 3_600_000).toISOString();

  async function announce(title: string, publishAt: string, expiresAt?: string) {
    return payload.create({
      collection: "announcements",
      ...as(editor),
      data: { title, publishAt, publishAt_tz: TZ, ...(expiresAt ? { expiresAt, expiresAt_tz: TZ } : {}) },
    });
  }

  it("the public sees only announcements inside their window; staff see all", async () => {
    const current = await announce("current", iso(-1), iso(24));
    const future = await announce("future", iso(24));
    const expired = await announce("expired", iso(-48), iso(-1));
    const open = await announce("no expiry", iso(-2));

    const ids = [current.id, future.id, expired.id, open.id];
    const pub = await payload.find({ collection: "announcements", overrideAccess: false, where: { id: { in: ids } }, limit: 10 });
    expect(pub.docs.map((d) => d.title).sort()).toEqual(["current", "no expiry"]);

    const staff = await payload.find({ collection: "announcements", ...as(clergy), where: { id: { in: ids } }, limit: 10 });
    expect(staff.totalDocs).toBe(4);
  });

  it("rejects an expiry before the publish time", async () => {
    await expect(announce("bad", iso(5), iso(1))).rejects.toThrow(/expiry must be after/);
  });
});
