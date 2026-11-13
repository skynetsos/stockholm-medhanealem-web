import type { CollectionSlug, Payload } from "payload";

import { hasRole } from "../../access/roles";
import { defaultLocale, type Locale, locales } from "../../i18n/locales";

/**
 * Translation workflow (spec Phase 3 task 1, D-041): which content still lacks a translation, per
 * language, and how much of the core content is translated. "Translated" means the language has its
 * own text in the fields below (not the Amharic fallback the site shows meanwhile).
 */

type Doc = Record<string, unknown> & { id: number | string };
type Rule = {
  collection: CollectionSlug;
  /** Fields a translation must have, as checked by `hasText` (rich text: any text inside). */
  fields: string[];
  /** The field naming the item in the list. */
  titleField: string;
  /** Only items the public can see count (published / not hidden). */
  live?: (doc: Doc) => boolean;
  /** Core content counts towards the Swedish switch-on threshold (spec: ≥ 80 %). */
  core?: boolean;
};

const published = (doc: Doc) => doc._status === "published";

export const TRANSLATION_RULES: Rule[] = [
  { collection: "pages", fields: ["title", "layout"], titleField: "title", live: published, core: true },
  { collection: "teachings", fields: ["title", "body"], titleField: "title", live: published, core: true },
  { collection: "departments", fields: ["name", "summary"], titleField: "name", live: (d) => hasText(d.summary) || hasText(d.body) },
  { collection: "events", fields: ["title"], titleField: "title", live: (d) => d.cancelled !== true },
  { collection: "posts", fields: ["title", "body"], titleField: "title", live: published },
  { collection: "clergy", fields: ["name", "bio"], titleField: "name", live: (d) => d.published === true },
  { collection: "galleries", fields: ["title"], titleField: "title", live: (d) => d.published === true },
  { collection: "videos", fields: ["title"], titleField: "title" },
  { collection: "media", fields: ["alt"], titleField: "alt", live: (d) => d.permissionObtained === true },
];

/** Keys of block settings, links and media in rich text / blocks: not translatable text. */
const NOT_TEXT_KEYS = ["id", "blockType", "blockName", "type", "format", "direction", "version", "mode", "style", "tag", "listType", "url", "href", "link", "newTab", "linkType", "appearance", "image", "images", "video", "videoUrl", "eventType", "limit", "rel", "target", "fields", "relationTo", "value"];

/** True when a value holds text: a non-blank string, or rich text / blocks with any text inside. */
export function hasText(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasText);
  if (value && typeof value === "object") {
    const node = value as Record<string, unknown>;
    if (node.type === "text" && typeof node.text === "string") return node.text.trim().length > 0;
    // Block rows and rich text trees: look at their content, not at ids, block types or settings.
    return Object.entries(node).some(([key, v]) => !NOT_TEXT_KEYS.includes(key) && hasText(v));
  }
  return false;
}

export type MissingItem = { id: number | string; title: string; missing: string[] };
export type CollectionReport = { collection: CollectionSlug; total: number; translated: number; missing: MissingItem[] };
export type LocaleReport = { locale: Locale; collections: CollectionReport[]; coreTotal: number; coreTranslated: number; corePercent: number };

/** What `locale` is missing, compared with the live Amharic content. */
export async function translationReport(payload: Payload, locale: Locale): Promise<LocaleReport> {
  const collections = await Promise.all(
    TRANSLATION_RULES.map(async (rule): Promise<CollectionReport & { core: boolean }> => {
      const read = { collection: rule.collection, overrideAccess: true, depth: 0, pagination: false, fallbackLocale: false } as const;
      const [source, target] = await Promise.all([
        payload.find({ ...read, locale: defaultLocale }),
        locale === defaultLocale ? null : payload.find({ ...read, locale }),
      ]);
      const translations = new Map<number | string, Doc>((target?.docs ?? []).map((d) => [d.id, d as unknown as Doc]));
      const live = (source.docs as unknown as Doc[]).filter((d) => !rule.live || rule.live(d));
      const missing = live.flatMap((doc): MissingItem[] => {
        const translation = locale === defaultLocale ? doc : translations.get(doc.id);
        const absent = rule.fields.filter((field) => !hasText(translation?.[field]) && hasText(doc[field]));
        // Amharic itself: report fields that are empty in the default language.
        const required = locale === defaultLocale ? rule.fields.filter((field) => !hasText(doc[field])) : absent;
        return required.length ? [{ id: doc.id, title: String(doc[rule.titleField] ?? doc.id), missing: required }] : [];
      });
      return { collection: rule.collection, total: live.length, translated: live.length - missing.length, missing, core: Boolean(rule.core) };
    }),
  );
  const core = collections.filter((c) => c.core);
  const coreTotal = core.reduce((n, c) => n + c.total, 0);
  const coreTranslated = core.reduce((n, c) => n + c.translated, 0);
  return {
    locale,
    collections: collections.map((c) => ({ collection: c.collection, total: c.total, translated: c.translated, missing: c.missing })),
    coreTotal,
    coreTranslated,
    corePercent: coreTotal ? Math.floor((coreTranslated / coreTotal) * 100) : 0,
  };
}

export type Staff = { roles?: string[] | null; translatorLocales?: string[] | null };

/** The languages a user works on in "Missing translations": translators their own, editors all. */
export function reportLocales(user: Staff): Locale[] {
  const translations = locales.filter((l) => l !== defaultLocale);
  if (hasRole(user, "super_admin", "editor", "clergy_approver")) return translations;
  return translations.filter((l) => user.translatorLocales?.includes(l));
}

/** Spec Phase 3 task 2: Swedish may be switched on publicly once ≥ 80 % of core pages are translated. */
export const SWEDISH_THRESHOLD_PERCENT = 80;
