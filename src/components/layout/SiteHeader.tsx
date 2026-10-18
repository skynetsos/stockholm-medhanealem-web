import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { type LayoutData, publicLocales } from "@/lib/cms/layout";
import { isRenderableLink } from "@/lib/links";

import { CmsLink } from "./CmsLink";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";

const navLink =
  "flex min-h-11 items-center rounded px-3 text-ink no-underline hover:bg-cream hover:text-primary lg:px-2";

export async function SiteHeader({ data }: { data: LayoutData }) {
  const t = await getTranslations("common");
  const { settings, navigation } = data;
  const brand = settings.churchName || settings.shortName;

  // Hide items whose link is incomplete; never render empty menus.
  const items = (navigation.headerItems ?? []).filter(isRenderableLink).map((item) => ({
    ...item,
    children: (item.children ?? []).filter(isRenderableLink),
  }));
  const ctas = (navigation.headerCTAs ?? []).filter(isRenderableLink);
  const hasMenu = items.length > 0 || ctas.length > 0;

  return (
    <header className="relative border-b-4 border-gold bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-3 focus:text-cream"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-x-4 gap-y-2 px-gutter py-2">
        {brand && (
          <Link href="/" className="flex min-h-11 items-center font-serif text-lg font-semibold text-primary no-underline">
            {brand}
          </Link>
        )}

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher locales={publicLocales(settings)} />
          {hasMenu && (
            <MobileMenu>
              <div className="flex flex-col gap-4 pt-4 lg:flex-row lg:items-center lg:gap-6 lg:pt-0">
                {items.length > 0 && (
                  <ul className="flex flex-col lg:flex-row lg:items-center lg:gap-1">
                    {items.map((item) => (
                      <li key={item.id} className="group relative">
                        <CmsLink link={item.link} className={navLink}>
                          {item.label}
                        </CmsLink>
                        {item.children.length > 0 && (
                          <ul className="ml-4 border-l-2 border-cream lg:absolute lg:top-full lg:left-0 lg:z-50 lg:ml-0 lg:hidden lg:min-w-56 lg:border-0 lg:bg-white lg:p-2 lg:shadow-lg lg:group-focus-within:block lg:group-hover:block">
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
                {ctas.length > 0 && (
                  <ul className="flex flex-col gap-2 sm:flex-row">
                    {ctas.map((cta) => (
                      <li key={cta.id}>
                        <CmsLink
                          link={cta.link}
                          className={`flex min-h-11 items-center justify-center rounded px-4 font-medium no-underline ${
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
                )}
              </div>
            </MobileMenu>
          )}
        </div>
      </div>
    </header>
  );
}
