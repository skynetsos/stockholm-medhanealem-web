import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RenderBlocks } from "@/components/blocks/RenderBlocks";
import { InquiryForm } from "@/components/forms/InquiryForm";
import { PageHeader } from "@/components/pages/PageHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { VisitDetails } from "@/components/visit/VisitDetails";
import { localeAlternates } from "@/i18n/alternates";
import { getLayoutData } from "@/lib/cms/layout";
import { getAvailablePaths, getPage } from "@/lib/cms/pages";
import { churchJsonLd } from "@/lib/jsonld";
import { siteOrigin } from "@/lib/seo";

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
 * settings, then the contact form (task 6).
 */
export default async function VisitPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, tc, intro, { settings }, available] = await Promise.all([
    getTranslations("visit"),
    getTranslations("contact"),
    getPage(locale as Locale, "visit", "index"),
    getLayoutData(locale as Locale),
    getAvailablePaths(),
  ]);

  return (
    <main id="main">
      <JsonLd data={churchJsonLd(settings, siteOrigin(), locale)} />
      <PageHeader title={intro?.title || t("title")} hero={intro?.hero} />
      {intro && <RenderBlocks blocks={intro.layout} locale={locale as Locale} />}
      <div className="mx-auto max-w-site px-gutter py-10">
        <VisitDetails settings={settings} heading="h2" full />
      </div>
      <section aria-labelledby="contact-title" className="mx-auto max-w-3xl px-gutter py-10">
        <h2 id="contact-title" className="mb-4">
          {tc("title")}
        </h2>
        <InquiryForm
          form="contact"
          titleId="contact-title"
          turnstileSiteKey={process.env.TURNSTILE_SITE_KEY}
          privacyHref={available.includes("/privacy") ? "/privacy" : null}
        />
      </section>
    </main>
  );
}
