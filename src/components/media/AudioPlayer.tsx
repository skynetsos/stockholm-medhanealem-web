import { useTranslations } from "next-intl";

/**
 * Audio player for sermon and liturgy recordings (spec Phase 3 task 3, D-042): the browser's own
 * player (keyboard and screen-reader accessible), served from this site, loading nothing until the
 * visitor presses play (preload="none"). A download link is offered as well.
 */
export function AudioPlayer({ src, mimeType, title, caption }: { src: string; mimeType?: string | null; title: string; caption?: string | null }) {
  const t = useTranslations("media");
  return (
    <figure>
      <audio controls preload="none" className="w-full" aria-label={title}>
        <source src={src} type={mimeType ?? undefined} />
        {t("audioFallback")}
      </audio>
      <figcaption className="mt-2 text-sm text-muted">
        {caption && <span className="block">{caption}</span>}
        <a href={src} download>
          {t("download")}
        </a>
      </figcaption>
    </figure>
  );
}
