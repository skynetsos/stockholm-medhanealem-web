import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { CmsRichText } from "@/components/richtext/CmsRichText";
import { excerpt } from "@/components/teachings/TeachingCard";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getPosts } from "@/lib/cms/sections";
import { getDateLabels } from "@/lib/date-labels";
import { mediaSource, publicMedia } from "@/lib/media";

type Props = { params: Promise<{ locale: string; slug: string }> };

// Cached for 5 minutes on first visit like other pages (D-007): an empty list builds nothing ahead.
export function generateStaticParams() {
  return [];
}

async function findPost(locale: string, slug: string) {
  return (await getPosts(locale as Locale)).find((p) => p.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await findPost(locale, slug);
  if (!post) return { robots: { index: false } };
  const cover = publicMedia(post.coverImage);
  const og = cover ? mediaSource(cover, 1200) : null;
  return {
    title: post.title,
    description: post.excerpt || excerpt(post.body, 160) || undefined,
    alternates: localeAlternates(locale, `/news/${slug}`),
    openGraph: { type: "article", publishedTime: post.publishedAt ?? undefined, images: og ? [{ url: og.url, alt: cover!.alt }] : undefined },
  };
}

/**
 * /news/[slug] (spec §2.11): one post with its date and public byline. The author account is
 * internal and never shown (D-014).
 */
export default async function PostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, post, labels] = await Promise.all([getTranslations("news"), findPost(locale, slug), getDateLabels()]);
  if (!post) return <NotFoundContent />;
  const cover = publicMedia(post.coverImage);
  const source = cover ? mediaSource(cover, 1600) : null;

  return (
    <main id="main" className="mx-auto max-w-3xl px-gutter py-12">
      <p className="mb-2 text-sm font-semibold">
        <Link href="/news">{t("title")}</Link>
      </p>
      <h1>{post.title}</h1>
      <p className="mt-2 text-muted">
        {post.publishedAt && <time dateTime={post.publishedAt}>{labels.instant(post.publishedAt)}</time>}
        {post.publishedAt && post.byline && " · "}
        {post.byline}
      </p>
      {cover && source && (
        <Image
          src={source.url}
          width={source.width}
          height={source.height}
          alt={cover.alt}
          sizes="(min-width: 768px) 48rem, 100vw"
          priority
          className="mt-6 h-auto w-full rounded"
        />
      )}
      <CmsRichText data={post.body} className="mt-6" />
    </main>
  );
}
