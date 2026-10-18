import { describe, expect, it } from "vitest";

import { validateExternalUrl, validateInternalPath } from "../../src/fields/link";
import { resolveLink } from "../../src/lib/links";

describe("internal paths", () => {
  it("accepts locale-independent site paths", () => {
    expect(validateInternalPath("/")).toBe(true);
    expect(validateInternalPath("/visit")).toBe(true);
    expect(validateInternalPath("/sunday-school/mezmur")).toBe(true);
  });

  it("rejects paths with a locale, without a leading slash, or with spaces", () => {
    expect(validateInternalPath("/en/visit")).not.toBe(true);
    expect(validateInternalPath("/am")).not.toBe(true);
    expect(validateInternalPath("visit")).not.toBe(true);
    expect(validateInternalPath("/our church")).not.toBe(true);
    expect(validateInternalPath("")).not.toBe(true);
  });
});

describe("external URLs", () => {
  it("accepts http(s) and mailto", () => {
    expect(validateExternalUrl("https://eotc-nordics.org/a/")).toBe(true);
    expect(validateExternalUrl("mailto:office@medhanealem.se")).toBe(true);
  });

  it("rejects javascript: and malformed URLs", () => {
    expect(validateExternalUrl("javascript:alert(1)")).not.toBe(true);
    expect(validateExternalUrl("eotc-nordics.org")).not.toBe(true);
  });
});

describe("resolveLink", () => {
  it("resolves valid links and hides invalid ones", () => {
    expect(resolveLink({ type: "internal", path: "/visit" })).toEqual({ kind: "internal", href: "/visit", newTab: false });
    expect(resolveLink({ type: "external", url: "https://eotc-nordics.org/a/", newTab: true })).toEqual({
      kind: "external",
      href: "https://eotc-nordics.org/a/",
      newTab: true,
    });
    expect(resolveLink({ type: "external", url: "javascript:alert(1)" })).toBeNull();
    expect(resolveLink({ type: "internal", path: null })).toBeNull();
    expect(resolveLink(null)).toBeNull();
  });
});
