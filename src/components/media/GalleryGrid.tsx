"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { type KeyboardEvent, useRef, useState } from "react";

type Source = { url: string; width: number; height: number };
export type GalleryImage = { id: number; alt: string; caption?: string | null; thumb: Source; full: Source };

const button =
  "flex min-h-11 min-w-11 items-center justify-center rounded bg-cream px-4 font-medium text-primary hover:bg-white";

/**
 * Image grid with a lightbox (spec §5 GalleryGrid). Uses the native <dialog>: focus moves into it,
 * Esc closes it, and focus returns to the thumbnail. Arrow keys step through the images.
 */
export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const t = useTranslations("gallery");
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const [index, setIndex] = useState(0);
  const total = images.length;
  const current = images[index];

  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const step = (by: number) => setIndex((i) => (i + by + total) % total);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  };

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {images.map((image, i) => (
          <li key={image.id}>
            <button
              type="button"
              ref={(el) => {
                thumbs.current[i] = el;
              }}
              onClick={() => open(i)}
              aria-haspopup="dialog"
              aria-label={`${image.alt} (${t("enlarge", { number: String(i + 1), total: String(total) })})`}
              className="block w-full overflow-hidden rounded"
            >
              <Image
                src={image.thumb.url}
                width={image.thumb.width}
                height={image.thumb.height}
                alt=""
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="aspect-[4/3] h-auto w-full object-cover transition-transform hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={current ? current.alt : undefined}
        onKeyDown={onKeyDown}
        onClose={() => thumbs.current[index]?.focus()}
        className="on-dark fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 open:flex open:items-center open:justify-center backdrop:bg-transparent"
      >
        {current && (
          <figure className="flex max-h-[100dvh] w-[min(100vw,72rem)] flex-col items-center gap-3 p-4">
            <Image
              key={current.id}
              src={current.full.url}
              width={current.full.width}
              height={current.full.height}
              alt={current.alt}
              sizes="100vw"
              className="h-auto max-h-[75dvh] w-auto max-w-full rounded"
            />
            <figcaption className="text-center text-cream">
              {current.caption && <span className="block">{current.caption}</span>}
              <span className="text-sm">{t("counter", { number: String(index + 1), total: String(total) })}</span>
            </figcaption>
            <div className="flex gap-3">
              {total > 1 && (
                <button type="button" className={button} onClick={() => step(-1)}>
                  {t("previous")}
                </button>
              )}
              <button type="button" className={button} onClick={() => dialog.current?.close()} autoFocus>
                {t("close")}
              </button>
              {total > 1 && (
                <button type="button" className={button} onClick={() => step(1)}>
                  {t("next")}
                </button>
              )}
            </div>
          </figure>
        )}
      </dialog>
    </>
  );
}
