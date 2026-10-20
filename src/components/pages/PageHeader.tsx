import { Hero } from "@/components/home/Hero";
import { CmsLink } from "@/components/layout/CmsLink";
import { isRenderableLink } from "@/lib/links";
import { publicMedia } from "@/lib/media";
import type { Page } from "@/payload-types";

type PageHero = NonNullable<Page["hero"]>;

/**
 * A page's h1: the hero (photo band) when the page has a publishable hero image, otherwise a plain
 * title with the optional subheading and buttons. The heading defaults to the page title.
 */
export function PageHeader({ title, hero }: { title: string; hero?: PageHero | null }) {
  if (hero && publicMedia(hero.image)) return <Hero hero={hero} fallbackHeading={title} />;

  const ctas = (hero?.ctas ?? []).filter(isRenderableLink);
  return (
    <div className="mx-auto max-w-site px-gutter pt-12">
      <h1>{hero?.heading?.trim() || title}</h1>
      {hero?.subheading && <p className="mt-3 max-w-2xl text-lg whitespace-pre-line">{hero.subheading}</p>}
      {ctas.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3 sm:flex-row">
          {ctas.map((cta, i) => (
            <li key={cta.id}>
              <CmsLink
                link={cta.link}
                className={`flex min-h-11 items-center justify-center rounded px-5 font-medium no-underline ${
                  i === 0 ? "bg-primary text-cream hover:bg-ink" : "border-2 border-primary text-primary hover:bg-white"
                }`}
              >
                {cta.label}
              </CmsLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
