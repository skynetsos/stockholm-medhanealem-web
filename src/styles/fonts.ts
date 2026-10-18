import localFont from "next/font/local";

// Self-hosted variable fonts (see src/fonts/README.md). Each exposes a CSS variable that the
// Tailwind font stacks in globals.css combine, so Ethiopic and Latin text each get their own font.
//
// unicode-range tells the browser which characters each file covers, so a page only downloads the
// files for scripts it actually contains (an English page never fetches the 200 KB Ethiopic font).
// Nothing is preloaded for the same reason; display: swap shows text immediately in a fallback.
// next/font requires literal option values, so the ranges are repeated rather than shared:
//   Ethiopic: U+1200-139F, U+2D80-2DDF, U+AB00-AB2F, U+1E7E0-1E7FF
//   Latin:    the Fontsource "latin" subset range (Basic Latin, Latin-1 incl. å ä ö, punctuation)

export const notoSansEthiopic = localFont({
  src: "../fonts/NotoSansEthiopic-Variable.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+1200-139F, U+2D80-2DDF, U+AB00-AB2F, U+1E7E0-1E7FF" }],
  variable: "--font-noto-sans-ethiopic",
});

export const inter = localFont({
  src: "../fonts/Inter-Latin-Variable.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  variable: "--font-inter",
});

export const notoSerifEthiopic = localFont({
  src: "../fonts/NotoSerifEthiopic-Variable.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+1200-139F, U+2D80-2DDF, U+AB00-AB2F, U+1E7E0-1E7FF" }],
  variable: "--font-noto-serif-ethiopic",
});

export const sourceSerif = localFont({
  src: "../fonts/SourceSerif4-Latin-Variable.woff2",
  weight: "200 900",
  display: "swap",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  variable: "--font-source-serif",
});

export const fontVariables = [notoSansEthiopic, inter, notoSerifEthiopic, sourceSerif]
  .map((font) => font.variable)
  .join(" ");
