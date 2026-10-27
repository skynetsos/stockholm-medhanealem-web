/**
 * Cache-Control for media files served through Payload (/api/media/file/…; Biruk's task 10 note).
 * File names are unique (a new upload never reuses a live name), so a public file can be cached for
 * a year. Only anonymous requests are cacheable: they can only ever receive images with publication
 * permission (Media read access). Requests from signed-in staff may return private images, so they
 * are never stored by Cloudflare or the browser cache.
 */
export const PUBLIC_MEDIA_CACHE = "public, max-age=31536000, immutable";
export const PRIVATE_MEDIA_CACHE = "private, no-store";

const isSignedIn = (headers: Headers) =>
  headers.has("authorization") || /(?:^|;\s*)payload-token=/.test(headers.get("cookie") ?? "");

export function mediaCacheControl(pathname: string, requestHeaders: Headers, status: number): string | null {
  if (!pathname.startsWith("/api/media/file/")) return null;
  if (isSignedIn(requestHeaders)) return PRIVATE_MEDIA_CACHE;
  return status === 200 || status === 304 ? PUBLIC_MEDIA_CACHE : null;
}
