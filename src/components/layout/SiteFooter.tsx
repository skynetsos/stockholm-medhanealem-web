import { getTranslations } from "next-intl/server";

import type { LayoutData } from "@/lib/cms/layout";
import { getAvailablePaths } from "@/lib/cms/pages";
import { isAvailableLink, isRenderableLink } from "@/lib/links";
import { addressLines, mapLink } from "@/lib/visit";
import type { SiteSetting } from "@/payload-types";

import { CmsLink } from "./CmsLink";

const footerLink = "inline-flex min-h-11 items-center text-cream no-underline hover:underline decoration-gold underline-offset-4";
const heading = "mb-3 font-serif text-lg text-cream";

function currentYear(): string {
  return new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Stockholm" }).format(new Date());
}

type Social = NonNullable<SiteSetting["socialLinks"]>[number];
const PLATFORM_NAMES: Record<Social["platform"], string> = {
  facebook: "Facebook",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  telegram: "Telegram",
  other: "",
};

function SocialIcon({ platform }: { platform: Social["platform"] }) {
  const common = { "aria-hidden": true, width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (platform) {
    case "facebook":
      return (
        <svg {...common}>
          <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
          <path d="m10 9.5 4.5 2.5-4.5 2.5z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...common}>
          <path d="m21 4-18 7 6 2 2 6 3-4 5 4z" />
          <path d="m9 13 8-6" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 3c.5 3 2.5 4.5 5 4.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
  }
}

/**
 * The footer in the reference layout (D-049): identity and contact details, the link columns from the
 * Footer global, and "find us"; then a bottom bar with the copyright, legal links, the diocese and the
 * social links. Every part is hidden while it has no content (no placeholders).
 */
export async function SiteFooter({ data }: { data: LayoutData }) {
  const [t, available] = await Promise.all([getTranslations("footer"), getAvailablePaths()]);
  const { settings, footer } = data;

  const columns = (footer.columns ?? [])
    .map((column) => ({ ...column, links: (column.links ?? []).filter((l) => isAvailableLink(l, available)) }))
    .filter((column) => column.heading?.trim() && column.links.length > 0);
  // Not linked until published (e.g. /privacy, /cookies; review F-02).
  const legal = (footer.legalLinks ?? []).filter((l) => isAvailableLink(l, available));
  const diocese = footer.diocese && isRenderableLink(footer.diocese) ? footer.diocese : null;
  const churchName = settings.churchName || settings.shortName;
  const address = addressLines(settings);
  const map = mapLink(settings);
  const phone = settings.phone?.trim();
  const email = settings.officeEmail?.trim();
  const socials = (settings.socialLinks ?? []).filter((s) => /^https:\/\//.test(s.url ?? ""));

  if (!columns.length && !churchName && !address.length) return null;

  return (
    <footer className="on-dark mt-16 bg-primary text-cream">
      <div className="mx-auto max-w-[90rem] px-gutter py-12 nav:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Identity and contact (name; phone and email once entered) */}
          {(churchName || phone || email) && (
            <div>
              {settings.shortName && <p className={heading}>{settings.shortName}</p>}
              {settings.churchName && <p className="text-sm text-cream/85">{settings.churchName}</p>}
              {/* The address is under "Find us"; the office phone and email only once entered. */}
              {phone && (
                <p className="mt-3">
                  <span className="sr-only">{t("phone")}: </span>
                  <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={footerLink}>
                    {phone}
                  </a>
                </p>
              )}
              {email && (
                <p>
                  <span className="sr-only">{t("email")}: </span>
                  <a href={`mailto:${email}`} className={footerLink}>
                    {email}
                  </a>
                </p>
              )}
            </div>
          )}

          {/* 2–3. Link columns from the Footer global */}
          {columns.length > 0 && (
            <nav aria-label={t("footerNavigation")} className="grid gap-10 sm:col-span-2 sm:grid-cols-2">
              {columns.map((column) => (
                <div key={column.id}>
                  <h2 className={heading}>{column.heading}</h2>
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

          {/* 4. Find us: the address and a map link (no embedded map: it would load a third party). */}
          {address.length > 0 && (
            <div>
              <h2 className={heading}>{t("findUs")}</h2>
              <address className="not-italic">
                {address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              {map && (
                <a href={map} className={footerLink} target="_blank" rel="noopener noreferrer">
                  {t("openMap")}
                </a>
              )}
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-cream/30 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
            {churchName && <p className="text-sm">{t("copyright", { year: currentYear(), churchName })}</p>}
            {legal.length > 0 && (
              <ul className="flex flex-wrap gap-x-6">
                {legal.map((item) => (
                  <li key={item.id}>
                    <CmsLink link={item.link} className={`${footerLink} text-sm`}>
                      {item.label}
                    </CmsLink>
                  </li>
                ))}
              </ul>
            )}
            {diocese && (
              <CmsLink link={diocese.link} className={`${footerLink} text-sm`}>
                {diocese.label}
              </CmsLink>
            )}
          </div>
          {socials.length > 0 && (
            <ul aria-label={t("social")} className="flex gap-1">
              {socials.map((social) => (
                <li key={social.id ?? social.url}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={PLATFORM_NAMES[social.platform] || social.url}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-cream hover:bg-white/10"
                  >
                    <SocialIcon platform={social.platform} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
