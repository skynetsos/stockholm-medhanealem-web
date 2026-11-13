export type VideoRef = { provider: "youtube" | "vimeo" | "facebook"; id: string };

/**
 * Parse a YouTube, Vimeo or Facebook video URL into provider + id. Anything else returns null, so
 * only these providers can ever be embedded (consent-gated embeds are built from the id). Facebook
 * (livestreams, spec Phase 3 task 4, D-042): a page's video or a watch link; the id is the numeric
 * video id and the embed uses Facebook's video plugin.
 */
export function parseVideoUrl(input: string | null | undefined): VideoRef | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return /^[\w-]{11}$/.test(id) ? { provider: "youtube", id } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const fromQuery = url.searchParams.get("v");
    const fromPath = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1];
    const id = fromQuery ?? fromPath;
    return id && /^[\w-]{11}$/.test(id) ? { provider: "youtube", id } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.match(/^\/(?:video\/)?(\d{6,12})(?:\/|$)/)?.[1];
    return id ? { provider: "vimeo", id } : null;
  }
  if (host === "facebook.com" || host === "web.facebook.com") {
    const id = url.pathname.match(/^\/[\w.-]+\/videos\/(?:[\w.-]+\/)?(\d{6,20})\/?$/)?.[1] ?? (url.pathname.replace(/\/$/, "") === "/watch" ? url.searchParams.get("v") : null);
    return id && /^\d{6,20}$/.test(id) ? { provider: "facebook", id } : null;
  }
  return null;
}
