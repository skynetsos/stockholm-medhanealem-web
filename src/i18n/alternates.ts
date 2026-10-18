import type { Metadata } from "next";

import { routing } from "./routing";

/**
 * Canonical + hreflang alternates for a locale-independent path ("" for home, "/visit", …).
 * x-default points at the Amharic (default) version.
 */
export function localeAlternates(locale: string, path = ""): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}${path}`]),
  );
  languages["x-default"] = `/${routing.defaultLocale}${path}`;
  return { canonical: `/${locale}${path}`, languages };
}
