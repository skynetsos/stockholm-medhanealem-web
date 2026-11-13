import { describe, expect, it } from "vitest";

import { fallbackLang } from "../../src/lib/lang";

describe("fallbackLang (WCAG 3.1.2, D-044)", () => {
  it("marks Amharic text on English and Swedish pages", () => {
    expect(fallbackLang("የሰንበት ቅዳሴ", "en")).toBe("am");
    expect(fallbackLang("ሥርዓተ ቅዳሴ ዘጥቅምት 29/2019 ዓ.ም", "sv")).toBe("am");
    expect(fallbackLang({ root: { children: [{ type: "paragraph", children: [{ type: "text", text: "ጾመ ፍልሰታ" }] }] } }, "en")).toBe("am");
  });

  it("leaves translated text, Amharic pages and mixed text with a few Ethiopic words alone", () => {
    expect(fallbackLang("Sunday Kidase", "en")).toBeUndefined();
    expect(fallbackLang("የሰንበት ቅዳሴ", "am")).toBeUndefined();
    expect(fallbackLang("The feast of Timket (ጥምቀት) is celebrated in January", "en")).toBeUndefined();
    expect(fallbackLang("2026", "en")).toBeUndefined();
    expect(fallbackLang(null, "en")).toBeUndefined();
  });
});
