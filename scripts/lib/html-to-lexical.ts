/**
 * Converts the body HTML of a WordPress/Elementor page into Payload's Lexical rich text (Phase 1
 * task 7, HTML fallback, D-040). Keeps what carries meaning: headings, paragraphs, bullet and
 * numbered lists, quotes, bold/italic and line breaks. Layout wrappers (div, section, span),
 * images, embeds, forms and scripts are dropped; links keep their text only (old-site URLs).
 * No dependencies: the markup Elementor produces is regular enough for a small tokenizer.
 */

type TextNode = { type: "text"; text: string; format: number; detail: 0; mode: "normal"; style: ""; version: 1 };
type LineBreak = { type: "linebreak"; version: 1 };
type Inline = TextNode | LineBreak;
type Base = { direction: "ltr"; format: ""; indent: 0; version: 1 };
type Paragraph = Base & { type: "paragraph"; children: Inline[]; textFormat: 0; textStyle: "" };
type Heading = Base & { type: "heading"; tag: "h2" | "h3" | "h4"; children: Inline[] };
type Quote = Base & { type: "quote"; children: Inline[] };
type ListItem = Base & { type: "listitem"; value: number; children: Inline[] };
type List = Base & { type: "list"; listType: "bullet" | "number"; start: 1; tag: "ul" | "ol"; children: ListItem[] };
export type LexicalBlock = Paragraph | Heading | Quote | List;
export type LexicalDoc = { root: Base & { type: "root"; children: LexicalBlock[] } };

const BOLD = 1;
const ITALIC = 2;
const BASE: Base = { direction: "ltr", format: "", indent: 0, version: 1 };

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return NAMED[code.toLowerCase()] ?? whole;
  });
}

// <button> is kept: Elementor accordions use it for their section titles (made H2 below; review F-06).
const DROPPED = /<(script|style|noscript|svg|iframe|form|select|template)\b[^>]*>[\s\S]*?<\/\1>/gi;
const BLOCK_CONTAINERS = new Set(["div", "section", "article", "header", "footer", "aside", "figure", "figcaption", "table", "tr", "td", "th", "tbody", "thead", "main", "nav"]);

