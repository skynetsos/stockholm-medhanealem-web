import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LinkCard } from "@/components/pages/LinkCard";
import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getGalleries, getVideos } from "@/lib/cms/sections";
import { getDateLabels } from "@/lib/date-labels";
import { stockholmDate } from "@/lib/ethiopian-calendar";
import { galleryItems } from "@/lib/media";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "media" });
  return { title: t("title"), alternates: localeAlternates(locale, "/media") };
}

/** /media (spec §4): photo galleries with images that may be shown, and a link to the videos. */
export default async function MediaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, galleries, videos, labels] = await Promise.all([
    getTranslations("media"),
    getGalleries(locale as Locale),
    getVideos(locale as Locale),
    getDateLabels(),
  ]);
  const shown = galleries
    .map((gallery) => ({ gallery, images: galleryItems(gallery.images) }))
    .filter(({ images }) => images.length > 0);
  if (!shown.length && !videos.length) return <NotFoundContent />;

  return (
    <main id="main" className="mx-auto max-w-site px-gutter py-12">
      <h1>{t("title")}</h1>
      {videos.length > 0 && (
        <p className="mt-2">
          <Link href="/media/videos">{t("videos")}</Link>
        </p>
      )}
      {shown.length > 0 && (
        <section aria-labelledby="galleries-title" className="mt-8">
          <h2 id="galleries-title" className="mb-4">
            {t("galleries")}
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(({ gallery, images }) => (
              <li key={gallery.id}>
                <LinkCard
                  href={`/media/galleries/${gallery.slug}`}
                  title={gallery.title}
                  image={gallery.images.find((i) => typeof i === "object" && i.id === images[0].id)}
                  meta={
                    <>
                      <time dateTime={gallery.date}>{labels.day(stockholmDate(gallery.date))}</time> ·{" "}
                      {t("photoCount", { count: images.length })}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
