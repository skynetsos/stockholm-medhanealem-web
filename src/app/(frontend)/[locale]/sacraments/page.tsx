import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RenderBlocks } from "@/components/blocks/RenderBlocks";
import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { PageHeader } from "@/components/pages/PageHeader";
import { TeachingCard } from "@/components/teachings/TeachingCard";
import { localeAlternates } from "@/i18n/alternates";
import { getPage } from "@/lib/cms/pages";
import { getPublishedTeachings } from "@/lib/cms/teachings";
import { SACRAMENT_PAGES } from "@/lib/teachings";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, intro] = await Promise.all([getTranslations({ locale: locale as Locale, namespace: "sacraments" }), getPage(locale as Locale, "sacraments", "index")]);
  return {
    title: intro?.seo?.title || intro?.title || t("title"),
    description: intro?.seo?.description || undefined,
    alternates: localeAlternates(locale, "/sacraments"),
  };
}

/**
 * /sacraments: the optional introduction from the CMS (section Sacraments, slug "index", D-045),
 * then the sacrament pages that have guidance, each with the start of its first teaching.
 */
export default async function SacramentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, teachings, intro] = await Promise.all([
    getTranslations("sacraments"),
    getPublishedTeachings(locale as Locale),
    getPage(locale as Locale, "sacraments", "index"),
  ]);
  const pages = SACRAMENT_PAGES.map((s) => ({ ...s, first: teachings.find((teaching) => teaching.category === s.category) })).filter(
    (s) => s.first,
  );
  if (!pages.length) return <NotFoundContent />;

  return (
    <main id="main">
      <PageHeader title={intro?.title || t("title")} hero={intro?.hero} />
      {intro && <RenderBlocks blocks={intro.layout} locale={locale as Locale} />}
      <ul className="mx-auto grid max-w-site gap-4 px-gutter py-10 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map(({ page, first }) => (
          <li key={page}>
            <TeachingCard title={t(page)} href={`/sacraments/${page}`} body={first!.body} />
          </li>
        ))}
      </ul>
    </main>
  );
}
