import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { NextService } from "@/components/home/NextService";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { localeAlternates } from "@/i18n/alternates";
import { getActiveEvents } from "@/lib/cms/events";
import { getLayoutData } from "@/lib/cms/layout";
import { getDateLabels } from "@/lib/date-labels";
import { nextService } from "@/lib/home";
import { parseVideoUrl } from "@/lib/video";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "worship" });
  return { title: t("livestream"), alternates: localeAlternates(locale, "/worship/livestream") };
}

/**
 * /worship/livestream (spec §4, §10 #9): the livestream from Site settings, loaded only after the
 * visitor presses Play (a YouTube/Vimeo video link), or a plain link for other addresses such as a
 * channel's live page; then the next service. Exists only when a livestream link is set (D-019).
 */
export default async function LivestreamPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, { settings }, events, labels] = await Promise.all([
    getTranslations("worship"),
    getLayoutData(locale as Locale),
    getActiveEvents(locale as Locale),
    getDateLabels(),
  ]);
  const url = settings.livestreamUrl?.startsWith("https://") ? settings.livestreamUrl : null;
  if (!url) return <NotFoundContent />;
  const video = parseVideoUrl(url);
  const service = nextService(events, new Date());

  return (
    <main id="main">
      <div className="mx-auto max-w-3xl px-gutter pt-12">
        <h1 className="mb-6">{t("livestream")}</h1>
        {video ? (
          <VideoEmbed video={video} title={t("livestream")} />
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded bg-primary px-5 font-medium text-cream no-underline hover:bg-ink"
          >
            {t("openLivestream")}
          </a>
        )}
      </div>
      {service && <NextService occurrence={service} settings={{ ...settings, livestreamUrl: null }} labels={labels} />}
    </main>
  );
}
