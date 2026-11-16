import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Link } from "@/i18n/navigation";
import { type LayoutData, publicLocales } from "@/lib/cms/layout";
import { getAvailablePaths } from "@/lib/cms/pages";
import { isAvailableLink } from "@/lib/links";
import { mediaSource, publicMedia } from "@/lib/media";
import type { Navigation } from "@/payload-types";

import { CmsLink } from "./CmsLink";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";

// Amharic labels are long, so on xl (1280px+) the header has two rows: church name, language
// switcher and buttons on top, the full-width menu below. Smaller screens use the drawer.
const navLink =
  "flex min-h-11 items-center rounded px-3 whitespace-nowrap text-ink no-underline hover:bg-cream hover:text-primary xl:px-2";

type Cta = NonNullable<Navigation["headerCTAs"]>[number];

function CtaButtons({ ctas, className }: { ctas: Cta[]; className: string }) {
  return (
    <ul className={className}>
      {ctas.map((cta) => (
        <li key={cta.id}>
          <CmsLink
            link={cta.link}
            className={`flex min-h-11 items-center justify-center rounded px-4 font-medium whitespace-nowrap no-underline ${
              cta.style === "secondary"
                ? "border-2 border-primary text-primary hover:bg-cream"
                : "bg-primary text-cream hover:bg-ink"
            }`}
          >
            {cta.label}
          </CmsLink>
        </li>
      ))}
    </ul>
  );
}

export async function SiteHeader({ data }: { data: LayoutData }) {
  const [t, available] = await Promise.all([getTranslations("common"), getAvailablePaths()]);
  const { settings, navigation } = data;
  const brand = settings.churchName || settings.shortName;
  const logo = publicMedia(settings.logo);
  const logoSrc = logo ? mediaSource(logo, 192) : null;

  // Hide items whose label or link is missing; never render empty menus.
  // Links to pages without content (e.g. /news before the first post, the baptism request while
  // requests are closed) are hidden, not shown as dead ends (review F-01, F-02).
  const shown = <T extends Parameters<typeof isAvailableLink>[0]>(item: T) => isAvailableLink(item, available);
  const items = (navigation.headerItems ?? []).filter(shown).map((item) => ({
    ...item,
    children: (item.children ?? []).filter(shown),
  }));
  const ctas = (navigation.headerCTAs ?? []).filter(shown);
  const hasMenu = items.length > 0 || ctas.length > 0;

  return (
    <header className="relative border-b-4 border-gold bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-3 focus:text-cream"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex max-w-site flex-wrap items-center gap-x-4 gap-y-1 px-gutter py-2">
        {(brand || logoSrc) && (
          <Link
            href="/"
            className="flex min-h-11 min-w-0 flex-1 basis-64 items-center gap-3 font-serif text-lg font-semibold text-primary no-underline"
          >
            {logo && logoSrc && (
              <Image
                src={logoSrc.url}
                width={logoSrc.width}
                height={logoSrc.height}
                // The name is in the link text, so the logo is decorative unless there is no name.
                alt={brand ? "" : logo.alt}
                className="h-12 w-auto shrink-0"
                sizes="96px"
                priority
              />
            )}
            {brand}
          </Link>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Site search (Phase 3, D-043); the label shows from small screens up, always for screen readers. */}
          <Link href="/search" className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded px-2 text-ink no-underline hover:bg-cream print:hidden">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" strokeLinecap="round" />
            </svg>
            <span className="sr-only sm:not-sr-only">{t("search")}</span>
          </Link>
          <LocaleSwitcher locales={publicLocales(settings)} />
        </div>

        {/* Buttons in the top row on xl; inside the drawer below that (only one copy is ever displayed). */}
        {ctas.length > 0 && <CtaButtons ctas={ctas} className="hidden gap-2 xl:flex" />}

        {hasMenu && (
          <MobileMenu>
            <div className="flex flex-col gap-4 pt-4 xl:pt-0">
              {items.length > 0 && (
                <ul className="flex flex-col xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
                  {items.map((item) => (
                    <li key={item.id} className="group relative">
                      <CmsLink link={item.link} className={navLink}>
                        {item.label}
                      </CmsLink>
                      {item.children.length > 0 && (
                        <ul className="ml-4 border-l-2 border-cream xl:absolute xl:top-full xl:left-0 xl:z-50 xl:ml-0 xl:hidden xl:min-w-56 xl:border-0 xl:bg-white xl:p-2 xl:shadow-lg xl:group-focus-within:block xl:group-hover:block">
                          {item.children.map((child) => (
                            <li key={child.id}>
                              <CmsLink link={child.link} className={navLink}>
                                {child.label}
                              </CmsLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {ctas.length > 0 && <CtaButtons ctas={ctas} className="flex flex-col gap-2 sm:flex-row xl:hidden" />}
            </div>
          </MobileMenu>
        )}
      </div>
    </header>
  );
}
