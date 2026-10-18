import { getTranslations } from "next-intl/server";

import type { LayoutData } from "@/lib/cms/layout";
import { isRenderableLink } from "@/lib/links";

import { CmsLink } from "./CmsLink";

const footerLink = "inline-flex min-h-11 items-center text-cream underline decoration-gold underline-offset-4 hover:no-underline";

function currentYear(): string {
  return new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Stockholm" }).format(new Date());
}

export async function SiteFooter({ data }: { data: LayoutData }) {
  const t = await getTranslations("footer");
  const { settings, footer } = data;

  const columns = (footer.columns ?? [])
    .map((column) => ({ ...column, links: (column.links ?? []).filter(isRenderableLink) }))
    .filter((column) => column.heading?.trim() && column.links.length > 0);
  const legal = (footer.legalLinks ?? []).filter(isRenderableLink);
  const diocese = footer.diocese && isRenderableLink(footer.diocese) ? footer.diocese : null;
  const churchName = settings.churchName || settings.shortName;
  const hasLinkRow = Boolean(diocese || legal.length);

  if (!columns.length && !hasLinkRow && !churchName) return null;

  return (
    <footer className="on-dark mt-16 bg-primary text-cream">
      <div className="mx-auto max-w-site px-gutter py-10">
        {columns.length > 0 && (
          <nav aria-label={t("footerNavigation")} className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {columns.map((column) => (
              <div key={column.id}>
                <h2 className="mb-2 font-serif text-lg text-gold">{column.heading}</h2>
                <ul>
                  {column.links.map((item) => (
                    <li key={item.id}>
                      <CmsLink link={item.link} className={footerLink}>
                        {item.label}
                      </CmsLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        )}

        {hasLinkRow && (
        <div
          className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${
            columns.length ? "mt-8 border-t border-cream/30 pt-6" : ""
          }`}
        >
          {diocese && (
            <CmsLink link={diocese.link} className={footerLink}>
              {diocese.label}
            </CmsLink>
          )}
          {legal.length > 0 && (
            <ul className="flex flex-wrap gap-x-6">
              {legal.map((item) => (
                <li key={item.id}>
                  <CmsLink link={item.link} className={footerLink}>
                    {item.label}
                  </CmsLink>
                </li>
              ))}
            </ul>
          )}
        </div>
        )}

        {churchName && <p className={`text-sm ${columns.length || hasLinkRow ? "mt-6" : ""}`}>{t("copyright", { year: currentYear(), churchName })}</p>}
      </div>
    </footer>
  );
}
