import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ClergyCard } from "@/components/clergy/ClergyCard";
import { localeAlternates } from "@/i18n/alternates";
import { getPublishedClergy } from "@/lib/cms/clergy";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "clergy" });
  return { title: t("title"), alternates: localeAlternates(locale, "/our-church/clergy") };
}

/** /our-church/clergy (spec §4): published clergy in their set order, with full bios. */
export default async function ClergyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, clergy] = await Promise.all([getTranslations("clergy"), getPublishedClergy(locale as Locale)]);

  return (
    <main id="main" className="mx-auto max-w-site px-gutter py-12">
      <h1 className="mb-8">{t("title")}</h1>
      {clergy.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clergy.map((person) => (
            <li key={person.id}>
              <ClergyCard person={person} withBio />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
