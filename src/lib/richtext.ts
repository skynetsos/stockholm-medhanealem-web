import { pagePath } from "./pages";

/** Plain text of a Lexical rich-text value (for "is it empty?" checks and excerpts). */
export function richTextToPlain(value: unknown): string {
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { text?: unknown; children?: unknown[] };
    if (typeof n.text === "string") parts.push(n.text);
    if (Array.isArray(n.children)) n.children.forEach(walk);
  };
  walk((value as { root?: unknown } | null)?.root);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export const hasRichText = (value: unknown) => richTextToPlain(value).length > 0;

type LinkFields = {
  linkType?: string | null;
  url?: string | null;
  doc?: { relationTo?: string; value?: unknown } | null;
};

/**
 * Where a link inside rich text points, or null to show its text without a link. Internal links
 * work only to published pages (an unpublished page isn't populated for the public); site paths
 * get the visitor's language; only http(s), mailto and tel links are allowed outside the site.
 */
export function richTextLinkHref(fields: LinkFields, locale: string): string | null {
  if (fields.linkType === "internal") {
    const value = fields.doc?.value as { section?: string; slug?: string } | undefined;
    if (fields.doc?.relationTo !== "pages" || !value || typeof value !== "object") return null;
    const path = pagePath(value.section, value.slug);
    return path ? `/${locale}${path}` : null;
  }
  const url = fields.url?.trim();
  if (!url) return null;
  if (url.startsWith("#")) return url;
  if (url.startsWith("/") && !url.startsWith("//")) {
    return /^\/(am|en|sv)(\/|$)/.test(url) ? url : `/${locale}${url === "/" ? "" : url}`;
  }
  return /^(https?:|mailto:|tel:)/i.test(url) ? url : null;
}
