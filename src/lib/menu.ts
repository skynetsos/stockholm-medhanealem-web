import type { LinkValue } from "../fields/link";
import { isAvailableLink } from "./links";

type MenuLink = { id?: string | null; label?: string | null; link?: LinkValue | null };
type MenuSource = MenuLink & { children?: MenuLink[] | null };

/** A header item ready to render: a dropdown (children shown) or a plain link. */
export type MenuItem =
  | { kind: "dropdown"; id: string; label: string; children: (MenuLink & { id: string; label: string; link: LinkValue })[] }
  | { kind: "link"; id: string; label: string; link: LinkValue };

/**
 * The header menu as visitors see it (D-049, the reference layout's dropdown menus):
 * - an item with visible sub-items is a dropdown; its own link is not used;
 * - otherwise it is a plain link, shown only if that link leads to a page that exists;
 * - sub-items whose page has no content are left out, so the menu never leads to a 404 (review F-02);
 * - an item with neither is hidden.
 */
export function menuItems(items: readonly MenuSource[] | null | undefined, available: readonly string[]): MenuItem[] {
  const result: MenuItem[] = [];
  for (const [index, item] of (items ?? []).entries()) {
    const label = item.label?.trim();
    if (!label) continue;
    const id = item.id ?? `item-${index}`;
    const children = (item.children ?? [])
      .filter((child) => isAvailableLink(child, available))
      .map((child, i) => ({ ...child, id: child.id ?? `${id}-${i}`, label: child.label!.trim(), link: child.link! }));
    if (children.length) result.push({ kind: "dropdown", id, label, children });
    else if (isAvailableLink(item, available)) result.push({ kind: "link", id, label, link: item.link! });
  }
  return result;
}
