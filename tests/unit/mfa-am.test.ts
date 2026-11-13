import { describe, expect, it } from "vitest";

import { adminTranslations } from "../../src/i18n/admin";
import { mfaAmharic, mfaLanguage } from "../../src/i18n/mfa-am";

describe("Amharic MFA screens (D-044)", () => {
  it("translates every screen text, with no stray keys", () => {
    const english = Object.keys(adminTranslations.en.mfa);
    // The reset controls are on the Users screens, which Payload shows in English.
    const screenKeys = english.filter((k) => !k.startsWith("reset") && !k.startsWith("status") && k !== "recoveryRemaining");
    expect(Object.keys(mfaAmharic).sort()).toEqual(screenKeys.sort());
    expect(Object.values(mfaAmharic).every((v) => /[ሀ-፿]/.test(v!))).toBe(true);
  });

  it("follows ?lang= first, then the browser's preference between Amharic and English", () => {
    expect(mfaLanguage("am", "en-US")).toBe("am");
    expect(mfaLanguage("en", "am")).toBe("en");
    expect(mfaLanguage(null, "am-ET,am;q=0.9,en;q=0.8")).toBe("am");
    expect(mfaLanguage(null, "en-GB,en;q=0.9,am;q=0.5")).toBe("en");
    expect(mfaLanguage(null, "sv-SE,sv;q=0.9")).toBe("en");
    expect(mfaLanguage("fr", null)).toBe("en");
  });
});
