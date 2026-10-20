import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { TeachingCard } from "@/components/teachings/TeachingCard";
import { localeAlternates } from "@/i18n/alternates";
import { getPublishedTeachings } from "@/lib/cms/teachings";
import { SACRAMENT_PAGES } from "@/lib/teachings";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "sacraments" });
  return { title: t("title"), alternates: localeAlternates(locale, "/sacraments") };
}

/** /sacraments: the sacrament pages that have guidance, each with the start of its first teaching. */
export default async function SacramentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, teachings] = await Promise.all([getTranslations("sacraments"), getPublishedTeachings(locale as Locale)]);
  const pages = SACRAMENT_PAGES.map((s) => ({ ...s, first: teachings.find((teaching) => teaching.category === s.category) })).filter(
    (s) => s.first,
  );
  if (!pages.length) return <NotFoundContent />;

  return (
    <main id="main" className="mx-auto max-w-site px-gutter py-12">
      <h1 className="mb-8">{t("title")}</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map(({ page, first }) => (
          <li key={page}>
            <TeachingCard title={t(page)} href={`/sacraments/${page}`} body={first!.body} />
          </li>
        ))}
      </ul>
    </main>
  );
}
