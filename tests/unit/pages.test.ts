import { describe, expect, it } from "vitest";

import { resolveLink } from "../../src/lib/links";
import { pagePath, validateSlugFormat } from "../../src/lib/pages";
import { parseVideoUrl } from "../../src/lib/video";

describe("pagePath", () => {
  it("puts section pages under their section and 'index' at the section root", () => {
    expect(pagePath("our-church", "history")).toBe("/our-church/history");
    expect(pagePath("our-church", "index")).toBe("/our-church");
    expect(pagePath("support", "volunteer")).toBe("/support/volunteer");
  });

  it("puts 'other' pages at the top level and rejects unknown input", () => {
    expect(pagePath("other", "privacy")).toBe("/privacy");
    expect(pagePath("other", "index")).toBeNull();
    expect(pagePath("nonsense", "x")).toBeNull();
    expect(pagePath("our-church", "Bad Slug")).toBeNull();
    expect(pagePath("our-church", null)).toBeNull();
  });
});

describe("validateSlugFormat", () => {
  it("accepts lowercase kebab-case only", () => {
    expect(validateSlugFormat("our-history-2026")).toBe(true);
    for (const bad of ["", "History", "two  spaces", "trailing-", "-leading", "a--b", "ታሪክ", "ä"]) {
      expect(validateSlugFormat(bad), bad).not.toBe(true);
    }
  });
});

describe("resolveLink with page links", () => {
  it("resolves a populated (published) page and hides an unpopulated one", () => {
    expect(resolveLink({ type: "page", page: { section: "our-church", slug: "history" } })).toEqual({
      kind: "internal",
      href: "/our-church/history",
      newTab: false,
    });
    expect(resolveLink({ type: "page", page: 42 })).toBeNull();
    expect(resolveLink({ type: "page", page: null })).toBeNull();
  });

  it("still treats links without a type as site paths (data saved before page links existed)", () => {
    expect(resolveLink({ path: "/visit" })).toEqual({ kind: "internal", href: "/visit", newTab: false });
  });
});

describe("parseVideoUrl", () => {
  it("recognises YouTube and Vimeo links", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(parseVideoUrl("https://www.youtube.com/live/dQw4w9WgXcQ")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(parseVideoUrl("https://vimeo.com/123456789")).toEqual({ provider: "vimeo", id: "123456789" });
  });

  it("rejects other hosts, http and malformed input", () => {
    for (const bad of [
      "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://evil.example/watch?v=dQw4w9WgXcQ",
      "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=short",
      "javascript:alert(1)",
      "",
    ]) {
      expect(parseVideoUrl(bad), bad).toBeNull();
    }
  });
});
