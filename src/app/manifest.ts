import type { MetadataRoute } from "next";

import { defaultLocale } from "@/i18n/locales";
import { getLayoutData } from "@/lib/cms/layout";
import { siteOrigin } from "@/lib/seo";

/**
 * Web app manifest (spec Phase 3 polish, D-044): lets visitors add the site to their phone's home
 * screen. Name and short name come from Site settings (Amharic, the default language); it opens on
 * the Amharic home page. No service worker: the site isn't made to work offline (always-current
 * service times matter more than offline copies).
 */
// Read from Site settings when requested (cached), never at build time: the build has no database.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { settings } = await getLayoutData(defaultLocale).catch(() => ({ settings: { churchName: null, shortName: null } }));
  // Site settings always has the name (seeded); the address is only a last resort, not copy.
  const name = settings.churchName || settings.shortName || new URL(siteOrigin()).hostname;
  return {
    name,
    short_name: settings.shortName || name,
    lang: defaultLocale,
    dir: "ltr",
    start_url: `/${defaultLocale}`,
    scope: "/",
    display: "standalone",
    background_color: "#f8f4ea", // --color-cream
    theme_color: "#0b3d2e", // --color-primary
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
