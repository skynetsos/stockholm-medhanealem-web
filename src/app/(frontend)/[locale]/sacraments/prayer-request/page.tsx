import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InquirySection } from "@/components/forms/InquirySection";
import { localeAlternates } from "@/i18n/alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "inquiryForms" });
  return { title: t("pastoral.title"), alternates: await localeAlternates(locale, "/sacraments/prayer-request") };
}

/**
 * /sacraments/prayer-request (D-050, the reference layout's prayer request): ask a priest for prayer,
 * a visit or a meeting. A form page: it exists only while forms are open (privacy notice in
 * production), like the volunteer form.
 */
export default async function PrayerRequestPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  return (
    <main id="main">
      <InquirySection form="pastoral" heading="h1" />
    </main>
  );
}
