import { defineRouting } from "next-intl/routing";

import { defaultLocale, locales } from "./locales";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Every public URL carries its locale: /am/…, /en/…, /sv/… (spec §7).
  localePrefix: "always",
  // "/" always goes to Amharic; visitors switch language explicitly (docs/DECISIONS.md Q-004).
  localeDetection: false,
  // No locale cookie: avoids a non-essential cookie and consent banner.
  localeCookie: false,
  // hreflang comes from each page's metadata (see alternates.ts), not a blanket Link header
  // that would also advertise alternates for 404s.
  alternateLinks: false,
});
