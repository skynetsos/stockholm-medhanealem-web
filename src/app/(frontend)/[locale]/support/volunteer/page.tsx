import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InquirySection } from "@/components/forms/InquirySection";
import { localeAlternates } from "@/i18n/alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "inquiryForms" });
  return { title: t("volunteer.title"), alternates: localeAlternates(locale, "/support/volunteer") };
}

/** /support/volunteer (spec §4, Phase 2 task 7): offer to volunteer. Reserved for this page (D-018). */
export default async function VolunteerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  return (
    <main id="main" className="mx-auto max-w-3xl px-gutter py-12">
      <InquirySection form="volunteer" heading="h1" />
    </main>
  );
}
