import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InquirySection } from "@/components/forms/InquirySection";
import { localeAlternates } from "@/i18n/alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "inquiryForms" });
  return { title: t("sunday_school.title"), alternates: await localeAlternates(locale, "/sunday-school/join") };
}

/**
 * /sunday-school/join (spec Phase 2 task 7): registration for Sunday School. Exists while the
 * Sunday School section does (middleware, D-033).
 */
export default async function SundaySchoolJoinPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const t = await getTranslations("sundaySchool");
  return (
    <main id="main">
      <InquirySection form="sunday_school" heading="h1" back={{ href: "/sunday-school", label: t("title") }} />
    </main>
  );
}
