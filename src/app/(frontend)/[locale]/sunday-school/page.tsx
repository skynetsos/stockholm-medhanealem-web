import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RenderBlocks } from "@/components/blocks/RenderBlocks";
import { LinkCard } from "@/components/pages/LinkCard";
import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { PageHeader } from "@/components/pages/PageHeader";
import { localeAlternates } from "@/i18n/alternates";
import { getPage } from "@/lib/cms/pages";
import { getDepartments } from "@/lib/cms/sections";
import { hasDepartmentContent } from "@/lib/departments";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [intro, t] = await Promise.all([
    getPage(locale as Locale, "sunday-school", "index"),
    getTranslations({ locale: locale as Locale, namespace: "sundaySchool" }),
  ]);
  return {
    title: intro?.seo?.title || intro?.title || t("title"),
    description: intro?.seo?.description || undefined,
    alternates: localeAlternates(locale, "/sunday-school"),
  };
}

/**
 * /sunday-school (spec §4): the optional CMS landing page (section Sunday School, slug "index") as
 * introduction, then the departments that have content (D-020).
 */
export default async function SundaySchoolPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, intro, departments] = await Promise.all([
    getTranslations("sundaySchool"),
    getPage(locale as Locale, "sunday-school", "index"),
    getDepartments(locale as Locale),
  ]);
  const shown = departments.filter(hasDepartmentContent);
  if (!intro && !shown.length) return <NotFoundContent />;

  return (
    <main id="main">
      <PageHeader title={intro?.title || t("title")} hero={intro?.hero} />
      {intro && <RenderBlocks blocks={intro.layout} locale={locale as Locale} />}
      {shown.length > 0 && (
        <ul className="mx-auto grid max-w-site gap-6 px-gutter py-10 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((d) => (
            <li key={d.id}>
              <LinkCard href={`/sunday-school/${d.slug}`} title={d.name} image={d.image} text={d.summary} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
