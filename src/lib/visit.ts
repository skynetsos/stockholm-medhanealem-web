import { validateExternalUrl } from "../fields/link";
import type { SiteSetting } from "../payload-types";

export type MapPin = { latitude: number; longitude: number };

export const addressLines = (settings: Pick<SiteSetting, "address">): string[] =>
  [settings.address?.street, [settings.address?.postalCode, settings.address?.city].filter(Boolean).join(" ")].filter(
    (line): line is string => Boolean(line?.trim()),
  );

/** The map pin from Site settings, when both coordinates are filled in and valid. */
export function mapPin(settings: Pick<SiteSetting, "mapLocation">): MapPin | null {
  const { latitude, longitude } = settings.mapLocation ?? {};
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

/**
 * "Open in a map" link: the map link from Site settings, else OpenStreetMap at the pin, else an
 * OpenStreetMap search for the address. Null when there is nothing to point at.
 */
export function mapLink(settings: Pick<SiteSetting, "mapUrl" | "mapLocation" | "address">): string | null {
  if (settings.mapUrl && validateExternalUrl(settings.mapUrl) === true) return settings.mapUrl;
  const pin = mapPin(settings);
  if (pin) return `https://www.openstreetmap.org/?mlat=${pin.latitude}&mlon=${pin.longitude}#map=17/${pin.latitude}/${pin.longitude}`;
  const lines = addressLines(settings);
  return lines.length ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(lines.join(", "))}` : null;
}

/** OpenStreetMap embed around the pin (about 700 × 500 m) with a marker. */
export function mapEmbedUrl({ latitude, longitude }: MapPin): string {
  const dLon = 0.005;
  const dLat = 0.0025;
  const bbox = [longitude - dLon, latitude - dLat, longitude + dLon, latitude + dLat].map((n) => n.toFixed(6)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude},${longitude}`;
}
