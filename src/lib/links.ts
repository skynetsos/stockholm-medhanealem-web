import { type LinkValue, validateExternalUrl, validateInternalPath } from "../fields/link";
import { pathExists } from "./cms-routing";
import { pagePath } from "./pages";

export type ResolvedLink = { kind: "internal" | "external"; href: string; newTab: boolean };

/** A menu item is shown only if it has a label (in this locale or the fallback) and a valid link. */
export function isRenderableLink<T extends { label?: string | null; link?: LinkValue | null }>(item: T): boolean {
  return Boolean(item.label?.trim()) && resolveLink(item.link) !== null;
}

/**
 * Like isRenderableLink, and an internal link must also lead to a page that exists, given the list of
 * available addresses (review F-02: no menu or footer link to "page not found").
 */
export function isAvailableLink<T extends { label?: string | null; link?: LinkValue | null }>(item: T, available: readonly string[]): boolean {
  if (!isRenderableLink(item)) return false;
  const resolved = resolveLink(item.link)!;
  return resolved.kind !== "internal" || pathExists(resolved.href, available);
}

/**
 * Turn a CMS link into an href, or null if it is incomplete/invalid (the item is then hidden).
 * A page link resolves only when the page was populated, which for public reads means it is published.
 */
export function resolveLink(link: LinkValue | null | undefined): ResolvedLink | null {
  if (!link) return null;
  const newTab = Boolean(link.newTab);
  if (link.type === "external") {
    return link.url && validateExternalUrl(link.url) === true ? { kind: "external", href: link.url, newTab } : null;
  }
  if (link.type === "page") {
    const page = link.page;
    const href = page && typeof page === "object" ? pagePath(page.section, page.slug) : null;
    return href ? { kind: "internal", href, newTab } : null;
  }
  return link.path && validateInternalPath(link.path) === true ? { kind: "internal", href: link.path, newTab } : null;
}
