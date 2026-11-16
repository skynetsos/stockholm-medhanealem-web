import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AudioPlayer } from "@/components/media/AudioPlayer";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { NotFoundContent } from "@/components/pages/NotFoundContent";
import { localeAlternates } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";
import { getVideos } from "@/lib/cms/sections";
import { getDateLabels } from "@/lib/date-labels";
import { stockholmDate } from "@/lib/ethiopian-calendar";
import { filterVideos, playable, VIDEO_CATEGORIES, type VideoFilter } from "@/lib/media-filters";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "media" });
  return { title: t("videos"), alternates: await localeAlternates(locale, "/media/videos") };
}

/**
 * /media/videos (spec §2.10, Phase 3 task 3, D-042): videos and recordings by category, newest
 * first, with filters by type and year (plain links, so they work without JavaScript and can be
 * shared). Videos load from YouTube/Vimeo/Facebook only after the visitor presses Play (unless an
 * editor switched that off for one); uploaded recordings play in the page from this site.
 */
export default async function VideosPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // validated by the [locale] layout
  const [t, videos, labels, query] = await Promise.all([getTranslations("media"), getVideos(locale as Locale), getDateLabels(), searchParams]);
  const all = playable(videos);
  if (!all.length) return <NotFoundContent />;

  const { filter, items, categories, years } = filterVideos(all, query);
  const href = (next: VideoFilter) => {
    const params = new URLSearchParams();
    if (next.category) params.set("category", next.category);
    if (next.year) params.set("year", String(next.year));
    const search = params.toString();
    return search ? `/media/videos?${search}` : "/media/videos";
  };
  const groups = VIDEO_CATEGORIES.map((c) => ({ ...c, items: items.filter((i) => i.video.category === c.value) })).filter((g) => g.items.length);
  const filterLink = (label: string, next: VideoFilter, current: boolean) => (
    <li key={label}>
      <Link
        href={href(next)}
        aria-current={current ? "page" : undefined}
        className={`inline-flex min-h-11 items-center rounded px-3 no-underline ${current ? "bg-primary text-cream" : "bg-white text-ink shadow-sm hover:bg-cream"}`}
      >
        {label}
      </Link>
    </li>
  );

  return (
    <main id="main" className="mx-auto max-w-site px-gutter py-12">
      <p className="mb-2 text-sm font-semibold">
        <Link href="/media">{t("title")}</Link>
      </p>
      <h1>{t("videos")}</h1>

      {(categories.length > 1 || years.length > 1) && (
        <nav aria-label={t("filters")} className="mt-6 space-y-3 print:hidden">
          {categories.length > 1 && (
            <div>
              <h2 className="text-base font-semibold">{t("filterCategory")}</h2>
              <ul className="mt-1 flex flex-wrap gap-2">
                {filterLink(t("all"), { ...filter, category: null }, !filter.category)}
                {categories.map((c) => filterLink(t(`categories.${c.key}`), { ...filter, category: c.value }, filter.category === c.value))}
              </ul>
            </div>
          )}
          {years.length > 1 && (
            <div>
              <h2 className="text-base font-semibold">{t("filterYear")}</h2>
              <ul className="mt-1 flex flex-wrap gap-2">
                {filterLink(t("all"), { ...filter, year: null }, !filter.year)}
                {years.map((y) => filterLink(String(y), { ...filter, year: y }, filter.year === y))}
              </ul>
            </div>
          )}
        </nav>
      )}

      {!groups.length && (
        <p className="mt-8">
          {t("noResults")} <Link href="/media/videos">{t("clearFilters")}</Link>
        </p>
      )}
      {groups.map((group) => (
        <section key={group.value} aria-labelledby={`${group.value}-title`} className="mt-10">
          <h2 id={`${group.value}-title`} className="mb-4">
            {t(`categories.${group.key}`)}
          </h2>
          <ul className="grid gap-8 md:grid-cols-2">
            {group.items.map(({ video, ref, audio }) => (
              <li key={video.id}>
                <h3 className="text-h4">{video.title}</h3>
                <p className="mb-2 text-sm text-muted">
                  <time dateTime={video.date}>{labels.day(stockholmDate(video.date))}</time>
                  {video.kind === "audio" && ` · ${t("audio")}`}
                </p>
                {audio ? (
                  <AudioPlayer src={audio.url} mimeType={audio.mimeType} title={video.title} caption={video.description} />
                ) : (
                  <VideoEmbed video={ref!} title={video.title} caption={video.description} loadImmediately={video.consentRequired === false} />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
