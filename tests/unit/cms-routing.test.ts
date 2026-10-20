import { afterEach, describe, expect, it, vi } from "vitest";

import { cmsRewriteTarget, publishedPagePaths, resetPagePathsCache } from "../../src/lib/cms-routing";
import { isAppOwned, pageForPath } from "../../src/lib/pages";
import { richTextLinkHref } from "../../src/lib/richtext";

const published = new Set(["/our-church", "/our-church/history", "/privacy", "/worship"]);

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

describe("cmsRewriteTarget", () => {
  it("rewrites published page addresses to the internal CMS route", () => {
    expect(cmsRewriteTarget("/en/our-church", published)).toBe("/en/cms/our-church/index");
    expect(cmsRewriteTarget("/am/our-church/history", published)).toBe("/am/cms/our-church/history");
    expect(cmsRewriteTarget("/sv/privacy", published)).toBe("/sv/cms/other/privacy");
  });

  it("leaves unknown, unpublished and built-in addresses alone (normal routing / 404)", () => {
    expect(cmsRewriteTarget("/en/our-church/draft-only", published)).toBeNull();
    expect(cmsRewriteTarget("/en/nope", published)).toBeNull();
    expect(cmsRewriteTarget("/en/our-church/clergy", published)).toBeNull();
    expect(cmsRewriteTarget("/en/news", published)).toBeNull();
    expect(cmsRewriteTarget("/en", published)).toBeNull();
    expect(cmsRewriteTarget("/de/privacy", published)).toBeNull();
    expect(cmsRewriteTarget("/en/a/b/c", published)).toBeNull();
  });

  it("never serves the internal route directly", () => {
    expect(cmsRewriteTarget("/en/cms/other/privacy", published)).toBe("/en/cms/not/a/page");
  });

  it("without the list, tries any possible page address but never a built-in one", () => {
    expect(cmsRewriteTarget("/en/anything", null)).toBe("/en/cms/other/anything");
    expect(cmsRewriteTarget("/en/news", null)).toBeNull();
    expect(cmsRewriteTarget("/en/worship/calendar", null)).toBeNull();
  });
});

describe("publishedPagePaths", () => {
  afterEach(() => {
    resetPagePathsCache();
    vi.unstubAllGlobals();
  });

  it("caches the list, and keeps the last one when the endpoint fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ paths: ["/privacy"] })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await publishedPagePaths("http://internal")).toEqual(new Set(["/privacy"]));
    expect(await publishedPagePaths("http://internal")).toEqual(new Set(["/privacy"]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("http://internal/api/site/page-paths", { cache: "no-store" });

    fetchMock.mockRejectedValue(new Error("down"));
    expect(await publishedPagePaths("http://internal", Date.now() + 60_000)).toEqual(new Set(["/privacy"]));
  });

  it("returns null when it never got a list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    expect(await publishedPagePaths("http://internal")).toBeNull();
  });
});

describe("richTextLinkHref", () => {
  it("links to published pages in the visitor's language", () => {
    const doc = { relationTo: "pages", value: { section: "our-church", slug: "history" } };
    expect(richTextLinkHref({ linkType: "internal", doc }, "en")).toBe("/en/our-church/history");
    expect(richTextLinkHref({ linkType: "internal", doc: { relationTo: "pages", value: 12 } }, "en")).toBeNull();
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
