import type { Media } from "../payload-types";

/**
 * A populated, publicly readable Media document, or null (unpopulated id, missing, no file, or no
 * alt text in this language — every image on the site has alt text, CLAUDE.md / WCAG 1.1.1).
 */
export function publicMedia(value: number | Media | null | undefined): Media | null {
  if (!value || typeof value !== "object") return null;
  if (!value.url || !value.permissionObtained || !value.alt?.trim()) return null;
  return value;
}

/**
 * Payload returns absolute file URLs built from serverURL. Our own files are served by this app,
 * so use a relative path: next/image then treats them as local images (no remotePatterns needed).
 */
export function toSitePath(url: string): string {
  try {
    const parsed = new URL(url, "http://local.invalid");
    const site = process.env.NEXT_PUBLIC_SERVER_URL;
    const sameSite = parsed.origin === "http://local.invalid" || (site && parsed.origin === new URL(site).origin);
    return sameSite ? `${parsed.pathname}${parsed.search}` : url;
  } catch {
    return url;
  }
}

/** Pick the smallest generated size at least `minWidth` wide, falling back to the original. */
export function mediaSource(media: Media, minWidth: number): { url: string; width: number; height: number } {
  const sizes = Object.values(media.sizes ?? {}).filter(
    (size): size is { url: string; width: number; height: number } =>
      Boolean(size?.url && size.width && size.height),
  );
  const fit = sizes.filter((size) => size.width >= minWidth).sort((a, b) => a.width - b.width)[0];
  const chosen = fit ?? { url: media.url!, width: media.width ?? minWidth, height: media.height ?? minWidth };
  return { ...chosen, url: toSitePath(chosen.url) };
}

/** Gallery items (thumbnail + large size) for the images that may be shown publicly, in order. */
export function galleryItems(values: (number | Media | null | undefined)[] | null | undefined) {
  return (values ?? [])
    .map((value) => publicMedia(value))
    .filter((media): media is Media => media !== null)
    .map((media) => ({
      id: media.id,
      alt: media.alt,
      caption: media.caption,
      thumb: mediaSource(media, 400),
      full: mediaSource(media, 1600),
    }));
}
