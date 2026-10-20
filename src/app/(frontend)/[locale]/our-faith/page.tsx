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
import { FAITH_CATEGORIES, teachingPath } from "@/lib/teachings";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [intro, t] = await Promise.all([
    getPage(locale as Locale, "our-faith", "index"),
    getTranslations({ locale: locale as Locale, namespace: "faith" }),
  ]);
  return {
    title: intro?.seo?.title || intro?.title || t("title"),
    description: intro?.seo?.description || undefined,
    alternates: localeAlternates(locale, "/our-faith"),
  };
}

/**
 * /our-faith (spec §4): the optional "Our Faith" landing page from the CMS (section Our Faith, slug
 * "index") as introduction, then the published teachings grouped by category. Exists only when
 * there is something to show (D-018).
 */
export default async function OurFaithPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, intro, teachings] = await Promise.all([
    getTranslations("faith"),
    getPage(locale as Locale, "our-faith", "index"),
    getPublishedTeachings(locale as Locale),
  ]);
  const groups = FAITH_CATEGORIES.map((category) => ({
    category,
    items: teachings.filter((teaching) => teaching.category === category),
  })).filter((group) => group.items.length > 0);

  if (!intro && !groups.length) return <NotFoundContent />;

  return (
    <main id="main">
      <PageHeader title={intro?.title || t("title")} hero={intro?.hero} />
      {intro && <RenderBlocks blocks={intro.layout} locale={locale as Locale} />}
      <div className="mx-auto flex max-w-site flex-col gap-10 px-gutter py-10">
        {groups.map(({ category, items }) => (
          <section key={category} id={category} aria-labelledby={`${category}-title`}>
            <h2 id={`${category}-title`} className="mb-4">
              {t(`categories.${category}`)}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((teaching) => (
                <li key={teaching.id}>
                  <TeachingCard title={teaching.title} href={teachingPath(teaching.category, teaching.slug)!} body={teaching.body} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
