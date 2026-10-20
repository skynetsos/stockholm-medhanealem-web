import { afterEach, describe, expect, it, vi } from "vitest";

import { availablePaths, resetPathsCache, rewriteTarget } from "../../src/lib/cms-routing";
import { isAppOwned, pageForPath } from "../../src/lib/pages";
import { richTextLinkHref } from "../../src/lib/richtext";
import { isContentGatedPath, teachingPath, teachingPaths } from "../../src/lib/teachings";

const published = new Set(["/our-church", "/our-church/history", "/privacy", "/worship", "/our-faith", "/our-faith/fasting", "/sacraments", "/sacraments/baptism"]);

describe("pageForPath / isAppOwned", () => {
  it("maps addresses to a section and slug", () => {
    expect(pageForPath("/our-church")).toEqual({ section: "our-church", slug: "index" });
    expect(pageForPath("/our-church/history")).toEqual({ section: "our-church", slug: "history" });
    expect(pageForPath("/privacy")).toEqual({ section: "other", slug: "privacy" });
    expect(pageForPath("/privacy/extra")).toBeNull();
    expect(pageForPath("/a/b/c")).toBeNull();
  });

  it("knows which addresses the site's own routes serve", () => {
    expect(isAppOwned("our-church", "clergy")).toBe(true);
    expect(isAppOwned("our-faith", "fasting")).toBe(true);
    expect(isAppOwned("our-faith", "index")).toBe(false);
    expect(isAppOwned("worship", "calendar")).toBe(true);
    expect(isAppOwned("other", "news")).toBe(true);
    expect(isAppOwned("other", "privacy")).toBe(false);
  });
});

describe("rewriteTarget", () => {
  it("rewrites published page addresses to the internal CMS route", () => {
    expect(rewriteTarget("/en/our-church", published)).toBe("/en/cms/our-church/index");
    expect(rewriteTarget("/am/our-church/history", published)).toBe("/am/cms/our-church/history");
    expect(rewriteTarget("/sv/privacy", published)).toBe("/sv/cms/other/privacy");
  });

  it("leaves unknown, unpublished and built-in addresses alone (normal routing / 404)", () => {
    expect(rewriteTarget("/en/our-church/draft-only", published)).toBeNull();
    expect(rewriteTarget("/en/nope", published)).toBeNull();
    expect(rewriteTarget("/en/our-church/clergy", published)).toBeNull();
    expect(rewriteTarget("/en/news", published)).toBeNull();
    expect(rewriteTarget("/en", published)).toBeNull();
    expect(rewriteTarget("/de/privacy", published)).toBeNull();
    expect(rewriteTarget("/en/a/b/c", published)).toBeNull();
  });

  it("never serves the internal route directly", () => {
    expect(rewriteTarget("/en/cms/other/privacy", published)).toBe("/en/cms/not/a/page");
  });

  it("without the list, tries any possible page address but never a built-in one", () => {
    expect(rewriteTarget("/en/anything", null)).toBe("/en/cms/other/anything");
    expect(rewriteTarget("/en/news", null)).toBeNull();
    expect(rewriteTarget("/en/worship/calendar", null)).toBeNull();
  });
});

describe("teachings and sacraments (D-018)", () => {
  it("serve available addresses through their own routes and send the rest to the 404", () => {
    expect(rewriteTarget("/en/our-faith", published)).toBeNull();
    expect(rewriteTarget("/en/our-faith/fasting", published)).toBeNull();
    expect(rewriteTarget("/en/our-faith/unknown", published)).toBe("/en/cms/not/a/page");
    expect(rewriteTarget("/en/sacraments/baptism", published)).toBeNull();
    expect(rewriteTarget("/en/sacraments/marriage", published)).toBe("/en/cms/not/a/page");
    expect(rewriteTarget("/en/sacraments/other", published)).toBeNull(); // no such route → 404 anyway
    expect(rewriteTarget("/en/our-faith", new Set())).toBe("/en/cms/not/a/page");
    expect(rewriteTarget("/en/our-faith/unknown", null)).toBeNull(); // list unavailable: let the page decide
  });

  it("know where each category lives and which addresses its teachings create", () => {
    expect(teachingPath("fasting", "lent")).toBe("/our-faith/lent");
    expect(teachingPath("christening", "godparents")).toBe("/sacraments/baptism#godparents");
    expect(isContentGatedPath("/our-faith/a/b")).toBe(false);
    expect(teachingPaths([{ category: "christening", slug: "godparents" }, { category: "faq", slug: "q" }], false).sort()).toEqual(
      ["/our-faith", "/our-faith/q", "/sacraments", "/sacraments/baptism"].sort(),
    );
    expect(teachingPaths([], true)).toEqual(["/our-faith"]);
  });
});

describe("availablePaths", () => {
  afterEach(() => {
    resetPathsCache();
    vi.unstubAllGlobals();
  });

  it("caches the list, and keeps the last one when the endpoint fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ paths: ["/privacy"] })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await availablePaths("http://internal")).toEqual(new Set(["/privacy"]));
    expect(await availablePaths("http://internal")).toEqual(new Set(["/privacy"]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("http://internal/api/site/paths", { cache: "no-store" });

    fetchMock.mockRejectedValue(new Error("down"));
    expect(await availablePaths("http://internal", Date.now() + 60_000)).toEqual(new Set(["/privacy"]));
  });

  it("returns null when it never got a list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    expect(await availablePaths("http://internal")).toBeNull();
  });
});

describe("richTextLinkHref", () => {
  it("links to published pages in the visitor's language", () => {
    const doc = { relationTo: "pages", value: { section: "our-church", slug: "history" } };
    expect(richTextLinkHref({ linkType: "internal", doc }, "en")).toBe("/en/our-church/history");
    expect(richTextLinkHref({ linkType: "internal", doc: { relationTo: "pages", value: 12 } }, "en")).toBeNull();
    const teaching = { relationTo: "teachings", value: { category: "christening", slug: "godparents" } };
    expect(richTextLinkHref({ linkType: "internal", doc: teaching }, "am")).toBe("/am/sacraments/baptism#godparents");
  });

  it("prefixes site paths and drops unsafe URLs", () => {
    expect(richTextLinkHref({ url: "/visit" }, "am")).toBe("/am/visit");
    expect(richTextLinkHref({ url: "/en/visit" }, "am")).toBe("/en/visit");
    expect(richTextLinkHref({ url: "https://eotc-nordics.org" }, "am")).toBe("https://eotc-nordics.org");
    expect(richTextLinkHref({ url: "mailto:office@example.org" }, "am")).toBe("mailto:office@example.org");
    expect(richTextLinkHref({ url: "javascript:alert(1)" }, "am")).toBeNull();
    expect(richTextLinkHref({ url: "//evil.example" }, "am")).toBeNull();
  });
});
