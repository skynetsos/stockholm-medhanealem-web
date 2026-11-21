/**
 * Base content for the three layout globals (Phase 0 task 8, docs/DECISIONS.md D-006).
 * Labels are given per locale; a missing locale falls back to Amharic. Doctrinal/section names
 * reuse the wording on dev.medhanealem.se where it exists. Amharic labels are reviewed by Biruk;
 * Swedish labels are drafts for the Phase 3 reviewer.
 */
import type { Locale } from "../i18n/locales";

export type Localized = { am: string } & Partial<Record<Exclude<Locale, "am">, string>>;

type SeedLink = { label: Localized; path: string };
/** A header item: a link, or a dropdown heading (no path) with its sub-menu (D-049). */
type SeedMenuItem = { label: Localized; path?: string; children?: SeedLink[] };

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

  /**
   * The header menu in the reference layout's structure and order (D-049, docs/reference/denver/GAP.md):
   * dropdowns without a page of their own, children in the approved order. Items whose page has no
   * content yet are hidden on the site until it does. New Amharic labels (marked in GAP.md) are drafts
   * for Biruk's review; Swedish labels are drafts for the Swedish reviewer.
   */
  navigation: {
    items: [
      { path: "/", label: { am: "መነሻ ገጽ", en: "Home", sv: "Hem" } },
      {
        label: { am: "ቤተ ክርስቲያናችን", en: "Our Church", sv: "Vår kyrka" },
        children: [
          { path: "/our-church", label: { am: "ስለ እኛ", en: "About Us", sv: "Om oss" } },
          { path: "/our-church/history", label: { am: "ታሪካችን", en: "Our Story", sv: "Vår historia" } },
          { path: "/our-church/tewahedo-history", label: { am: "የተዋሕዶ ታሪክ", en: "Tewahedo History", sv: "Tewahedokyrkans historia" } },
          { path: "/our-church/theology", label: { am: "ነገረ መለኮት", en: "Theology", sv: "Teologi" } },
          { path: "/our-church/clergy", label: { am: "ካህናት", en: "Our Priests", sv: "Våra präster" } },
          { path: "/our-church/building-project", label: { am: "የሕንፃ ፕሮጀክት", en: "Building Project", sv: "Byggprojektet" } },
          { path: "/our-church/leadership", label: { am: "ሰበካ ጉባኤ", en: "Leadership", sv: "Ledning" } },
        ],
      },
      {
        label: { am: "ትምህርቶች", en: "Our Faith", sv: "Vår tro" },
        children: [
          { path: "/our-faith", label: { am: "እምነታችን", en: "Our Faith", sv: "Vår tro" } },
          { path: "/our-faith/holy-scriptures", label: { am: "መጻሕፍት ቅዱሳት", en: "Holy Scriptures", sv: "Den heliga skrift" } },
          { path: "/our-faith/mysteries", label: { am: "አዕማደ ምሥጢር", en: "The Mysteries", sv: "Mysterierna" } },
          { path: "/our-faith/seven-sacraments", label: { am: "ሰባቱ ምሥጢራተ ቤተ ክርስቲያን", en: "The Seven Sacraments", sv: "De sju sakramenten" } },
          { path: "/media/videos", label: { am: "ስብከቶች", en: "Sermons", sv: "Predikningar" } },
        ],
      },
      {
        label: { am: "አገልግሎት ክፍሎች", en: "Ministries", sv: "Verksamheter" },
        children: [{ path: "/sunday-school", label: { am: "ሰንበት ት/ቤት", en: "Sunday School", sv: "Söndagsskola" } }],
      },
      {
        label: { am: "አገልግሎቶች", en: "Services", sv: "Gudstjänster" },
        children: [
          { path: "/worship", label: { am: "የአገልግሎት ሰዓታት", en: "Service Schedule", sv: "Gudstjänsttider" } },
          { path: "/sacraments/baptism", label: { am: "ክርስትና", en: "Baptism", sv: "Dop" } },
          { path: "/sacraments/marriage", label: { am: "ጋብቻ", en: "Holy Matrimony", sv: "Vigsel" } },
          { path: "/our-faith/offerings", label: { am: "መባዕ", en: "Offerings", sv: "Offergåvor" } },
          { path: "/sacraments/fitihat", label: { am: "ፍትሐት", en: "Memorial (Fitihat)", sv: "Minnesbön (Fitihat)" } },
          { path: "/sacraments/prayer-request", label: { am: "የጸሎት ጥያቄ", en: "Prayer Request", sv: "Böneförfrågan" } },
        ],
      },
      {
        label: { am: "ዝግጅቶች", en: "Events", sv: "Evenemang" },
        children: [
          { path: "/worship/calendar", label: { am: "የቀን መቁጠሪያ", en: "Calendar", sv: "Kalender" } },
          { path: "/news", label: { am: "ማስታወቂያዎች", en: "Announcements", sv: "Meddelanden" } },
          { path: "/worship/livestream", label: { am: "ቀጥታ ስርጭት", en: "Livestream", sv: "Direktsändning" } },
          { path: "/media", label: { am: "ፎቶዎች", en: "Photos", sv: "Foton" } },
        ],
      },
      {
        label: { am: "ግንኙነት", en: "Connect", sv: "Kontakt" },
        children: [
          { path: "/visit", label: { am: "ያግኙን", en: "Contact Us", sv: "Kontakta oss" } },
          { path: "/support/volunteer", label: { am: "በፈቃደኝነት ያገልግሉ", en: "Volunteer", sv: "Bli volontär" } },
        ],
      },
    ] satisfies SeedMenuItem[],
    /** The pill at the end of the menu (D-049, decision D3: the church may rename it). */
    ctas: [{ path: "/support", style: "primary" as const, label: { am: "ስጦታ", en: "Give", sv: "Ge en gåva" } }],
  },

  /**
   * Sunday School departments (spec §2.7). Amharic names as on dev.medhanealem.se (verified
   * 2026-10-19); only names are seeded, the church writes the descriptions.
   */
  departments: [
    { slug: "education", order: 10, name: l10n({ am: "ትምህርት ክፍል", en: "Education", sv: "Undervisning" }) },
    { slug: "children", order: 20, name: l10n({ am: "ህጻናት ክፍል", en: "Children", sv: "Barn" }) },
    { slug: "mezmur", order: 30, name: l10n({ am: "መዝሙር ክፍል", en: "Mezmur (choir)", sv: "Mezmur (kör)" }) },
    { slug: "it", order: 40, name: l10n({ am: "አይቲ ክፍል", en: "IT", sv: "IT" }) },
    { slug: "property", order: 50, name: l10n({ am: "ንብረት ክፍል", en: "Property", sv: "Fastigheter" }) },
    { slug: "communications", order: 60, name: l10n({ am: "ግንኙነት ክፍል", en: "Communications", sv: "Kommunikation" }) },
  ],

  footer: {
    /** Link columns, as on the reference layout (D-049); links to pages without content are hidden. */
    columns: [
      {
        heading: { am: "ቤተ ክርስቲያን", en: "Church", sv: "Kyrkan" },
        links: [
          { path: "/our-church", label: { am: "ስለ እኛ", en: "About Us", sv: "Om oss" } },
          { path: "/our-church/history", label: { am: "ታሪካችን", en: "Our Story", sv: "Vår historia" } },
          { path: "/our-faith", label: { am: "እምነታችን", en: "Our Faith", sv: "Vår tro" } },
          { path: "/our-church/clergy", label: { am: "ካህናት", en: "Our Priests", sv: "Våra präster" } },
          { path: "/our-church/leadership", label: { am: "ሰበካ ጉባኤ", en: "Leadership", sv: "Ledning" } },
          { path: "/media/videos", label: { am: "ስብከቶች", en: "Sermons", sv: "Predikningar" } },
        ],
      },
      {
        heading: { am: "አገልግሎቶች", en: "Services", sv: "Gudstjänster" },
        links: [
          { path: "/worship", label: { am: "የአገልግሎት ሰዓታት", en: "Service Schedule", sv: "Gudstjänsttider" } },
          { path: "/worship/calendar", label: { am: "የቀን መቁጠሪያ", en: "Calendar", sv: "Kalender" } },
          { path: "/news", label: { am: "ማስታወቂያዎች", en: "Announcements", sv: "Meddelanden" } },
          { path: "/sunday-school", label: { am: "ሰንበት ት/ቤት", en: "Sunday School", sv: "Söndagsskola" } },
          { path: "/support", label: { am: "ስጦታ", en: "Give", sv: "Ge en gåva" } },
          { path: "/visit", label: { am: "ያግኙን", en: "Contact Us", sv: "Kontakta oss" } },
          { path: "/worship/livestream", label: { am: "ቀጥታ ስርጭት", en: "Livestream", sv: "Direktsändning" } },
        ],
      },
    ] satisfies { heading: Localized; links: SeedLink[] }[],
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
