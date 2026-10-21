import { afterEach, describe, expect, it, vi } from "vitest";

import type { Event, SiteSetting } from "../../src/payload-types";
import { churchJsonLd, eventJsonLd, serializeJsonLd } from "../../src/lib/jsonld";
import { indexedLocales, isIndexable } from "../../src/lib/seo";

const settings = {
  id: 1,
  churchName: "Medhanealem",
  shortName: "Medhanealem Stockholm",
  address: { street: "Pålsbodagränd 3", postalCode: "124 75", city: "Bandhagen" },
  mapLocation: { latitude: 59.27, longitude: 18.05 },
  socialLinks: [{ platform: "youtube", url: "https://youtube.com/@church", id: "a" }],
  swedishPublic: false,
} as SiteSetting;

afterEach(() => vi.unstubAllEnvs());

describe("indexing rules (D-023)", () => {
  it("indexes only production, and Swedish only once it is public", () => {
    vi.stubEnv("SITE_ENV", "staging");
    expect(isIndexable("am", settings)).toBe(false);
    vi.stubEnv("SITE_ENV", "production");
    expect(isIndexable("am", settings)).toBe(true);
    expect(isIndexable("sv", settings)).toBe(false);
    expect(isIndexable("sv", { swedishPublic: true })).toBe(true);
    expect(indexedLocales(settings)).toEqual(["am", "en"]);
  });
});

describe("JSON-LD", () => {
  it("describes the church with address, position and profiles", () => {
    expect(churchJsonLd(settings, "https://medhanealem.se", "en")).toMatchObject({
      "@type": "Church",
      "@id": "https://medhanealem.se/#church",
      name: "Medhanealem",
      alternateName: "Medhanealem Stockholm",
      url: "https://medhanealem.se/en",
      address: { "@type": "PostalAddress", addressLocality: "Bandhagen", addressCountry: "SE" },
      geo: { latitude: 59.27, longitude: 18.05 },
      sameAs: ["https://youtube.com/@church"],
    });
    expect(churchJsonLd({ id: 1 } as SiteSetting, "https://x", "en")).toBeNull();
  });

  it("describes a dated service in Stockholm time, with its status", () => {
    const event = { id: 7, title: "Kidase", type: "weekly_service" } as Event;
    const d = { year: 2026, month: 10, day: 25 };
    const data = eventJsonLd(
      { event, date: d, endDate: d, seriesDate: d, start: "2026-10-25T07:00:00.000Z", end: "2026-10-25T10:30:00.000Z", allDay: false, status: "cancelled", note: null },
      settings,
      "https://medhanealem.se",
      "am",
    );
    expect(data).toMatchObject({
      "@type": "Event",
      name: "Kidase",
      startDate: "2026-10-25T08:00:00+01:00",
      endDate: "2026-10-25T11:30:00+01:00",
      eventStatus: "https://schema.org/EventCancelled",
      organizer: { "@id": "https://medhanealem.se/#church" },
    });
  });

  it("can't break out of the script tag", () => {
    expect(serializeJsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
