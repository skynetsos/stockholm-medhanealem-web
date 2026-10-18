/** Site locales, shared by Payload localization and next-intl routing. */
export const locales = ["am", "en", "sv"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "am";

/** Endonyms used for locale pickers (admin and public switcher). */
export const localeNames: Record<Locale, string> = {
  am: "አማርኛ",
  en: "English",
  sv: "Svenska",
};

/** Compact labels for the header switcher: "አማ | EN | SV" (proposal §4). */
export const localeShortNames: Record<Locale, string> = {
  am: "አማ",
  en: "EN",
  sv: "SV",
};
