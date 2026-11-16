import type { Metadata } from "next";

import { getLayoutData } from "../lib/cms/layout";
import { indexedLocales } from "../lib/seo";
import { buildAlternates } from "./build-alternates";
import { routing } from "./routing";

export { buildAlternates };

/**
 * Canonical + hreflang alternates for a locale-independent path ("" for home, "/visit", …). Only
 * languages that are public are offered: Swedish once it is switched on in Site settings
 * (D-041, review F-17).
 */
export async function localeAlternates(locale: string, path = ""): Promise<NonNullable<Metadata["alternates"]>> {
  const { settings } = await getLayoutData(routing.defaultLocale);
  return buildAlternates(locale, path, indexedLocales(settings));
}
