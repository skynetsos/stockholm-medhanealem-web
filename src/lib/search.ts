import { sql } from "@payloadcms/db-postgres";
import type { Payload } from "payload";

import { defaultLocale, type Locale } from "../i18n/locales";
import { pagePath } from "./pages";
import { teachingPath } from "./teachings";

/**
 * Site search (spec Phase 3 task 6, D-043): Postgres full-text search over published pages,
 * teachings and news, and events, in the visitor's language; items without a translation are
 * searched (and shown) in Amharic, as the site shows them.
 *
 * - Language rules: English and Swedish use Postgres' stemming dictionaries ("services" finds
 *   "service"); Amharic uses the "simple" configuration (no stemming). Postgres splits Ethiopic
 *   text into words and treats ። ፣ ፤ as separators (database ctype en_US.UTF-8; sanity-tested).
 * - Amharic attaches prepositions and articles to words (የሰንበት = "of the Sabbath"), which a
 *   word index can't see, so a word of the query also matches inside a word (case-insensitive).
 * - The query is passed as a bound parameter (websearch_to_tsquery: quotes, OR, -word work and no
 *   input is a syntax error). The content is small (hundreds of items), so no stored index yet.
 */

export type SearchKind = "page" | "teaching" | "post" | "event";
/** `lang`: the language the title and snippet are in (Amharic when the item isn't translated). */
export type SearchResult = { kind: SearchKind; id: number; title: string; path: string; snippet: string; rank: number; lang: Locale };

const CONFIG: Record<Locale, string> = { am: "simple", en: "english", sv: "swedish" };
/** Marks the matched words in snippets; the page turns them into <mark> without parsing HTML. */
export const MARK_START = "\u0002";
export const MARK_END = "\u0003";
export const MAX_QUERY_LENGTH = 100;
const LIMIT = 30;

/** Normalises the visitor's query: trimmed, single spaces, at most 100 characters. */
export const cleanQuery = (q: unknown): string =>
  (Array.isArray(q) ? q[0] : typeof q === "string" ? q : "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);

/** Words of the query used for matching inside words (2+ characters, no search operators). */
export const queryWords = (q: string): string[] =>
  [...new Set(q.replace(/["()]/g, " ").split(" ").filter((w) => w.length >= 2 && w.toLowerCase() !== "or" && !w.startsWith("-")))].slice(0, 8);

/** Lexical rich text (jsonb) → its plain text. */
const lexicalText = (column: string) => `coalesce((select string_agg(t #>> '{}', ' ') from jsonb_path_query(${column}, 'strict $.**.text') t), '')`;

type Row = { kind: SearchKind; id: number; title: string; section: string | null; slug: string | null; category: string | null; lang: Locale; snippet: string; rank: number };

export async function searchSite(payload: Payload, locale: Locale, query: string): Promise<SearchResult[]> {
  const q = cleanQuery(query);
  // The language goes into the SQL text below: only the three known codes.
  if (!q || !Object.hasOwn(CONFIG, locale)) return [];
  const config = CONFIG[locale];
  const likes = queryWords(q).map((w) => `%${w.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  // One JSON parameter: drizzle would spread a JS array into separate parameters.
  const patterns = JSON.stringify(likes);
  const anyWord = sql`array(select jsonb_array_elements_text(${patterns}::jsonb))`;
  // Each item's text in the visitor's language, or in Amharic when it has no translation (DISTINCT ON
  // keeps the visitor's language first).
  const pick = (table: string, columns: string) => `
    select distinct on (_parent_id) _parent_id, ${columns}
    from ${table} where _locale in ('${locale}', '${defaultLocale}') and nullif(trim(coalesce(title, '')), '') is not null
    order by _parent_id, (_locale = '${locale}') desc`;

  const docs = `
    select 'page' as kind, p.id, l.title, p.section::text as section, p.slug, null::text as category, l._locale::text as lang,
      concat_ws(' ', l.title, l.hero_heading, l.hero_subheading, l.seo_description,
        (select string_agg(${lexicalText("bl.content")}, ' ')
           from pages_blocks_rich_text b
           join pages_blocks_rich_text_locales bl on bl._parent_id = b.id and bl._locale = l._locale
          where b._parent_id = p.id)) as body
    from pages p join (${pick("pages_locales", "_locale, title, hero_heading, hero_subheading, seo_description")}) l on l._parent_id = p.id
    where p._status = 'published'
    union all
    select 'teaching', t.id, l.title, null, t.slug, t.category::text, l._locale::text, concat_ws(' ', l.title, ${lexicalText("l.body")})
    from teachings t join (${pick("teachings_locales", "_locale, title, body")}) l on l._parent_id = t.id
    where t._status = 'published'
    union all
    select 'post', p.id, l.title, null, p.slug, null, l._locale::text, concat_ws(' ', l.title, l.excerpt, ${lexicalText("l.body")})
    from posts p join (${pick("posts_locales", "_locale, title, excerpt, body")}) l on l._parent_id = p.id
    where p._status = 'published'
    union all
    select 'event', e.id, l.title, null, null, null, l._locale::text, concat_ws(' ', l.title, l.description, l.location)
    from events e join (${pick("events_locales", "_locale, title, description, location")}) l on l._parent_id = e.id
    where e.cancelled is not true`;

  const db = (payload.db as unknown as { drizzle: { execute: (query: unknown) => Promise<{ rows: Row[] }> } }).drizzle;
  const result = await db.execute(sql`
    with docs as (${sql.raw(docs)}),
    q as (select websearch_to_tsquery(${config}::regconfig, ${q}) as query)
    select kind, id, title, section, slug, category, lang,
      ts_headline(${config}::regconfig, body, q.query,
        ${`StartSel=${MARK_START}, StopSel=${MARK_END}, MaxWords=30, MinWords=12, ShortWord=1, MaxFragments=1, FragmentDelimiter=" … "`}) as snippet,
      (ts_rank(to_tsvector(${config}::regconfig, title), q.query) * 2 + ts_rank(to_tsvector(${config}::regconfig, body), q.query)
        + case when ${likes.length > 0} and title ilike any(${anyWord}) then 0.5 else 0 end) as rank
    from docs, q
    where to_tsvector(${config}::regconfig, body) @@ q.query
       or (${likes.length > 0} and body ilike all(${anyWord}))
    order by rank desc, title
    limit ${LIMIT}`);

  return result.rows.flatMap((row): SearchResult[] => {
    const path =
      row.kind === "page"
        ? pagePath(row.section ?? "", row.slug ?? "")
        : row.kind === "teaching"
          ? teachingPath(row.category, row.slug)
          : row.kind === "post"
            ? row.slug && `/news/${row.slug}`
            : "/worship/calendar";
    return path ? [{ kind: row.kind, id: Number(row.id), title: row.title, path, snippet: row.snippet ?? "", rank: Number(row.rank), lang: row.lang }] : [];
  });
}
