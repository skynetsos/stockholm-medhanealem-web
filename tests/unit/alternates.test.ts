import { describe, expect, it } from "vitest";

import { buildAlternates } from "../../src/i18n/build-alternates";

describe("buildAlternates", () => {
  it("lists the public languages plus x-default (Amharic) for the home page", () => {
    expect(buildAlternates("en", "", ["am", "en"])).toEqual({
      canonical: "/en",
      languages: { am: "/am", en: "/en", "x-default": "/am" },
    });
  });

  it("offers Swedish only once it is public (review F-17), with the same path in every language", () => {
    expect(buildAlternates("sv", "/visit", ["am", "en", "sv"]).languages).toEqual({
      am: "/am/visit",
      en: "/en/visit",
      sv: "/sv/visit",
      "x-default": "/am/visit",
    });
  });
});
