/**
 * Base content for the three layout globals (Phase 0 task 8, docs/DECISIONS.md D-006).
 * Labels are given per locale; a missing locale falls back to Amharic. Doctrinal/section names
 * reuse the wording on dev.medhanealem.se where it exists. Amharic labels are reviewed by Biruk;
 * Swedish labels are drafts for the Phase 3 reviewer.
 */
import type { Locale } from "../i18n/locales";

export type Localized = { am: string } & Partial<Record<Exclude<Locale, "am">, string>>;

type SeedLink = { label: Localized; path: string };

/** Types a label set as Localized (so a missing locale reads as undefined, not a type error). */
const l10n = (text: Localized): Localized => text;

const ADDRESS_LINE = "Pålsbodagränd 3, 124 75 Bandhagen";

export const baseSeed = {
  settings: {
    churchName: l10n({
      am: "በኢትዮጵያ ኦርቶዶክስ ተዋህዶ የደብረ ሰላም መንበረ ጵጵስና መድኃኔ ዓለም ቤተ ክርስቲያን",
      en: "Debre Selam Menbere Papasat Medhanealem Ethiopian Orthodox Tewahedo Church, Stockholm",
    }),
    shortName: "Stockholm Medhanealem",
    address: { street: "Pålsbodagränd 3", postalCode: "124 75", city: "Bandhagen" },
    defaultLocation: l10n({ am: ADDRESS_LINE, en: ADDRESS_LINE, sv: ADDRESS_LINE }),
    retentionMonthsBaptism: 24,
  },

  /** Top-level sections from spec §4 / proposal §4. */
  navigation: {
    items: [
      { path: "/", label: { am: "መነሻ ገጽ", en: "Home", sv: "Hem" } },
      { path: "/our-church", label: { am: "ቤተ ክርስቲያናችን", en: "Our Church", sv: "Vår kyrka" } },
      { path: "/our-faith", label: { am: "ትምህርቶች", en: "Our Faith", sv: "Vår tro" } },
      { path: "/worship", label: { am: "አገልግሎትና የቀን መቁጠሪያ", en: "Worship & Calendar", sv: "Gudstjänst & kalender" } },
      { path: "/sunday-school", label: { am: "ሰንበት ት/ቤት", en: "Sunday School", sv: "Söndagsskola" } },
      { path: "/sacraments", label: { am: "ምሥጢራትና ጥያቄዎች", en: "Sacraments & Requests", sv: "Sakrament & förfrågningar" } },
      { path: "/news", label: { am: "ዜናና ሚዲያ", en: "News & Media", sv: "Nyheter & media" } },
      { path: "/support", label: { am: "ድጋፍ", en: "Support", sv: "Stöd oss" } },
      { path: "/visit", label: { am: "ያግኙን", en: "Visit & Contact", sv: "Besök & kontakt" } },
    ] satisfies SeedLink[],
    ctas: [
      {
        path: "/worship/weekly",
        style: "secondary" as const,
        label: { am: "የአገልግሎት ሰዓታት", en: "Service Times", sv: "Gudstjänsttider" },
      },
      {
        path: "/sacraments/baptism",
        style: "primary" as const,
        label: { am: "የክርስትና ጥያቄ", en: "Request Baptism", sv: "Ansök om dop" },
      },
    ],
  },

  footer: {
    diocese: {
      url: "https://eotc-nordics.org/a/",
      label: { am: "የኖርዲክና የግሪክ ሀገረ ስብከት", en: "Nordic & Greece Diocese", sv: "Stiftet för Norden och Grekland" },
    },
    legal: [
      { path: "/privacy", label: { am: "የግላዊነት መመሪያ", en: "Privacy policy", sv: "Integritetspolicy" } },
      { path: "/cookies", label: { am: "ኩኪዎች", en: "Cookies", sv: "Kakor" } },
    ] satisfies SeedLink[],
  },
};
