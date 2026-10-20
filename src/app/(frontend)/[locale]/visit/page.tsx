import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RenderBlocks } from "@/components/blocks/RenderBlocks";
import { PageHeader } from "@/components/pages/PageHeader";
import { VisitDetails } from "@/components/visit/VisitDetails";
import { localeAlternates } from "@/i18n/alternates";
import { getLayoutData } from "@/lib/cms/layout";
import { getPage } from "@/lib/cms/pages";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [intro, t] = await Promise.all([
    getPage(locale as Locale, "visit", "index"),
    getTranslations({ locale: locale as Locale, namespace: "visit" }),
  ]);
  return {
    title: intro?.seo?.title || intro?.title || t("title"),
    description: intro?.seo?.description || undefined,
    alternates: localeAlternates(locale, "/visit"),
  };
}

/**
 * /visit (spec §4): the optional CMS landing page (section Visit, slug "index") as introduction,
 * then address, map (loaded after a click), directions, office contact and social links from Site
 * settings. The contact form joins them in task 6.
 */
export default async function VisitPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, intro, { settings }] = await Promise.all([
    getTranslations("visit"),
    getPage(locale as Locale, "visit", "index"),
    getLayoutData(locale as Locale),
  ]);

  return (
    <main id="main">
      <PageHeader title={intro?.title || t("title")} hero={intro?.hero} />
      {intro && <RenderBlocks blocks={intro.layout} locale={locale as Locale} />}
      <div className="mx-auto max-w-site px-gutter py-10">
        <VisitDetails settings={settings} heading="h2" full />
      </div>
    </main>
  );
}
