import { getTranslations } from "next-intl/server";
import Image from "next/image";

import type { DateLabels } from "@/lib/date-labels";
import { stockholmDate } from "@/lib/ethiopian-calendar";
import { mediaSource, publicMedia } from "@/lib/media";
import type { Gallery, Media } from "@/payload-types";

import { HomeSection } from "./HomeSection";

const MAX_IMAGES = 4;

/** Images of a gallery that may be shown publicly (populated and permitted). */
export function galleryImages(gallery: Gallery | null): Media[] {
  return (gallery?.images ?? []).map((image) => publicMedia(image)).filter((m): m is Media => m !== null);
}

/** The newest gallery: title, date and its first few permitted photos. */
export async function GalleryTeaser({
  gallery,
  labels,
  more,
}: {
  gallery: Gallery;
  labels: DateLabels;
  more?: { href: string; label: string } | null;
}) {
  const t = await getTranslations("home");
  const images = galleryImages(gallery).slice(0, MAX_IMAGES);

  return (
    <HomeSection id="gallery" title={t("gallery")} more={more}>
      <h3>{gallery.title}</h3>
      <p className="mb-4 text-muted">
        <time dateTime={gallery.date}>{labels.day(stockholmDate(gallery.date))}</time>
      </p>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {images.map((image) => {
          const source = mediaSource(image, 400);
          return (
            <li key={image.id}>
              <Image
                src={source.url}
                width={source.width}
                height={source.height}
                alt={image.alt}
                sizes="(min-width: 768px) 25vw, 50vw"
                className="aspect-[4/3] h-auto w-full rounded object-cover"
              />
            </li>
          );
        })}
      </ul>
    </HomeSection>
  );
}
