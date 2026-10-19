import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { CmsLink } from "@/components/layout/CmsLink";
import type { LinkValue } from "@/fields/link";
import { resolveLink } from "@/lib/links";
import { mediaSource, publicMedia } from "@/lib/media";
import type { Media } from "@/payload-types";

export type TeaserContent = {
  heading?: string | null;
  text?: string | null;
  image?: number | Media | null;
  link?: LinkValue | null;
};

/** Shown when it has a heading or text. */
export const hasTeaser = (teaser: TeaserContent | undefined) => Boolean(teaser?.heading?.trim() || teaser?.text?.trim());

/** About / Sunday School teaser: text beside an optional image, optional "read more" link. */
export async function Teaser({ id, teaser }: { id: string; teaser: TeaserContent }) {
  const t = await getTranslations("home");
  const image = publicMedia(teaser.image);
  const source = image ? mediaSource(image, 800) : null;
  const headingId = `${id}-title`;
  const Wrapper = teaser.heading ? "section" : "div";

  return (
    // A landmark only when it has a heading to name it.
    <Wrapper {...(teaser.heading ? { "aria-labelledby": headingId } : {})} className="mx-auto max-w-site px-gutter py-10">
      <div className={`grid items-center gap-6 ${source ? "md:grid-cols-2" : ""}`}>
        <div>
          {teaser.heading && (
            <h2 id={headingId} className="mb-3">
              {teaser.heading}
            </h2>
          )}
          {teaser.text && <p className="whitespace-pre-line">{teaser.text}</p>}
          {resolveLink(teaser.link) && (
            <p className="mt-4">
              <CmsLink link={teaser.link} className="inline-flex min-h-11 items-center font-medium">
                {t("readMore")}
              </CmsLink>
            </p>
          )}
        </div>
        {image && source && (
          <Image
            src={source.url}
            width={source.width}
            height={source.height}
            alt={image.alt}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-auto w-full rounded"
          />
        )}
      </div>
    </Wrapper>
  );
}
