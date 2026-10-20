"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import type { VideoRef } from "@/lib/video";

const PROVIDER_NAMES = { youtube: "YouTube", vimeo: "Vimeo" } as const;

const embedUrl = ({ provider, id }: VideoRef, autoplay: boolean) =>
  provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${id}?rel=0${autoplay ? "&autoplay=1" : ""}`
    : `https://player.vimeo.com/video/${id}?dnt=1${autoplay ? "&autoplay=1" : ""}`;

/**
 * Consent-gated video (spec §5 VideoEmbed, §10 #9): nothing is loaded from YouTube/Vimeo until the
 * visitor presses Play. Uses the privacy-enhanced players (youtube-nocookie, Vimeo dnt). An editor
 * can switch the click-to-load step off for a single video (Videos: consentRequired = false); the
 * player then loads with the page but doesn't start by itself.
 */
export function VideoEmbed({
  video,
  title,
  caption,
  loadImmediately = false,
}: {
  video: VideoRef;
  title: string;
  caption?: string | null;
  loadImmediately?: boolean;
}) {
  const t = useTranslations("video");
  const [playing, setPlaying] = useState(loadImmediately);

  return (
    <figure>
      <div className="on-dark aspect-video overflow-hidden rounded bg-ink">
        {playing ? (
          <iframe
            src={embedUrl(video, !loadImmediately)}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-cream">
            <p className="font-semibold">{title}</p>
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="min-h-11 rounded bg-gold px-5 font-medium text-ink hover:bg-cream"
            >
              {t("play")}
            </button>
            <p className="max-w-md text-sm">{t("notice", { provider: PROVIDER_NAMES[video.provider] })}</p>
          </div>
        )}
      </div>
      {caption && <figcaption className="mt-2 text-sm text-muted">{caption}</figcaption>}
    </figure>
  );
}
