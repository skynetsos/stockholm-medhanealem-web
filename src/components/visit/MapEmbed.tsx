"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * OpenStreetMap, loaded only after the visitor presses "Show map" (spec §4: consent-loaded embed;
 * nothing third-party loads with the page).
 */
export function MapEmbed({ src, address }: { src: string; address: string }) {
  const t = useTranslations("visit");
  const [shown, setShown] = useState(false);

  return (
    <div className="aspect-[4/3] overflow-hidden rounded bg-white shadow-sm">
      {shown ? (
        <iframe src={src} title={t("mapTitle")} className="h-full w-full border-0" loading="lazy" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="font-semibold">{address}</p>
          <button
            type="button"
            onClick={() => setShown(true)}
            className="min-h-11 rounded bg-primary px-5 font-medium text-cream hover:bg-ink"
          >
            {t("showMap")}
          </button>
          <p className="max-w-sm text-sm text-muted">{t("mapNotice")}</p>
        </div>
      )}
    </div>
  );
}
