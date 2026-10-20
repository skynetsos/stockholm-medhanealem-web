import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { VideoEmbed } from "@/components/media/VideoEmbed";
import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getVideos } from "@/lib/cms/sections";
import { getDateLabels } from "@/lib/date-labels";
import { stockholmDate } from "@/lib/ethiopian-calendar";
import { parseVideoUrl } from "@/lib/video";
import type { Video } from "@/payload-types";

type Props = { params: Promise<{ locale: string }> };

const CATEGORIES: { value: Video["category"]; key: "sermon" | "liturgy" | "event" | "sundaySchool" }[] = [
  { value: "sermon", key: "sermon" },
  { value: "liturgy", key: "liturgy" },
  { value: "event", key: "event" },
  { value: "sunday-school", key: "sundaySchool" },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "media" });
  return { title: t("videos"), alternates: localeAlternates(locale, "/media/videos") };
}

/**
 * /media/videos (spec §2.10): videos and recordings by category, newest first, each loaded from
 * YouTube/Vimeo only after the visitor presses Play (unless an editor switched that off for it).
 */
export default async function VideosPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, videos, labels] = await Promise.all([getTranslations("media"), getVideos(locale as Locale), getDateLabels()]);
  const groups = CATEGORIES.map((c) => ({
    ...c,
    items: videos.map((v) => ({ video: v, ref: parseVideoUrl(v.url) })).filter((v) => v.video.category === c.value && v.ref),
  })).filter((g) => g.items.length);
  if (!groups.length) return <NotFoundContent />;

  return (
    <main id="main" className="mx-auto max-w-site px-gutter py-12">
      <p className="mb-2 text-sm font-semibold">
        <Link href="/media">{t("title")}</Link>
      </p>
      <h1>{t("videos")}</h1>
      {groups.map((group) => (
        <section key={group.value} aria-labelledby={`${group.value}-title`} className="mt-10">
          <h2 id={`${group.value}-title`} className="mb-4">
            {t(`categories.${group.key}`)}
          </h2>
          <ul className="grid gap-8 md:grid-cols-2">
            {group.items.map(({ video, ref }) => (
              <li key={video.id}>
                <h3 className="text-h4">{video.title}</h3>
                <p className="mb-2 text-sm text-muted">
                  <time dateTime={video.date}>{labels.day(stockholmDate(video.date))}</time>
                  {video.kind === "audio" && ` · ${t("audio")}`}
                </p>
                <VideoEmbed video={ref!} title={video.title} caption={video.description} loadImmediately={video.consentRequired === false} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
