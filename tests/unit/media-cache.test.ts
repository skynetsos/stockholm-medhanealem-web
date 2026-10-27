import { describe, expect, it } from "vitest";

import { mediaCacheControl, PRIVATE_MEDIA_CACHE, PUBLIC_MEDIA_CACHE } from "../../src/lib/media-cache";

const file = "/api/media/file/church-image-1600x654.jpg";

describe("media Cache-Control (task 10)", () => {
  it("caches public files for a year, immutable", () => {
    expect(mediaCacheControl(file, new Headers(), 200)).toBe(PUBLIC_MEDIA_CACHE);
    expect(PUBLIC_MEDIA_CACHE).toBe("public, max-age=31536000, immutable");
    expect(mediaCacheControl(file, new Headers(), 304)).toBe(PUBLIC_MEDIA_CACHE);
  });

  it("never lets a cache store what signed-in staff see (may be private images)", () => {
    expect(mediaCacheControl(file, new Headers({ cookie: "theme=dark; payload-token=abc" }), 200)).toBe(PRIVATE_MEDIA_CACHE);
    expect(mediaCacheControl(file, new Headers({ authorization: "JWT abc" }), 200)).toBe(PRIVATE_MEDIA_CACHE);
  });

  it("leaves errors and other API routes alone", () => {
    expect(mediaCacheControl(file, new Headers(), 404)).toBeNull();
    expect(mediaCacheControl("/api/pages", new Headers(), 200)).toBeNull();
  });
});
