import config from "@payload-config";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPayload } from "payload";
import type { ReactNode } from "react";

import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { cleanQuery, MARK_END, MARK_START, MAX_QUERY_LENGTH, searchSite } from "@/lib/search";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "search" });
  // Result pages are never indexed (endless query variations).
  return { title: t("title"), alternates: await localeAlternates(locale, "/search"), robots: { index: false, follow: true } };
}

/** Snippet text with the matched words in <mark>, built from markers (no HTML from the database). */
function highlight(snippet: string): ReactNode[] {
  return snippet.split(MARK_START).flatMap((part, i) => {
    if (i === 0) return [part];
    const [marked, rest = ""] = part.split(MARK_END);
    return [<mark key={i}>{marked}</mark>, rest];
  });
}

/**
 * /search?q= (spec Phase 3 task 6, D-043): a plain GET form (works without JavaScript) and the
 * results in the visitor's language — published pages, teachings, news and calendar events —
 * best match first, each with a snippet around the matched words.
 */
export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, query] = await Promise.all([getTranslations("search"), searchParams]);
  const q = cleanQuery(query.q);
  const results = q ? await searchSite(await getPayload({ config }), locale as Locale, q) : [];

  return (
    <main id="main" className="mx-auto max-w-3xl px-gutter py-12">
      <h1>{t("title")}</h1>
      <form role="search" method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
          <label htmlFor="search-q" className="font-semibold">
            {t("label")}
          </label>
          <input
            id="search-q"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={MAX_QUERY_LENGTH}
            aria-describedby="search-hint"
            className="min-h-11 rounded border border-ink/40 bg-white px-3"
          />
          <p id="search-hint" className="text-sm text-muted">
            {t("hint")}
          </p>
        </div>
        <button type="submit" className="mb-6 min-h-11 rounded bg-primary px-5 font-medium text-cream hover:bg-ink">
          {t("submit")}
        </button>
      </form>

      {q && (
        <section aria-labelledby="search-results" className="mt-8">
          <h2 id="search-results" role="status" className="text-h4">
            {results.length ? t("results", { count: results.length, query: q }) : t("noResults", { query: q })}
          </h2>
          <ol className="mt-4 space-y-6">
            {results.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <p className="text-sm font-semibold text-muted">{t(`kinds.${r.kind}`)}</p>
                {/* Untranslated items are shown in Amharic: say so for screen readers (WCAG 3.1.2). */}
                <h3 className="text-h4" lang={r.lang !== locale ? r.lang : undefined}>
                  <Link href={r.path}>{r.title}</Link>
                </h3>
                {r.snippet && (
                  <p className="mt-1" lang={r.lang !== locale ? r.lang : undefined}>
                    {highlight(r.snippet)}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
