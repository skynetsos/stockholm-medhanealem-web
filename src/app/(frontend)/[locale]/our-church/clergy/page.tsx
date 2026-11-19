import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/pages/PageHeader";

import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { ClergyCard } from "@/components/clergy/ClergyCard";
import { localeAlternates } from "@/i18n/alternates";
import { getPublishedClergy } from "@/lib/cms/clergy";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "clergy" });
  return { title: t("title"), alternates: await localeAlternates(locale, "/our-church/clergy") };
}

/** /our-church/clergy (spec §4): published clergy in their set order, with full bios. */
export default async function ClergyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, clergy] = await Promise.all([getTranslations("clergy"), getPublishedClergy(locale as Locale)]);

  // Exists only with published profiles (the middleware 404s it otherwise; review F-15).
  if (!clergy.length) return <NotFoundContent />;

  return (
    <main id="main">
      <PageHeader title={t("title")} />
      <div className="mx-auto max-w-site px-gutter py-12">
        {clergy.length > 0 && (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {clergy.map((person) => (
              <li key={person.id}>
                <ClergyCard person={person} withBio />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
