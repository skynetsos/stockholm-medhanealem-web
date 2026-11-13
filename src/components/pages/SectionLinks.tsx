import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getAvailablePaths, getSectionPages } from "@/lib/cms/pages";
import { pagePath } from "@/lib/pages";

/** The site's own worship pages, linked from the /worship landing page when they exist (D-019). */
const WORSHIP_ROUTES = [
  { path: "/worship/weekly", key: "weekly" },
  { path: "/worship/monthly-feasts", key: "monthlyFeasts" },
  { path: "/worship/annual-feasts", key: "annualFeasts" },
  { path: "/worship/calendar", key: "calendar" },
  { path: "/worship/livestream", key: "livestream" },
] as const;

/**
 * "In this section" on a section's landing page (D-040): links to the section's other published
 * pages (e.g. /our-church/history) and, on /worship, to the worship lists and calendar that exist.
 * Hidden when there is nothing to link to.
 */
export async function SectionLinks({ locale, section }: { locale: Locale; section: string }) {
  const [t, tw, pages, available] = await Promise.all([
    getTranslations({ locale, namespace: "pages" }),
    getTranslations({ locale, namespace: "worship" }),
    getSectionPages(locale, section),
    section === "worship" ? getAvailablePaths() : Promise.resolve([] as string[]),
  ]);
  const links = [
    ...(section === "worship"
      ? WORSHIP_ROUTES.filter((r) => r.path === "/worship/calendar" || available.includes(r.path)).map((r) => ({ href: r.path, title: tw(r.key) }))
      : []),
    ...pages.flatMap((p) => {
      const href = pagePath(section, p.slug);
      return href ? [{ href, title: p.title }] : [];
    }),
  ];
  if (!links.length) return null;

  return (
    <nav aria-labelledby="section-links-title" className="mx-auto max-w-site px-gutter pb-12">
      <h2 id="section-links-title">{t("inThisSection")}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="block h-full rounded bg-white p-4 font-semibold shadow-sm">
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
