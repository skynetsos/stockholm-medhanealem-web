import { richTextToPlain } from "./richtext";

/** Letters of the Ethiopic script (Ge'ez, used for Amharic), and letters of any script. */
const ETHIOPIC = /[ሀ-፿ᎀ-᎟ⶀ-⷟꬀-꬯]/gu;
const LETTER = /\p{L}/gu;

/**
 * `lang` for content shown on an English or Swedish page that is in Amharic because it isn't
 * translated yet (the site falls back to Amharic, D-024): WCAG 3.1.2 wants such text marked so
 * screen readers switch voice. Decided from the text itself — mostly Ethiopic letters means Amharic —
 * so no second database read is needed. Returns undefined when nothing needs marking (D-044).
 */
export function fallbackLang(value: unknown, pageLocale: string): "am" | undefined {
  if (pageLocale === "am" || value == null) return undefined;
  const text = typeof value === "string" ? value : richTextToPlain(value);
  const letters = text.match(LETTER)?.length ?? 0;
  if (!letters) return undefined;
  const ethiopic = text.match(ETHIOPIC)?.length ?? 0;
  return ethiopic / letters > 0.5 ? "am" : undefined;
}
