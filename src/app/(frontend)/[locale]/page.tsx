import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Fragment, type ReactNode } from "react";

import { GalleryTeaser, galleryImages } from "@/components/home/GalleryTeaser";
import { Hero, hasHero } from "@/components/home/Hero";
import { LatestNotice } from "@/components/home/LatestNotice";
import { HomeSection } from "@/components/home/HomeSection";
import { hasTeaser, Teaser } from "@/components/home/Teaser";
import { hasVisitInfo, VisitUs } from "@/components/home/VisitUs";
import { JsonLd } from "@/components/seo/JsonLd";
import { FeastBand } from "@/components/worship/FeastBand";
import { ServiceTimes } from "@/components/worship/ServiceTimes";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getActiveEvents } from "@/lib/cms/events";
import { getHomeData } from "@/lib/cms/home";
import { getAvailablePaths } from "@/lib/cms/pages";
import { getLayoutData } from "@/lib/cms/layout";
import { getDateLabels } from "@/lib/date-labels";
import { type HomeSection as Section, latestNotice, nextService, sectionOrder, upcomingHolyDays } from "@/lib/home";
import { churchJsonLd, eventJsonLd } from "@/lib/jsonld";
import { siteOrigin } from "@/lib/seo";
import { upcomingSeries } from "@/lib/worship";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { homepage } = await getHomeData(locale as Locale);
  return { description: homepage.hero?.subheading || undefined, alternates: await localeAlternates(locale) };
}

/**
 * Home page (spec §6 Phase 1 task 4): sections in the order editors set on the Home page global,
 * each hidden when it has no content. The urgent announcement bar is part of every page's layout.
 */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const t = await getTranslations("home");
  const [{ settings }, home, events, labels, available] = await Promise.all([
    getLayoutData(locale as Locale),
    getHomeData(locale as Locale),
    getActiveEvents(locale as Locale),
    getDateLabels(),
    getAvailablePaths(),
  ]);
  // "See all" links only to pages that exist (D-020).
  const linkIf = (href: string, label: string) => (href === "/worship/calendar" || available.includes(href) ? { href, label } : null);
  const { homepage } = home;
  const now = new Date();
  const order = sectionOrder(homepage);

  const featuredIds = (homepage.featuredEvents ?? []).map((e) => (typeof e === "object" ? e.id : e));
  const service = nextService(events, now);
  // The reference layout's full feast list (D-049): up to ten, still the editors' picks if set.
  const holyDays = upcomingHolyDays(events, featuredIds, now, 10);
  const weekly = upcomingSeries(events, ["weekly_service"], now);
  const notice = latestNotice(home.announcements, now);
  const gallery = galleryImages(home.gallery).length ? home.gallery : null;
  const showHero = order.includes("hero") && hasHero(homepage.hero);

  const sections: Record<Section, () => ReactNode> = {
    // Without a hero heading the h1 is the church's name, not a generic "Welcome" (review F-16).
    hero: () =>
      showHero && <Hero hero={homepage.hero!} emblem={settings.logo} fallbackHeading={settings.churchName || settings.shortName || t("welcome")} />,
    // Service-time cards and the feast band, as on the reference layout (D-049).
    nextService: () =>
      weekly.length > 0 && (
        <HomeSection id="service-times" title={t("serviceTimes")} more={linkIf("/worship", t("allServices"))} className="text-center">
          <ServiceTimes series={weekly} labels={labels} />
        </HomeSection>
      ),
    upcomingHolyDays: () => (
      <FeastBand
        id="holy-days"
        title={t("feastDays")}
        items={holyDays}
        labels={labels}
        footer={
          <Link href="/worship/calendar" className="inline-flex min-h-11 items-center font-medium text-cream">
            {t("fullCalendar")}
          </Link>
        }
      />
    ),
    latestNotice: () => notice && <LatestNotice announcement={notice} labels={labels} />,
    about: () => hasTeaser(homepage.about) && <Teaser id="about" teaser={homepage.about!} />,
    sundaySchool: () =>
      hasTeaser(homepage.sundaySchool) && (
        <Teaser
          id="sunday-school"
          teaser={{
            ...homepage.sundaySchool!,
            link: available.includes("/sunday-school") ? { type: "internal", path: "/sunday-school" } : null,
          }}
        />
      ),
    gallery: () =>
      gallery && <GalleryTeaser gallery={gallery} labels={labels} more={linkIf(`/media/galleries/${gallery.slug}`, t("allPhotos"))} />,
    visit: () => hasVisitInfo(settings) && <VisitUs settings={settings} />,
  };

  return (
    <main id="main">
      <JsonLd
        data={[
          churchJsonLd(settings, siteOrigin(), locale),
          ...[service, ...holyDays].filter((o) => o !== null).map((o) => eventJsonLd(o, settings, siteOrigin(), locale)),
        ].filter((d) => d !== null)}
      />
      {/* Every page needs an h1; without a hero it is the welcome line. */}
      {!showHero && (
        <div className="mx-auto max-w-site px-gutter pt-12">
          <h1>{t("welcome")}</h1>
        </div>
      )}
      {order.map((section) => (
        <Fragment key={section}>{sections[section]()}</Fragment>
      ))}
    </main>
  );
}
