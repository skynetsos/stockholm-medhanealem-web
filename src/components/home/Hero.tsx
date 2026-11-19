import Image from "next/image";

import { CmsLink } from "@/components/layout/CmsLink";
import { isRenderableLink } from "@/lib/links";
import { mediaSource, publicMedia } from "@/lib/media";
import type { Homepage, Media } from "@/payload-types";

type Hero = NonNullable<Homepage["hero"]>;

/** Hero is shown when it has a heading or a publishable image. */
export function hasHero(hero: Hero | undefined): boolean {
  return Boolean(hero?.heading?.trim() || publicMedia(hero?.image));
}

/**
 * The page's h1: the hero heading, or the church's name when only an image is set. Centred, with the
 * church's emblem (the site logo) above the name, as on the reference layout (D-049).
 */
export function Hero({ hero, fallbackHeading, emblem }: { hero: Hero; fallbackHeading: string; emblem?: number | Media | null }) {
  const image = publicMedia(hero.image);
  const logo = publicMedia(emblem);
  const logoSource = logo ? mediaSource(logo, 400) : null;
  const source = image ? mediaSource(image, 1600) : null;
  const ctas = (hero.ctas ?? []).filter(isRenderableLink);

  return (
    <section className="on-dark relative isolate overflow-hidden bg-primary text-cream">
      {image && source && (
        <>
          <Image src={source.url} alt={image.alt} fill priority sizes="100vw" className="-z-20 object-cover" />
          {/* Keeps the text readable (>= 4.5:1) on any photo. */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-primary/75" />
        </>
      )}
      <div className="mx-auto flex min-h-72 max-w-site flex-col items-center justify-center gap-4 px-gutter py-14 text-center md:min-h-[32rem]">
        {logo && logoSource && (
          // Decorative: the name follows as the heading.
          <Image src={logoSource.url} width={logoSource.width} height={logoSource.height} alt="" priority sizes="160px" className="h-28 w-28 rounded-full object-contain md:h-36 md:w-36" />
        )}
        <h1 className="max-w-4xl text-cream">{hero.heading?.trim() || fallbackHeading}</h1>
        {hero.subheading && <p className="max-w-2xl text-lg whitespace-pre-line">{hero.subheading}</p>}
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
    </section>
  );
}
