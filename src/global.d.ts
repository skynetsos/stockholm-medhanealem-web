import type messages from "./messages/en.json";
import type errors from "./messages/errors.json";
import type { routing } from "./i18n/routing";

// Type-safe next-intl: unknown message keys and locales are compile errors.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    // The error pages' strings live in their own small file (also used by global-error, D-044).
    Messages: typeof messages & { errors: (typeof errors)["en"] };
  }
}
