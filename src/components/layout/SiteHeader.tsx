import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Link } from "@/i18n/navigation";
import { type LayoutData, publicLocales } from "@/lib/cms/layout";
import { getAvailablePaths } from "@/lib/cms/pages";
import type { LinkValue } from "@/fields/link";
import { isAvailableLink, resolveLink } from "@/lib/links";
import { mediaSource, publicMedia } from "@/lib/media";
import { menuItems } from "@/lib/menu";

import { type NavItem, type NavLink, SiteNav } from "./SiteNav";

function navLink(id: string, label: string, link: LinkValue): NavLink {
  const resolved = resolveLink(link)!; // only called for links that resolve (menuItems / isAvailableLink)
  return { id, label, href: resolved.href, external: resolved.kind === "external", newTab: resolved.newTab };
}

/**
 * The site header in the reference layout (D-049): one sticky green bar with the logo and name on the
 * left, the menu with dropdowns, the "Give" pill, the language switcher and search on the right; a
 * drawer below 1360px. Menu items whose pages have no content are hidden (review F-02).
 */
export async function SiteHeader({ data }: { data: LayoutData }) {
  const [t, available] = await Promise.all([getTranslations("common"), getAvailablePaths()]);
  const { settings, navigation } = data;
  const shortName = settings.shortName?.trim();
  const fullName = settings.churchName?.trim();
  const logo = publicMedia(settings.logo);
  const logoSrc = logo ? mediaSource(logo, 192) : null;

  const items: NavItem[] = menuItems(navigation.headerItems, available).map((item) =>
    item.kind === "link"
      ? { kind: "link", ...navLink(item.id, item.label, item.link) }
      : { kind: "dropdown", id: item.id, label: item.label, children: item.children.map((c) => navLink(c.id, c.label, c.link)) },
  );
  const ctas = (navigation.headerCTAs ?? [])
    .filter((cta) => isAvailableLink(cta, available))
    .map((cta, i) => navLink(cta.id ?? `cta-${i}`, cta.label!.trim(), cta.link!));

  return (
    <header className="on-dark sticky top-0 z-40 bg-primary text-cream shadow-md print:static print:shadow-none">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-cream focus:px-4 focus:py-3 focus:text-primary"
      >
        {t("skipToContent")}
      </a>
      <div className="relative mx-auto flex min-h-18 max-w-[90rem] items-center gap-3 px-gutter py-2 nav:px-6">
        {(shortName || fullName || logoSrc) && (
          <Link href="/" className="flex min-h-11 min-w-0 items-center gap-3 text-cream no-underline nav:min-w-max">
            {logo && logoSrc && (
              <Image
                src={logoSrc.url}
                width={logoSrc.width}
                height={logoSrc.height}
                // The name is in the link text, so the logo is decorative unless there is no name.
                alt={shortName || fullName ? "" : logo.alt}
                className="h-12 w-12 shrink-0 rounded-full object-contain"
                sizes="96px"
                priority
              />
            )}
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-serif text-base font-semibold sm:text-lg">{shortName || fullName}</span>
              {/* The full name on a second line (cut to one line) where the menu is in the drawer; the full menu needs the room from 1360px. */}
              {shortName && fullName && <span className="hidden max-w-80 truncate text-xs text-cream/85 sm:block nav:hidden">{fullName}</span>}
            </span>
          </Link>
        )}
        <SiteNav items={items} ctas={ctas} locales={publicLocales(settings)} />
      </div>
    </header>
  );
}
