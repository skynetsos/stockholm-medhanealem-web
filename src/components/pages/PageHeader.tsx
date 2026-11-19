import { useLocale } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";

import { CmsLink } from "@/components/layout/CmsLink";
import { fallbackLang } from "@/lib/lang";
import { isRenderableLink } from "@/lib/links";
import { mediaSource, publicMedia } from "@/lib/media";
import type { Page } from "@/payload-types";

type PageHero = NonNullable<Page["hero"]>;

type Props = {
  title: string;
  /** A CMS page's hero: heading, subheading, photo (only one with publication permission) and buttons. */
  hero?: PageHero | null;
  /** A line under the title on app pages (in place of a hero subheading). */
  subtitle?: string | null;
  /** A small link above the title, e.g. back to the section ("Media" above a gallery). */
  eyebrow?: ReactNode;
  /** Language of the title when it differs from the page (a fallback translation). */
  titleLang?: string;
  /** id for the h1, for aria-labelledby on the page. */
  titleId?: string;
};

/**
 * The banner at the top of every inner page (D-049, the reference layout): a full-width band with the
 * page title centred and an optional subtitle. With a hero photo that may be published, the photo fills
 * the band behind a green tint (text stays >= 4.5:1); without one, a plain green band (no placeholder
 * image). The heading defaults to the page title.
 */
export function PageHeader({ title, hero, subtitle, eyebrow, titleLang, titleId }: Props) {
  const locale = useLocale();
  const heading = hero?.heading?.trim() || title;
  const sub = hero?.subheading?.trim() || subtitle?.trim() || null;
  const image = publicMedia(hero?.image);
  const source = image ? mediaSource(image, 1600) : null;
  const ctas = (hero?.ctas ?? []).filter(isRenderableLink);

  return (
    <div className="on-dark relative isolate overflow-hidden border-b-4 border-gold bg-primary text-cream">
      {image && source && (
        <>
          <Image src={source.url} alt={image.alt} fill priority sizes="100vw" className="-z-20 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-primary/75" />
        </>
      )}
      <div className={`mx-auto flex max-w-site flex-col items-center justify-center gap-3 px-gutter py-12 text-center ${image ? "min-h-64 md:min-h-80" : "min-h-44 md:min-h-56"}`}>
        {eyebrow && <div className="text-sm font-semibold [&_a]:text-cream">{eyebrow}</div>}
        <h1 id={titleId} className="text-cream" lang={titleLang ?? fallbackLang(heading, locale)}>
          {heading}
        </h1>
        {sub && (
          <p className="max-w-2xl text-lg whitespace-pre-line text-cream/90" lang={fallbackLang(sub, locale)}>
            {sub}
          </p>
        )}
        {ctas.length > 0 && (
          <ul className="mt-2 flex flex-col gap-3 sm:flex-row">
            {ctas.map((cta, i) => (
              <li key={cta.id}>
                <CmsLink
                  link={cta.link}
                  className={`flex min-h-11 items-center justify-center rounded px-5 font-medium no-underline ${
                    i === 0 ? "bg-gold text-ink hover:bg-cream" : "border-2 border-cream text-cream hover:bg-cream hover:text-primary"
                  }`}
                >
                  {cta.label}
                </CmsLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
