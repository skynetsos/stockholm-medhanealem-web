import { describe, expect, it } from "vitest";

import { pathExists } from "../../src/lib/cms-routing";
import { isAvailableLink } from "../../src/lib/links";

const available = ["/our-church", "/our-church/history", "/sacraments/baptism", "/worship/weekly", "/media"];

describe("pathExists (review F-02)", () => {
  it("content pages exist only with content", () => {
    expect(pathExists("/news", available)).toBe(false);
    expect(pathExists("/privacy", available)).toBe(false);
    expect(pathExists("/cookies", available)).toBe(false);
    expect(pathExists("/sacraments/baptism/request", available)).toBe(false); // requests closed (F-01)
    expect(pathExists("/our-church/clergy", available)).toBe(false); // no published profiles (F-15)
    expect(pathExists("/our-church/history", available)).toBe(true);
    expect(pathExists("/sacraments/baptism", available)).toBe(true);
    expect(pathExists("/media", available)).toBe(true);
  });

  it("the site's own pages always exist", () => {
    for (const path of ["/", "/visit", "/support", "/support/volunteer", "/worship/calendar", "/search", "/our-faith", "/sunday-school"]) {
      // /our-faith and /sunday-school are content-gated: not in this list, so they don't exist here.
      const gated = path === "/our-faith" || path === "/sunday-school";
      expect(pathExists(path, available), path).toBe(!gated);
    }
  });

  it("ignores query strings, anchors and trailing slashes", () => {
    expect(pathExists("/our-church/history/?x=1#top", available)).toBe(true);
    expect(pathExists("/news#latest", available)).toBe(false);
  });

  it("menu links: internal links need an existing page; external links are kept", () => {
    expect(isAvailableLink({ label: "News", link: { type: "internal", path: "/news" } }, available)).toBe(false);
    expect(isAvailableLink({ label: "Media", link: { type: "internal", path: "/media" } }, available)).toBe(true);
    expect(isAvailableLink({ label: "Diocese", link: { type: "external", url: "https://eotc-nordics.org/a/" } }, available)).toBe(true);
  });
});
