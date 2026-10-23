import { afterEach, describe, expect, it } from "vitest";

import { mediaSource, publicMedia, toSitePath } from "../../src/lib/media";
import type { Media } from "../../src/payload-types";

const base = {
  id: 1,
  alt: "Church front",
  permissionObtained: true,
  url: "http://localhost:3000/api/media/file/front.png",
  width: 1800,
  height: 1000,
  updatedAt: "",
  createdAt: "",
  sizes: {
    thumbnail: { url: "http://localhost:3000/api/media/file/front-400x222.png", width: 400, height: 222 },
    card: { url: "http://localhost:3000/api/media/file/front-800x444.png", width: 800, height: 444 },
    hero: { url: "http://localhost:3000/api/media/file/front-1600x889.png", width: 1600, height: 889 },
  },
} as Media;

const originalUrl = process.env.NEXT_PUBLIC_SERVER_URL;
afterEach(() => {
  process.env.NEXT_PUBLIC_SERVER_URL = originalUrl;
});

describe("publicMedia", () => {
  it("accepts only populated images with publication permission", () => {
    expect(publicMedia(base)).toBe(base);
    expect(publicMedia({ ...base, permissionObtained: false })).toBeNull();
    expect(publicMedia(1)).toBeNull();
    expect(publicMedia(null)).toBeNull();
  });

  it("hides an image that has no alt text in this language (WCAG 1.1.1)", () => {
    expect(publicMedia({ ...base, alt: "" })).toBeNull();
    expect(publicMedia({ ...base, alt: "   " })).toBeNull();
    expect(publicMedia({ ...base, alt: null as unknown as string })).toBeNull();
  });
});

describe("toSitePath", () => {
  it("makes our own file URLs relative and leaves others alone", () => {
    process.env.NEXT_PUBLIC_SERVER_URL = "http://localhost:3000";
    expect(toSitePath("http://localhost:3000/api/media/file/a.png")).toBe("/api/media/file/a.png");
    expect(toSitePath("/api/media/file/a.png?x=1")).toBe("/api/media/file/a.png?x=1");
    expect(toSitePath("https://cdn.example.org/a.png")).toBe("https://cdn.example.org/a.png");
  });
});

describe("mediaSource", () => {
  it("picks the smallest size that is wide enough", () => {
    process.env.NEXT_PUBLIC_SERVER_URL = "http://localhost:3000";
    expect(mediaSource(base, 192)).toEqual({ url: "/api/media/file/front-400x222.png", width: 400, height: 222 });
    expect(mediaSource(base, 700).width).toBe(800);
    expect(mediaSource(base, 2000)).toEqual({ url: "/api/media/file/front.png", width: 1800, height: 1000 });
  });
});
