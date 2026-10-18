import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeAlternates } from "@/i18n/alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: localeAlternates(locale) };
}

// Phase 0 placeholder home page; the real homepage sections arrive in Phase 1 (spec §6 Phase 1 task 4).
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const t = await getTranslations("home");

  return (
    <main id="main" className="mx-auto max-w-site px-gutter py-12">
      <h1>{t("welcome")}</h1>
    </main>
  );
}
