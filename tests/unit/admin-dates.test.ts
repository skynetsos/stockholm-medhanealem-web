import { describe, expect, it } from "vitest";

import { ethiopianDateLabel, stockholmDateTimeLabel } from "../../src/lib/admin-dates";

describe("admin date labels (D-032)", () => {
  it("show Stockholm time", () => {
    // 09:00 UTC in December = 10:00 in Stockholm; 08:00 UTC in June = 10:00 (summer time).
    expect(stockholmDateTimeLabel("2026-12-06T09:00:00.000Z")).toMatch(/Sun.*6 Dec 2026.*10:00/);
    expect(stockholmDateTimeLabel("2026-06-07T08:00:00.000Z")).toMatch(/Sun.*7 Jun 2026.*10:00/);
  });

  it("give the Ethiopian date of the Stockholm day, in Amharic and English", () => {
    expect(ethiopianDateLabel("2026-12-06T09:00:00.000Z")).toBe("ኅዳር 27 ቀን 2019 ዓ.ም. (Hidar 27, 2019 E.C.)");
    // 23:30 UTC on 10 September 2026 is already 11 September (Meskerem 1) in Stockholm.
    expect(ethiopianDateLabel("2026-09-10T23:30:00.000Z")).toMatch(/^መስከረም 1 ቀን 2019/);
  });
});
