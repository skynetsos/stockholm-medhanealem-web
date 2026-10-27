import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/globals.css", "utf8");

const palette = Object.fromEntries(
  [...css.matchAll(/--color-([a-z]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, hex]) => [name, hex.toLowerCase()]),
);

/** WCAG 2.x relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("palette (spec §5)", () => {
  it("matches the spec values", () => {
    expect(palette).toMatchObject({
      primary: "#0b3d2e",
      gold: "#c8a24a",
      cream: "#f8f4ea",
      ink: "#1a1a1a",
      muted: "#6b6b6b",
      error: "#b42318",
    });
  });

  // Normal-size text needs 4.5:1 (WCAG 1.4.3 AA).
  it.each([
    ["ink", "cream"],
    ["ink", "white"],
    ["muted", "cream"],
    ["muted", "white"],
    ["primary", "cream"],
    ["primary", "white"],
    ["error", "cream"],
    ["error", "white"],
    ["cream", "primary"],
    ["white", "primary"],
  ])("%s text on %s is at least 4.5:1", (fg, bg) => {
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });

  // Large text and UI components need 3:1 (WCAG 1.4.3 large text, 1.4.11).
  it("gold on primary is at least 3:1 (large text, borders, icons)", () => {
    expect(contrast(palette.gold, palette.primary)).toBeGreaterThanOrEqual(3);
  });

  it("focus ring (primary) is at least 3:1 against cream and white backgrounds", () => {
    expect(contrast(palette.primary, palette.cream)).toBeGreaterThanOrEqual(3);
    expect(contrast(palette.primary, palette.white)).toBeGreaterThanOrEqual(3);
  });

  it("documents that gold is NOT usable as text on light backgrounds", () => {
    expect(contrast(palette.gold, palette.cream)).toBeLessThan(3);
  });
});

describe("fonts", () => {
  it.each([
    "public/fonts/noto-sans-ethiopic-v1.woff2",
    "public/fonts/noto-serif-ethiopic-v1.woff2",
    "src/fonts/Inter-Latin-Variable.woff2",
    "src/fonts/SourceSerif4-Latin-Variable.woff2",
  ])("%s is self-hosted with its licence", (file) => {
    const bytes = readFileSync(file);
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("wOF2");
    expect(existsSync("src/fonts/README.md")).toBe(true);
  });

  it("the Ethiopic fonts declared in the CSS are the files in public/fonts (D-025)", () => {
    for (const url of css.match(/url\("(\/fonts\/[^"]+)"\)/g) ?? []) {
      const file = url.slice(5, -2);
      expect(existsSync(`public${file}`), file).toBe(true);
    }
    expect(css.match(/url\("\/fonts\//g)).toHaveLength(2);
  });

  it("font stacks list Latin, Ethiopic, then Abyssinica SIL fallback", () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-inter\),\s*var\(--font-noto-sans-ethiopic\),\s*"Abyssinica SIL"/);
    expect(css).toMatch(/--font-serif:\s*var\(--font-source-serif\),\s*var\(--font-noto-serif-ethiopic\),\s*"Abyssinica SIL"/);
  });

  it("no third-party font CDN is referenced", () => {
    expect(css).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
  });
});
