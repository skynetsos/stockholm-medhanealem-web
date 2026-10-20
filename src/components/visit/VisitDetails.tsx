import { getTranslations } from "next-intl/server";

import { validateExternalUrl } from "@/fields/link";
import { addressLines, mapEmbedUrl, mapLink, mapPin } from "@/lib/visit";
import type { SiteSetting } from "@/payload-types";

import { MapEmbed } from "./MapEmbed";

/** Shown when there is an address, directions or a public contact (from Site settings). */
export function hasVisitInfo(settings: SiteSetting): boolean {
  return Boolean(addressLines(settings).length || settings.transitNotes?.trim() || settings.officeEmail || settings.phone);
}

const PLATFORM_NAMES: Record<string, string> = {
  facebook: "Facebook",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  telegram: "Telegram",
};

/**
 * Address with map link, directions, office contact; on the Visit page also the click-to-load map
 * and social links. Everything comes from Site settings; empty parts are left out.
 */
export async function VisitDetails({
  settings,
  heading: Heading = "h3",
  full = false,
}: {
  settings: SiteSetting;
  heading?: "h2" | "h3";
  full?: boolean;
}) {
  const t = await getTranslations("home");
  const tv = await getTranslations("visit");
  const lines = addressLines(settings);
  const link = mapLink(settings);
  const pin = full ? mapPin(settings) : null;
  const social = full ? (settings.socialLinks ?? []).filter((s) => validateExternalUrl(s.url) === true) : [];

  return (
    <div className={`grid gap-8 ${pin ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
      <div className="flex flex-col gap-8">
        {lines.length > 0 && (
          <div>
            <Heading className="text-h4">{t("address")}</Heading>
            <address className="mt-2 not-italic">
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center">
                {t("openMap")}
              </a>
            )}
          </div>
        )}
        {settings.transitNotes?.trim() && (
          <div>
            <Heading className="text-h4">{t("gettingHere")}</Heading>
            <p className="mt-2 whitespace-pre-line">{settings.transitNotes}</p>
          </div>
        )}
        {(settings.officeEmail || settings.phone) && (
          <div>
            <Heading className="text-h4">{t("contact")}</Heading>
            <dl className="mt-2">
              {settings.officeEmail && (
                <div>
                  <dt className="sr-only">{t("email")}</dt>
                  <dd>
                    <a href={`mailto:${settings.officeEmail}`} className="inline-flex min-h-11 items-center">
                      {settings.officeEmail}
                    </a>
                  </dd>
                </div>
              )}
              {settings.phone && (
                <div>
                  <dt className="sr-only">{t("phone")}</dt>
                  <dd>
                    <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-11 items-center">
                      {settings.phone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
        {social.length > 0 && (
          <div>
            <Heading className="text-h4">{tv("followUs")}</Heading>
            <ul className="mt-2 flex flex-wrap gap-x-6">
              {social.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center">
                    {PLATFORM_NAMES[s.platform] ?? new URL(s.url).hostname}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {pin && <MapEmbed src={mapEmbedUrl(pin)} address={lines.join(", ")} />}
    </div>
  );
}
