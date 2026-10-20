import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RenderBlocks } from "@/components/blocks/RenderBlocks";
import { PageHeader } from "@/components/pages/PageHeader";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getPage } from "@/lib/cms/pages";
import { mediaSource, publicMedia } from "@/lib/media";
import { pagePath } from "@/lib/pages";

type Props = { params: Promise<{ locale: string; section: string; slug: string }> };

// Cached for 5 minutes on first visit like other pages (D-007): an empty list builds nothing ahead.
export function generateStaticParams() {
  return [];
}

/**
 * A CMS page (spec §2.2). Reached only through the middleware, which rewrites the public address
 * of a published page ("/our-church/history") to this route (D-017).
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, section, slug } = await params;
  const page = await getPage(locale as Locale, section, slug);
  const path = pagePath(section, slug);
  if (!page || !path) return { robots: { index: false } };

  const image = publicMedia(page.seo?.ogImage) ?? publicMedia(page.hero?.image);
  const og = image ? mediaSource(image, 1200) : null;
  return {
    title: page.seo?.title || page.title,
    description: page.seo?.description || undefined,
    alternates: localeAlternates(locale, path),
    openGraph: og ? { images: [{ url: og.url, width: og.width, height: og.height, alt: image!.alt }] } : undefined,
  };
}

export default async function CmsPage({ params }: Props) {
  const { locale, section, slug } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const page = await getPage(locale as Locale, section, slug);

  // Only reachable for a page unpublished in the last 30 s (the middleware's list is that old).
  if (!page) {
    const t = await getTranslations("notFound");
    return (
      <main id="main" className="mx-auto max-w-site px-gutter py-12">
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
        <Link href="/">{t("backHome")}</Link>
      </main>
    );
  }

  return (
    <main id="main">
      <PageHeader title={page.title} hero={page.hero} />
      <RenderBlocks blocks={page.layout} locale={locale as Locale} />
    </main>
  );
}
