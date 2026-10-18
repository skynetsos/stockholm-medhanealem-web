# Self-hosted fonts

All fonts are licensed under the SIL Open Font License 1.1 (licence files alongside). Files are the
variable-weight (`wght` 100–900, Source Serif 200–900) woff2 subsets published by Fontsource on npm,
copied here so the site loads no third-party font CDN.

| File | Font | Subset | Source package |
|---|---|---|---|
| `NotoSansEthiopic-Variable.woff2` | Noto Sans Ethiopic | ethiopic | `@fontsource-variable/noto-sans-ethiopic@5.3.0` |
| `NotoSerifEthiopic-Variable.woff2` | Noto Serif Ethiopic | ethiopic | `@fontsource-variable/noto-serif-ethiopic@5.3.0` |
| `Inter-Latin-Variable.woff2` | Inter | latin (incl. å ä ö) | `@fontsource-variable/inter@5.3.0` |
| `SourceSerif4-Latin-Variable.woff2` | Source Serif 4 | latin (incl. å ä ö) | `@fontsource-variable/source-serif-4@5.3.1` |

The Ethiopic files contain only Ethiopic glyphs and the Latin files only Latin glyphs. The CSS font
stacks list both, so the browser picks the right file per character (fallback: Abyssinica SIL,
then the system font).

To update: `npm pack <package>@<version>` into an empty folder, extract, and copy
`files/<name>-<subset>-wght-normal.woff2` over the file here.
