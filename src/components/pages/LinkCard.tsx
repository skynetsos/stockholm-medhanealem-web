import Image from "next/image";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { mediaSource, publicMedia } from "@/lib/media";
import type { Media } from "@/payload-types";

/**
 * Card for a department, news post or gallery (spec §5 DepartmentCard etc.): optional image, the
 * title as the link, an optional line above (date) and text below. The image is decorative here:
 * the title names the destination.
 */
export function LinkCard({
  href,
  title,
  image,
  meta,
  text,
}: {
  href: string;
  title: string;
  image?: number | Media | null;
  meta?: ReactNode;
  text?: string | null;
}) {
  const media = publicMedia(image);
  const source = media ? mediaSource(media, 800) : null;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded bg-white shadow-sm">
      {media && source && (
        <Image
          src={source.url}
          width={source.width}
          height={source.height}
          alt=""
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[16/9] h-auto w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-1 p-4">
        {meta && <p className="text-sm text-muted">{meta}</p>}
        <h2 className="text-h4">
          <Link href={href} className="no-underline hover:underline">
            {title}
          </Link>
        </h2>
        {text && <p className="text-muted">{text}</p>}
      </div>
    </article>
  );
}
