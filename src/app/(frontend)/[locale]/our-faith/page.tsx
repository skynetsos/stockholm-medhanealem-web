import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RenderBlocks } from "@/components/blocks/RenderBlocks";
import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { PageHeader } from "@/components/pages/PageHeader";
import { FaithIcon } from "@/components/teachings/FaithIcon";
import { TeachingCard } from "@/components/teachings/TeachingCard";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getAvailablePaths, getPage } from "@/lib/cms/pages";
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
    alternates: await localeAlternates(locale, "/our-faith"),
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
  const [t, tm, intro, teachings, available] = await Promise.all([
    getTranslations("faith"),
    getTranslations("media"),
    getPage(locale as Locale, "our-faith", "index"),
    getPublishedTeachings(locale as Locale),
    getAvailablePaths(),
  ]);
  const sermons = available.includes("/media/videos");
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
            {/* Icon cards, as on the reference layout's Our Faith page (D-049). */}
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((teaching) => (
                <li key={teaching.id}>
                  <TeachingCard title={teaching.title} href={teachingPath(teaching.category, teaching.slug)!} body={teaching.body} icon={category} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {sermons && (
          <section aria-labelledby="sermons-title">
            <h2 id="sermons-title" className="mb-4">
              {tm("categories.sermon")}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <li className="flex h-full flex-col items-center gap-3 rounded-md border border-primary/15 bg-white p-6 text-center shadow-sm">
                <FaithIcon name="sermons" />
                <h3 className="text-h4">
                  <Link href="/media/videos" className="no-underline hover:underline">
                    {tm("videos")}
                  </Link>
                </h3>
              </li>
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
