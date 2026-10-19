import { getTranslations } from "next-intl/server";

import { validateExternalUrl } from "@/fields/link";
import type { SiteSetting } from "@/payload-types";

import { HomeSection } from "./HomeSection";

const addressLines = (settings: SiteSetting) =>
  [settings.address?.street, [settings.address?.postalCode, settings.address?.city].filter(Boolean).join(" ")].filter(
    (line): line is string => Boolean(line?.trim()),
  );

/** Shown when there is an address, directions or a public contact (from Site settings). */
export function hasVisitInfo(settings: SiteSetting): boolean {
  return Boolean(addressLines(settings).length || settings.transitNotes?.trim() || settings.officeEmail || settings.phone);
}

/** Address, map link, public transport directions and office contact. */
export async function VisitUs({ settings }: { settings: SiteSetting }) {
  const t = await getTranslations("home");
  const lines = addressLines(settings);
  const map = settings.mapUrl && validateExternalUrl(settings.mapUrl) === true ? settings.mapUrl : null;
  const contact = settings.officeEmail || settings.phone;

  return (
    <HomeSection id="visit" title={t("visit")}>
      <div className="grid gap-8 md:grid-cols-3">
        {lines.length > 0 && (
          <div>
            <h3 className="text-h4">{t("address")}</h3>
            <address className="mt-2 not-italic">
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            {map && (
              <a href={map} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center">
                {t("openMap")}
              </a>
            )}
          </div>
        )}
        {settings.transitNotes?.trim() && (
          <div>
            <h3 className="text-h4">{t("gettingHere")}</h3>
            <p className="mt-2 whitespace-pre-line">{settings.transitNotes}</p>
          </div>
        )}
        {contact && (
          <div>
            <h3 className="text-h4">{t("contact")}</h3>
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
      </div>
    </HomeSection>
  );
}
