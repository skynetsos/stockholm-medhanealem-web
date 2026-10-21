import type { Event, SiteSetting } from "../payload-types";
import { formatIsoDate } from "./ethiopian-calendar";
import type { Occurrence } from "./events/expand";
import { mediaSource, publicMedia } from "./media";
import { stockholmIsoWithOffset } from "./stockholm-time";
import { addressLines, mapPin } from "./visit";

/**
 * Structured data for search engines (spec Phase 1 task 8): the church (schema.org Church) and its
 * services and feasts (schema.org Event). Built only from published, public information.
 */
type JsonLd = Record<string, unknown>;

function postalAddress(settings: SiteSetting): JsonLd | undefined {
  if (!addressLines(settings).length) return undefined;
  return {
    "@type": "PostalAddress",
    streetAddress: settings.address?.street || undefined,
    postalCode: settings.address?.postalCode || undefined,
    addressLocality: settings.address?.city || undefined,
    addressCountry: "SE",
  };
}

export function churchJsonLd(settings: SiteSetting, origin: string, locale: string): JsonLd | null {
  const name = settings.churchName || settings.shortName;
  if (!name) return null;
  const pin = mapPin(settings);
  const logo = publicMedia(settings.logo);
  const image = publicMedia(settings.shareImage);
  return {
    "@context": "https://schema.org",
    "@type": "Church",
    "@id": `${origin}/#church`,
    name,
    alternateName: settings.shortName && settings.shortName !== name ? settings.shortName : undefined,
    url: `${origin}/${locale}`,
    address: postalAddress(settings),
    geo: pin ? { "@type": "GeoCoordinates", latitude: pin.latitude, longitude: pin.longitude } : undefined,
    email: settings.officeEmail || undefined,
    telephone: settings.phone || undefined,
    logo: logo ? `${origin}${mediaSource(logo, 400).url}` : undefined,
    image: image ? `${origin}${mediaSource(image, 1200).url}` : undefined,
    sameAs: (settings.socialLinks ?? []).map((s) => s.url).filter((u) => u.startsWith("https://")),
  };
}

const STATUS = {
  scheduled: "https://schema.org/EventScheduled",
  cancelled: "https://schema.org/EventCancelled",
  moved: "https://schema.org/EventRescheduled",
} as const;

export function eventJsonLd(
  occurrence: Occurrence & { event: Event },
  settings: SiteSetting,
  origin: string,
  locale: string,
): JsonLd {
  const { event } = occurrence;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description || undefined,
    startDate: occurrence.allDay ? formatIsoDate(occurrence.date) : stockholmIsoWithOffset(occurrence.start),
    endDate: occurrence.allDay
      ? formatIsoDate(occurrence.endDate)
      : occurrence.end
        ? stockholmIsoWithOffset(occurrence.end)
        : undefined,
    eventStatus: STATUS[occurrence.status],
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.location || settings.defaultLocation || settings.churchName || undefined,
      address: postalAddress(settings),
    },
    organizer: { "@id": `${origin}/#church` },
    url: `${origin}/${locale}/worship/calendar`,
    isAccessibleForFree: true,
  };
}

/** JSON for a <script type="application/ld+json">, safe inside HTML. */
export const serializeJsonLd = (data: JsonLd | JsonLd[]) => JSON.stringify(data).replace(/</g, "\\u003c");
