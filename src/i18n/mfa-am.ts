import type { AdminTranslations } from "./admin";

/**
 * Amharic text for the sign-in second-step screens (enrol, verify, recovery codes) — spec Phase 3
 * polish, D-044. Payload's admin has no Amharic interface language (it isn't among the languages
 * Payload accepts), so these screens, which are our own, switch by themselves: Amharic when the
 * browser prefers it or the person chooses it on the screen. Needs native review
 * (CONTENT-CHECKLIST.md). Keys match `mfa` in admin.ts; a missing key falls back to English.
 */
export const mfaAmharic: Partial<Record<keyof AdminTranslations["mfa"], string>> = {
  enrolTitle: "ባለ ሁለት ደረጃ ማረጋገጫ ያዘጋጁ",
  enrolIntro:
    "የእርስዎ ሚና በመግቢያ ጊዜ ሁለተኛ ደረጃ ማረጋገጫ ይጠይቃል። ይህን QR ኮድ በማረጋገጫ መተግበሪያ (ለምሳሌ Google Authenticator፣ Microsoft Authenticator ወይም 1Password) ይቃኙ፤ ከዚያም መተግበሪያው የሚያሳየውን ባለ 6 አኃዝ ኮድ ያስገቡ።",
  qrAlt: "ለማረጋገጫ መተግበሪያዎ የሚሆን QR ኮድ",
  manualKey: "መቃኘት አልቻሉም? ይህን ቁልፍ በእጅ ያስገቡ፦",
  codeLabel: "ባለ 6 አኃዝ ኮድ",
  confirm: "አረጋግጥ",
  verifyTitle: "ባለ ሁለት ደረጃ ማረጋገጫ",
  verifyIntro: "ከማረጋገጫ መተግበሪያዎ ያለውን ባለ 6 አኃዝ ኮድ ያስገቡ።",
  verify: "አረጋግጥ",
  useRecovery: "በምትኩ የመጠባበቂያ ኮድ ይጠቀሙ",
  useApp: "በምትኩ የመተግበሪያ ኮድ ይጠቀሙ",
  recoveryLabel: "የመጠባበቂያ ኮድ",
  recoveryTitle: "የመጠባበቂያ ኮዶችዎን ያስቀምጡ",
  recoveryIntro:
    "ስልክዎ ቢጠፋ እያንዳንዱ ኮድ አንድ ጊዜ ብቻ ይሠራል። ዳግመኛ አይታዩም። እንደ የይለፍ ቃል አስተዳዳሪ ባለ ደኅንነቱ በተጠበቀ ቦታ ወይም ታትመው በተቆለፈ ቦታ ያስቀምጧቸው።",
  recoverySaved: "እነዚህን ኮዶች አስቀምጫለሁ",
  continue: "ወደ አስተዳደር ገጽ ይቀጥሉ",
  signOut: "ውጣ",
  loading: "በመጫን ላይ…",
  error_unauthenticated: "ክፍለ ጊዜዎ አብቅቷል። እባክዎ እንደገና ይግቡ።",
  error_forbidden: "ይህን ለማድረግ አልተፈቀደልዎትም።",
  error_already_enrolled: "ባለ ሁለት ደረጃ ማረጋገጫ ቀድሞውኑ ተዘጋጅቷል።",
  error_not_enrolled: "ባለ ሁለት ደረጃ ማረጋገጫ ገና አልተዘጋጀም።",
  error_no_pending_setup: "ዝግጅቱ ጊዜው አልፎበታል። አዲስ QR ኮድ ለማግኘት ገጹን እንደገና ይጫኑ።",
  error_invalid_code: "ኮዱ ትክክል አይደለም። መተግበሪያዎን አይተው እንደገና ይሞክሩ።",
  error_locked: "ብዙ ያልተሳኩ ሙከራዎች። ከ15 ደቂቃ በኋላ እንደገና ይሞክሩ።",
  error_no_session: "ክፍለ ጊዜዎ አልተገኘም። እባክዎ እንደገና ይግቡ።",
  error_not_found: "ተጠቃሚው አልተገኘም።",
  error_unknown: "ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።",
};

/** The language switch shown on the screens, each label in its own language. */
export const MFA_LANGUAGE_LABELS = { am: "አማርኛ", en: "English" } as const;
export type MfaLanguage = keyof typeof MFA_LANGUAGE_LABELS;

/** ?lang= on the screen wins; otherwise Amharic when the browser lists it before English. */
export function mfaLanguage(requested: string | null | undefined, acceptLanguage: string | null | undefined): MfaLanguage {
  if (requested === "am" || requested === "en") return requested;
  const preferred = (acceptLanguage ?? "")
    .split(",")
    .map((part) => part.trim().split(";")[0].toLowerCase().split("-")[0])
    .filter(Boolean);
  const am = preferred.indexOf("am");
  const en = preferred.indexOf("en");
  return am !== -1 && (en === -1 || am < en) ? "am" : "en";
}
