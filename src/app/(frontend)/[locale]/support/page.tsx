import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RenderBlocks } from "@/components/blocks/RenderBlocks";
import { LinkCard } from "@/components/pages/LinkCard";
import { PageHeader } from "@/components/pages/PageHeader";
import { TeachingCard } from "@/components/teachings/TeachingCard";
import { localeAlternates } from "@/i18n/alternates";
import { getAvailablePaths, getPage } from "@/lib/cms/pages";
import { getPublishedTeachings } from "@/lib/cms/teachings";
import { teachingPath } from "@/lib/teachings";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [intro, t] = await Promise.all([getPage(locale as Locale, "support", "index"), getTranslations({ locale: locale as Locale, namespace: "support" })]);
  return {
    title: intro?.seo?.title || intro?.title || t("title"),
    description: intro?.seo?.description || undefined,
    alternates: await localeAlternates(locale, "/support"),
  };
}

/**
 * /support (spec §4, D-045): the optional introduction from the CMS (section Support, slug "index"),
 * the teaching on offerings (መባዕ, category "offerings") and the volunteer form. Always exists,
 * since the volunteer form does. Giving details (Swish, Bankgiro) only if Phase 4 is approved.
 */
export default async function SupportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, tf, ti, intro, teachings, available] = await Promise.all([
    getTranslations("support"),
    getTranslations("faith"),
    getTranslations("inquiryForms"),
    getPage(locale as Locale, "support", "index"),
    getPublishedTeachings(locale as Locale),
    getAvailablePaths(),
  ]);
  const offerings = teachings.filter((teaching) => teaching.category === "offerings");

  return (
    <main id="main">
      <PageHeader title={intro?.title || t("title")} hero={intro?.hero} />
      {intro && <RenderBlocks blocks={intro.layout} locale={locale as Locale} />}
      <div className="mx-auto flex max-w-site flex-col gap-10 px-gutter py-10">
        {offerings.length > 0 && (
          <section aria-labelledby="offerings-title">
            <h2 id="offerings-title" className="mb-4">
              {tf("categories.offerings")}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offerings.map((teaching) => (
                <li key={teaching.id}>
                  <TeachingCard title={teaching.title} href={teachingPath(teaching.category, teaching.slug)!} body={teaching.body} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {/* The card's own heading (h2) names the volunteer form. */}
        {available.includes("/support/volunteer") && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <LinkCard href="/support/volunteer" title={ti("volunteer.title")} text={ti("volunteer.intro")} />
            </li>
          </ul>
        )}
      </div>
    </main>
  );
}
