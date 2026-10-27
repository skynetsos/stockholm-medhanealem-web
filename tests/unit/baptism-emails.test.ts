import { describe, expect, it } from "vitest";

import { applicantEmail, emailLocale, formatSchedule } from "../../src/lib/baptism/emails";

const settings = {
  churchName: "Medhanealem",
  officeEmail: "office@example.org",
  phone: "08-123 45 67",
  defaultLocation: null,
  address: { street: "Pålsbodagränd 3", postalCode: "124 66", city: "Bandhagen" },
};

describe("baptism emails (spec Phase 2 task 5)", () => {
  it("are in Amharic or English; Swedish requests get English", () => {
    expect(emailLocale("am")).toBe("am");
    expect(emailLocale("en")).toBe("en");
    expect(emailLocale("sv")).toBe("en");
    expect(emailLocale(null)).toBe("en");
  });

  it("acknowledge with the reference, what happens next and the office contact", () => {
    const mail = applicantEmail("acknowledgement", { reference: "BAP-2026-0007", locale: "en", settings });
    expect(mail.subject).toBe("Baptism request received (BAP-2026-0007)");
    expect(mail.text).toContain("Your reference is BAP-2026-0007");
    expect(mail.text).toContain("does not yet confirm a date");
    expect(mail.text).toContain("office@example.org · 08-123 45 67");
    expect(mail.text).toContain("Medhanealem");

    const am = applicantEmail("acknowledgement", { reference: "BAP-2026-0007", locale: "am", settings: { ...settings, officeEmail: null, phone: null } });
    expect(am.subject).toBe("የክርስትና ጥያቄዎ ደርሶናል (BAP-2026-0007)");
    expect(am.text).toContain("ለዚህ ኢሜይል ይመልሱ።");
  });

  it("confirm with the date and time in Stockholm and the place", () => {
    // 6 December 2026, 09:00 UTC = 10:00 in Stockholm (winter time).
    const mail = applicantEmail("confirmed", { reference: "BAP-2026-0007", locale: "en", settings, scheduledDate: "2026-12-06T09:00:00.000Z" });
    expect(mail.text).toMatch(/When: Sunday, (December 6|6 December), 2026 at 10:00/);
    expect(mail.text).toContain("Where: Pålsbodagränd 3, 124 66 Bandhagen");
    const withLocation = applicantEmail("confirmed", { reference: "X", locale: "en", settings: { ...settings, defaultLocation: "Medhanealem church hall" } });
    expect(withLocation.text).toContain("Where: Medhanealem church hall");
    expect(withLocation.text).not.toContain("When:");
  });

  it("give the Ethiopian date in Amharic", () => {
    expect(formatSchedule("2026-12-06T09:00:00.000Z", "am")).toEqual({ date: expect.stringMatching(/^ኅዳር 27 ቀን 2019 ዓ\.ም\. \(.+2026\)$/), time: "10:00" });
  });

  it("decline neutrally, with the office contact", () => {
    const mail = applicantEmail("declined", { reference: "BAP-2026-0008", locale: "en", settings });
    expect(mail.subject).toBe("Your baptism request (BAP-2026-0008)");
    expect(mail.text).toContain("cannot go ahead with baptism request BAP-2026-0008");
    expect(mail.text).toContain("office@example.org");
  });
});
