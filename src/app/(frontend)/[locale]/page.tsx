import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Fragment, type ReactNode } from "react";

import { GalleryTeaser, galleryImages } from "@/components/home/GalleryTeaser";
import { Hero, hasHero } from "@/components/home/Hero";
import { HolyDays } from "@/components/home/HolyDays";
import { LatestNotice } from "@/components/home/LatestNotice";
import { NextService } from "@/components/home/NextService";
import { hasTeaser, Teaser } from "@/components/home/Teaser";
import { hasVisitInfo, VisitUs } from "@/components/home/VisitUs";
import { localeAlternates } from "@/i18n/alternates";
import { getActiveEvents } from "@/lib/cms/events";
import { getHomeData } from "@/lib/cms/home";
import { getLayoutData } from "@/lib/cms/layout";
import { getDateLabels } from "@/lib/date-labels";
import { type HomeSection, latestNotice, nextService, sectionOrder, upcomingHolyDays } from "@/lib/home";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: localeAlternates(locale) };
}

/**
 * Home page (spec §6 Phase 1 task 4): sections in the order editors set on the Home page global,
 * each hidden when it has no content. The urgent announcement bar is part of every page's layout.
 */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const t = await getTranslations("home");
  const [{ settings }, home, events, labels] = await Promise.all([
    getLayoutData(locale as Locale),
    getHomeData(locale as Locale),
    getActiveEvents(locale as Locale),
    getDateLabels(),
  ]);
  const { homepage } = home;
  const now = new Date();
  const order = sectionOrder(homepage);

  const featuredIds = (homepage.featuredEvents ?? []).map((e) => (typeof e === "object" ? e.id : e));
  const service = nextService(events, now);
  const holyDays = upcomingHolyDays(events, featuredIds, now);
  const notice = latestNotice(home.announcements, now);
  const gallery = galleryImages(home.gallery).length ? home.gallery : null;
  const showHero = order.includes("hero") && hasHero(homepage.hero);

  const sections: Record<HomeSection, () => ReactNode> = {
    hero: () => showHero && <Hero hero={homepage.hero!} fallbackHeading={t("welcome")} />,
    nextService: () => service && <NextService occurrence={service} settings={settings} labels={labels} />,
    upcomingHolyDays: () => holyDays.length > 0 && <HolyDays items={holyDays} labels={labels} />,
    latestNotice: () => notice && <LatestNotice announcement={notice} labels={labels} />,
    about: () => hasTeaser(homepage.about) && <Teaser id="about" teaser={homepage.about!} />,
    sundaySchool: () => hasTeaser(homepage.sundaySchool) && <Teaser id="sunday-school" teaser={homepage.sundaySchool!} />,
    gallery: () => gallery && <GalleryTeaser gallery={gallery} labels={labels} />,
    visit: () => hasVisitInfo(settings) && <VisitUs settings={settings} />,
  };

  return (
    <main id="main">
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
