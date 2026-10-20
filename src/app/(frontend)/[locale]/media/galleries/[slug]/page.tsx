import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GalleryGrid } from "@/components/media/GalleryGrid";
import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getGalleries } from "@/lib/cms/sections";
import { getDateLabels } from "@/lib/date-labels";
import { stockholmDate } from "@/lib/ethiopian-calendar";
import { galleryItems } from "@/lib/media";

type Props = { params: Promise<{ locale: string; slug: string }> };

// Cached for 5 minutes on first visit like other pages (D-007): an empty list builds nothing ahead.
export function generateStaticParams() {
  return [];
}

async function findGallery(locale: string, slug: string) {
  const gallery = (await getGalleries(locale as Locale)).find((g) => g.slug === slug);
  const images = gallery ? galleryItems(gallery.images) : [];
  return gallery && images.length ? { gallery, images } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const found = await findGallery(locale, slug);
  if (!found) return { robots: { index: false } };
  const first = found.images[0];
  return {
    title: found.gallery.title,
    description: found.gallery.description || undefined,
    alternates: localeAlternates(locale, `/media/galleries/${slug}`),
    openGraph: { images: [{ url: first.full.url, alt: first.alt }] },
  };
}

/** /media/galleries/[slug] (spec §2.9): the gallery's permitted photos with a lightbox. */
export default async function GalleryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, found, labels] = await Promise.all([getTranslations("media"), findGallery(locale, slug), getDateLabels()]);
  if (!found) return <NotFoundContent />;
  const { gallery, images } = found;

  return (
    <main id="main" className="mx-auto max-w-site px-gutter py-12">
      <p className="mb-2 text-sm font-semibold">
        <Link href="/media">{t("title")}</Link>
      </p>
      <h1>{gallery.title}</h1>
      <p className="mt-2 text-muted">
        <time dateTime={gallery.date}>{labels.day(stockholmDate(gallery.date))}</time> · {t("photoCount", { count: images.length })}
      </p>
      {gallery.description && <p className="mt-3 max-w-3xl whitespace-pre-line">{gallery.description}</p>}
      <div className="mt-8">
        <GalleryGrid images={images} />
      </div>
    </main>
  );
}
