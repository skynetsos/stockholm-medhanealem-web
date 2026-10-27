# Self-hosted fonts

All fonts are licensed under the SIL Open Font License 1.1 (licence files alongside; none declares a
Reserved Font Name, so trimmed copies keep their names). Files start as the variable-weight woff2
subsets published by Fontsource on npm and are then **trimmed** (task 10, D-025) to the weights the
site uses (`wght` 400–700) and, for Ethiopic, to the Ethiopic block U+1200–139F — about half the
bytes (473 KB → 224 KB for all four). The site loads no third-party font CDN.

| File | Font | Subset | Source package |
|---|---|---|---|
| `public/fonts/noto-sans-ethiopic-v1.woff2` | Noto Sans Ethiopic | ethiopic | `@fontsource-variable/noto-sans-ethiopic@5.3.0` |
| `public/fonts/noto-serif-ethiopic-v1.woff2` | Noto Serif Ethiopic | ethiopic | `@fontsource-variable/noto-serif-ethiopic@5.3.0` |
| `Inter-Latin-Variable.woff2` | Inter | latin (incl. å ä ö) | `@fontsource-variable/inter@5.3.0` |
| `SourceSerif4-Latin-Variable.woff2` | Source Serif 4 | latin (incl. å ä ö) | `@fontsource-variable/source-serif-4@5.3.1` |

The two Ethiopic files live in `public/fonts/` and are declared in `src/styles/globals.css`, so
Amharic pages can preload them (D-025); bump `-v1` in the file name and CSS when they change (they
are cached for a year). The Latin files stay here and load through `next/font` (`src/styles/fonts.ts`).

The Ethiopic files contain only Ethiopic glyphs and the Latin files only Latin glyphs. The CSS font
stacks list both, so the browser picks the right file per character (fallback: Abyssinica SIL,
then the system font).

To update: `npm pack <package>@<version>` into an empty folder, extract, rename
`files/<name>-<subset>-wght-normal.woff2` to `NotoSansEthiopic-Variable.woff2`,
`NotoSerifEthiopic-Variable.woff2`, `Inter-Latin-Variable.woff2` or `SourceSerif4-Latin-Variable.woff2`,
then trim: `python scripts/fonts/trim-fonts.py <that folder> <output folder>` and copy the Latin
results here and the Ethiopic results to `public/fonts/` under their versioned names (needs Python with `fonttools` and
`brotli`; a build tool only, not a project dependency). Keep `weight: "400 700"` in
`src/styles/fonts.ts` in step with the trimmed range.
