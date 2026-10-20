import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { CmsRichText } from "@/components/richtext/CmsRichText";
import { excerpt } from "@/components/teachings/TeachingCard";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getPublishedTeachings } from "@/lib/cms/teachings";
import { isFaithCategory } from "@/lib/teachings";

type Props = { params: Promise<{ locale: string; slug: string }> };

// Cached for 5 minutes on first visit like other pages (D-007): an empty list builds nothing ahead.
export function generateStaticParams() {
  return [];
}

async function findTeaching(locale: string, slug: string) {
  const teachings = await getPublishedTeachings(locale as Locale);
  return teachings.find((t) => t.slug === slug && isFaithCategory(t.category)) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const teaching = await findTeaching(locale, slug);
  if (!teaching) return { robots: { index: false } };
  return {
    title: teaching.title,
    description: excerpt(teaching.body, 160) || undefined,
    alternates: localeAlternates(locale, `/our-faith/${slug}`),
  };
}

/** /our-faith/[slug]: one clergy-approved teaching. Unknown slugs get the 404 from the middleware (D-018). */
export default async function TeachingPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, teaching] = await Promise.all([getTranslations("faith"), findTeaching(locale, slug)]);
  if (!teaching || !isFaithCategory(teaching.category)) return <NotFoundContent />;

  return (
    <main id="main" className="mx-auto max-w-3xl px-gutter py-12">
      <p className="mb-2 text-sm font-semibold">
        <Link href={`/our-faith#${teaching.category}`}>{t(`categories.${teaching.category}`)}</Link>
      </p>
      <h1>{teaching.title}</h1>
      <CmsRichText data={teaching.body} className="mt-6" />
    </main>
  );
}
