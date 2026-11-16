import type { Metadata } from "next";

import { routing } from "./routing";

/** Canonical + hreflang alternates for `path` among the given (public) languages; x-default is Amharic. */
export function buildAlternates(locale: string, path: string, languages: readonly string[]): NonNullable<Metadata["alternates"]> {
  const map: Record<string, string> = Object.fromEntries(languages.map((code) => [code, `/${code}${path}`]));
  map["x-default"] = `/${routing.defaultLocale}${path}`;
  return { canonical: `/${locale}${path}`, languages: map };
}
