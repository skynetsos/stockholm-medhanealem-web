import type { Metadata } from "next";
import type { Locale } from "next-intl";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { CmsRichText } from "@/components/richtext/CmsRichText";
import { excerpt } from "@/components/teachings/TeachingCard";
import { localeAlternates } from "@/i18n/alternates";
import { getPublishedTeachings } from "@/lib/cms/teachings";
import { SACRAMENT_PAGES, type SacramentPage as SacramentPageName } from "@/lib/teachings";

async function guidance(locale: string, page: SacramentPageName) {
  const category = SACRAMENT_PAGES.find((s) => s.page === page)!.category;
  const teachings = await getPublishedTeachings(locale as Locale);
  return teachings.filter((t) => t.category === category);
}

export async function sacramentMetadata(locale: string, page: SacramentPageName): Promise<Metadata> {
  const [t, items] = await Promise.all([getTranslations({ locale: locale as Locale, namespace: "sacraments" }), guidance(locale, page)]);
  if (!items.length) return { robots: { index: false } };
  return {
    title: t(page),
    description: excerpt(items[0].body, 160) || undefined,
    alternates: localeAlternates(locale, `/sacraments/${page}`),
  };
}

/**
 * /sacraments/baptism, /marriage, /fitihat: the clergy-approved guidance teachings of that category
 * in full (spec §4). Exists only with guidance (D-018). `children` (e.g. the baptism checklist and
 * request button) appear under the title, before the guidance.
 */
export async function SacramentPage({ locale, page, children }: { locale: string; page: SacramentPageName; children?: ReactNode }) {
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, items] = await Promise.all([getTranslations("sacraments"), guidance(locale, page)]);
  if (!items.length) return <NotFoundContent />;

  return (
    <main id="main" className="mx-auto max-w-3xl px-gutter py-12">
      <h1>{t(page)}</h1>
      {children}
      {items.length > 1 && (
        <nav aria-labelledby="on-this-page" className="mt-6 rounded bg-white p-4 shadow-sm">
          <h2 id="on-this-page" className="text-h4">
            {t("onThisPage")}
          </h2>
          <ul className="mt-2">
            {items.map((teaching) => (
              <li key={teaching.id}>
                <a href={`#${teaching.slug}`} className="inline-flex min-h-11 items-center">
                  {teaching.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {items.map((teaching) => (
        <section key={teaching.id} id={teaching.slug} aria-labelledby={`${teaching.slug}-title`} className="mt-10">
          <h2 id={`${teaching.slug}-title`}>{teaching.title}</h2>
          <CmsRichText data={teaching.body} className="mt-4" />
        </section>
      ))}
    </main>
  );
}
