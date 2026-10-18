import { describe, expect, it } from "vitest";

import { localeAlternates } from "../../src/i18n/alternates";

describe("localeAlternates", () => {
  it("lists every locale plus x-default (Amharic) for the home page", () => {
    expect(localeAlternates("en")).toEqual({
      canonical: "/en",
      languages: { am: "/am", en: "/en", sv: "/sv", "x-default": "/am" },
    });
  });

  it("keeps the same path across locales", () => {
    expect(localeAlternates("sv", "/visit").languages).toMatchObject({
      am: "/am/visit",
      en: "/en/visit",
      "x-default": "/am/visit",
    });
  });
});
