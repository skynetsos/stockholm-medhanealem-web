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