/** Converts HTML to Lexical. `skip` drops blocks whose whole text equals one of these strings. */
export function htmlToLexical(html: string, skip: readonly string[] = []): LexicalDoc {
  const blocks: LexicalBlock[] = [];
  const formats: number[] = [];
  const lists: List[] = [];
  type Open = { kind: "p" | "h2" | "h3" | "h4" | "quote" | "li"; children: Inline[] };
  let current: Open | null = null;
  // Closures reassign `current`, which TypeScript's narrowing can't see: read it through this.
  const open = () => current as Open | null;

  const format = () => formats.reduce((acc, f) => acc | f, 0);

  const flush = () => {
    if (!current) return;
    const children = tidy(current.children);
    const text = plain(children);
    const block = current;
    current = null;
    if (!text || skip.includes(text)) return;
    if (block.kind === "li") {
      // An <li> outside any list (broken markup) gets a bullet list of its own.
      let list = lists[lists.length - 1];
      const previous = blocks[blocks.length - 1];
      if (!list) {
        list = previous?.type === "list" ? previous : newList("ul");
        if (list !== previous) blocks.push(list);
      }
      list.children.push({ ...BASE, type: "listitem", value: list.children.length + 1, children });
      return;
    }
    if (block.kind === "p") blocks.push({ ...BASE, type: "paragraph", children, textFormat: 0, textStyle: "" });
    else if (block.kind === "quote") blocks.push({ ...BASE, type: "quote", children });
    else blocks.push({ ...BASE, type: "heading", tag: block.kind, children });
  };

  const newList = (tag: "ul" | "ol"): List => ({ ...BASE, type: "list", listType: tag === "ol" ? "number" : "bullet", start: 1, tag, children: [] });

  /** Nested lists are flattened into the outer one (the old site has none worth keeping as such). */
  const openList = (tag: "ul" | "ol") => {
    if (lists.length) return lists.push(lists[lists.length - 1]);
    const list = newList(tag);
    blocks.push(list);
    lists.push(list);
  };

  const start = (kind: Open["kind"]) => {
    flush();
    current = { kind, children: [] };
  };

  const source = html.replace(/<!--[\s\S]*?-->/g, "").replace(DROPPED, " ");
  for (const token of source.match(/<\/?[a-z][a-z0-9]*\b[^>]*>|[^<]+|</gi) ?? []) {
    const tag = /^<(\/?)([a-z][a-z0-9]*)/i.exec(token);
    if (!tag) {
      const text = decodeEntities(token).replace(/\s+/g, " ");
      if (!text.trim() && !open()) continue;
      if (!open()) start("p");
      open()!.children.push({ type: "text", text, format: format(), detail: 0, mode: "normal", style: "", version: 1 });
      continue;
    }
    const closing = tag[1] === "/";
    const name = tag[2].toLowerCase();
    if (/^h[1-6]$/.test(name)) {
      if (closing) flush();
      else start(name === "h1" || name === "h2" ? "h2" : name === "h3" ? "h3" : "h4");
    } else if (name === "p") {
      if (closing) flush();
      else start("p");
    } else if (name === "button") {
      // An accordion title (Elementor): a heading for the list that follows.
      if (closing) flush();
      else start("h2");
    } else if (name === "blockquote") {
      if (closing) flush();
      else start("quote");
    } else if (name === "li") {
      if (closing) flush();
      else start("li");
    } else if (name === "ul" || name === "ol") {
      flush();
      if (closing) lists.pop();
      else openList(name);
    } else if (name === "br") {
      // In list items the old site's breaks only wrap long lines (often mid-sentence): a space.
      const block = open();
      if (block?.kind === "li") block.children.push({ type: "text", text: " ", format: format(), detail: 0, mode: "normal", style: "", version: 1 });
      else block?.children.push({ type: "linebreak", version: 1 });
    } else if (name === "strong" || name === "b" || name === "em" || name === "i") {
      if (closing) formats.pop();
      else formats.push(name === "strong" || name === "b" ? BOLD : ITALIC);
    } else if (BLOCK_CONTAINERS.has(name)) {
      // A wrapper ends any text run that wasn't in a <p>; real blocks inside it are kept open.
      if (open()?.kind === "p") flush();
    }
  }
  flush();
  return { root: { ...BASE, type: "root", children: blocks.filter((b) => b.type !== "list" || b.children.length) } };
}

function plain(children: Inline[]): string {
  return children
    .map((c) => (c.type === "text" ? c.text : "\n"))
    .join("")
    .trim();
}

/** Trims the run, merges neighbouring text with the same format, drops leading/trailing breaks. */
function tidy(children: Inline[]): Inline[] {
  const merged: Inline[] = [];
  for (const child of children) {
    const last = merged[merged.length - 1];
    if (child.type === "text" && last?.type === "text" && last.format === child.format) last.text += child.text;
    else merged.push(child.type === "text" ? { ...child } : child);
  }
  while (merged[0]?.type === "linebreak") merged.shift();
  while (merged[merged.length - 1]?.type === "linebreak") merged.pop();
  const first = merged[0];
  if (first?.type === "text") first.text = first.text.replace(/^\s+/, "");
  const last = merged[merged.length - 1];
  if (last?.type === "text") last.text = last.text.replace(/\s+$/, "");
  return merged.filter((c) => c.type !== "text" || c.text);
}

/** All the text of a Lexical document, for checks and search. */
export const lexicalText = (doc: LexicalDoc): string =>
  doc.root.children.map((b) => (b.type === "list" ? b.children.map((li) => plain(li.children)).join("\n") : plain(b.children))).join("\n");
