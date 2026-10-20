import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LinkCard } from "@/components/pages/LinkCard";
import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { excerpt } from "@/components/teachings/TeachingCard";
import { localeAlternates } from "@/i18n/alternates";
import { getPosts } from "@/lib/cms/sections";
import { getDateLabels } from "@/lib/date-labels";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "news" });
  return { title: t("title"), alternates: localeAlternates(locale, "/news") };
}

/** /news (spec §2.11): published posts, newest first. Exists only when there are posts (D-020). */
export default async function NewsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, posts, labels] = await Promise.all([getTranslations("news"), getPosts(locale as Locale), getDateLabels()]);
  if (!posts.length) return <NotFoundContent />;

  return (
    <main id="main" className="mx-auto max-w-site px-gutter py-12">
      <h1 className="mb-8">{t("title")}</h1>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <li key={post.id}>
            <LinkCard
              href={`/news/${post.slug}`}
              title={post.title}
              image={post.coverImage}
              meta={post.publishedAt && <time dateTime={post.publishedAt}>{labels.instant(post.publishedAt)}</time>}
              text={post.excerpt || excerpt(post.body)}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
