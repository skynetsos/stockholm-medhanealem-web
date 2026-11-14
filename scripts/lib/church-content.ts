/**
 * The church's written website content (D-045): Word document → docs/content/*.md → CMS.
 *
 * The .docx is the source the church edits. `pnpm content:convert <file.docx>` turns it into a
 * Markdown file in docs/content (mapping table at the top, one block per content key), and
 * `pnpm content:import` puts that into the CMS. The Amharic text is kept exactly: only spacing is
 * normalised (runs of spaces, non-breaking spaces), headings are marked, and nothing is reworded.
 * No dependencies: a .docx is a zip file, read here with Node's zlib.
 */
import { readFileSync } from "fs";
import { inflateRawSync } from "zlib";

// .ts extension: the converter runs with plain Node (type stripping), which needs it.
import { decodeEntities } from "./html-to-lexical.ts";

// ---------------------------------------------------------------------------------------------
// Reading the Word document
// ---------------------------------------------------------------------------------------------

export type Run = { text: string; bold: boolean };
export type Paragraph = { runs: Run[]; text: string };

/** One file from a zip archive (stored or deflated), found through the central directory. */
export function readZipEntry(zip: Buffer, name: string): Buffer {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("Not a .docx (zip) file");
  const count = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("Damaged .docx (central directory)");
    const method = zip.readUInt16LE(offset + 10);
    const size = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const local = zip.readUInt32LE(offset + 42);
    const entry = zip.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (entry === name) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return inflateRawSync(data);
      throw new Error(`Unsupported zip compression ${method}`);
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`${name} not found in the .docx`);
}

/** Collapses spacing (incl. non-breaking spaces) the way a web page shows it; nothing else changes. */
export const normalise = (text: string) => text.replace(/[\s ]+/g, " ").trim();

/** The non-empty paragraphs of a .docx, with their bold runs. */
export function docxParagraphs(file: string): Paragraph[] {
  const xml = readZipEntry(readFileSync(file), "word/document.xml").toString("utf8");
  return (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).flatMap((p): Paragraph[] => {
    const runs = (p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []).flatMap((r): Run[] => {
      const text = decodeEntities((r.match(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join(""));
      if (/<w:tab\/>/.test(r) && !text) return [{ text: " ", bold: false }];
      const bold = /<w:b\/>|<w:b w:val="(?:1|true|on)"\/>/.test(r);
      return text ? [{ text, bold }] : [];
    });
    const text = normalise(runs.map((r) => r.text).join(""));
    return text ? [{ runs, text }] : [];
  });
}

// ---------------------------------------------------------------------------------------------
// Which part of the document goes where (the mapping)
// ---------------------------------------------------------------------------------------------

type Target = { kind: "page"; section: string; slug: string } | { kind: "teaching"; category: string; slug: string };

export type ContentSection = {
  /** Stable key: the importer matches CMS items on it (contentKey "church:<key>"). */
  key: string;
  /** Text the section's first paragraph starts with (after spacing is normalised). */
  start: string;
  /** The page title: the first paragraph itself ("heading"), or a fixed title (it is then body text). */
  title: { from: "heading"; strip?: string } | { fixed: string; source: string };
  target: Target;
  /** Paragraphs that are headings as a whole (H2 unless level 3 is given). */
  headings?: { text: string; level?: 2 | 3 }[];
  /** Item labels (ሀ᎖ …) at the start of a paragraph that become an H2, the rest staying a paragraph. */
  itemHeadings?: string[];
  /** Appended to another section's page (e.g. the closing words go to the About page). */
  appendTo?: string;
  note: string;
};

/**
 * In document order: each section runs from its `start` paragraph to the next section's. The
 * document (2026-11-13) has no mapping table of its own; this follows the request of 2026-11-14.
 */
export const CONTENT_SECTIONS: ContentSection[] = [
  {
    key: "about",
    start: "በስመ አብ ወወልድ ወመንፈስ ቅዱስ",
    title: { fixed: "ስለ ቤተ ክርስቲያናችን", source: "title of the About page on dev.medhanealem.se" },
    target: { kind: "page", section: "our-church", slug: "index" },
    headings: [{ text: "በኢትዮጵያ ኦርቶዶክስ ተዋህዶ ቤተ ክርስቲያናን የስዊድን እና እስካንዲናቪያን አህጉረ ስብከት መንበረ ጵጵስና የደብረ ሰላም መድኃኔ ዓለም ቤተ ክርስቲያን" }, { text: "ስቶክሆልም", level: 3 }],
    note: "Opening blessing and introduction; the closing paragraphs (about-closing) are added at the end",
  },
  {
    key: "our-faith",
    start: "ቤተ ክርስቲያን ማለት ምን ማለት ነው?",
    title: { from: "heading" },
    target: { kind: "page", section: "our-faith", slug: "index" },
    note: "“What is a church?” — the Our Faith landing",
  },
  {
    key: "history",
    start: "የስቶክሆልም ደብረ ሰላም መድኃኔ ዓለም መንበረ ጵጵስና ቤተ ክርስቲያን ታሪክ በአጭሩ",
    title: { from: "heading" },
    target: { kind: "page", section: "our-church", slug: "history" },
    note: "History in brief",
  },
  {
    key: "sacraments",
    start: "ቤተ ክርስቲያናችን ለተከታዮቿ የምትፈጽማቸው ሥርዓቶች",
    title: { fixed: "ምሥጢራት", source: "the site's own name for this section (messages: sacraments.title)" },
    target: { kind: "page", section: "sacraments", slug: "index" },
    note: "The rites the church performs (ሀ–መ) — the Sacraments landing",
  },
  {
    key: "worship",
    start: "ሠ‚ በተጨማሪም በቤተ ክርስቲያናችን",
    title: { fixed: "በቤተ ክርስቲያናችን የሚሰጡት አገልግሎቶች", source: "heading of the services page on dev.medhanealem.se" },
    target: { kind: "page", section: "worship", slug: "index" },
    note: "Item ሠ: the feasts, Sundays and weekdays with services — the Worship landing",
  },
  {
    key: "christening",
    start: "ክርስትና",
    title: { from: "heading" },
    target: { kind: "teaching", category: "christening", slug: "christening" },
    note: "Teaching → /sacraments/baptism",
  },
  {
    key: "marriage",
    start: "ጋብቻ",
    title: { from: "heading" },
    target: { kind: "teaching", category: "marriage", slug: "marriage" },
    headings: [{ text: "የጋብቻ ዓላማዎች" }],
    note: "Teaching → /sacraments/marriage; the three purposes stay numbered as written",
  },
  {
    key: "offerings",
    start: "መባዕ",
    title: { from: "heading" },
    target: { kind: "teaching", category: "offerings", slug: "offerings" },
    note: "Teaching (new category “offerings”) → /our-faith/offerings, linked from /support",
  },
  {
    key: "fitihat",
    start: "ፍትሐት",
    title: { from: "heading" },
    target: { kind: "teaching", category: "fitihat", slug: "fitihat" },
    note: "Teaching → /sacraments/fitihat",
  },
  {
    key: "annual-feasts",
    start: "፩ኛ፦ ዓመታዊ ዐበይት ክብረ በዓላት",
    title: { from: "heading", strip: "፩ኛ፦ " },
    target: { kind: "page", section: "worship", slug: "annual-feast-days" },
    itemHeadings: [
      "ሀ᎖ ርዕሰ ዐውደ ዓመት ቅዱስ ዮሐንስ ( ዘመን መለወጫ)",
      "ለ᎖ ደመራ መስቀል፦",
      "ሐ᎖ ጥቅምት መድኃኔ ዓለም፦",
      "መ᎖ በዓለ ልደት፦",
      "ሠ᎖ በዓለ ጥምቀት ወቃና ዘገሊላ፦",
      "ረ᎖ መጋቢት መድኃኔ ዓለም፦",
      "ሰ᎖ መጋቢት በዓለ እግዚአብሔር ፦ ( በዓለ ትስብእት )",
      "ሸ᎖ በዓለ ሆሣዕና፣ ሰሙነ ሕማማት፣ ጸሎተ ሐሙስ ( ሥርዓተ ሕፅበተ እግር) እና የስቅለት ሥርዓት እንዲሁም በዓለ ትንሣኤ",
      "ቀ᎖ ግንቦት ልደታ ለማርያም ፦",
      "በ᎖ በዓለ ዕርገት ፦",
      "ተ᎖ ሰኔ ቅዱስ ሚካኤል ፦",
      "ቸ᎖ ጾመ ፍልሰታ ፦",
    ],
    note: "Annual feasts; each ሀ᎖ … ቸ᎖ feast name becomes a heading",
  },
  {
    key: "monthly-feasts",
    start: "፪ኛ ወርኃዊ በዓላት",
    title: { from: "heading", strip: "፪ኛ " },
    target: { kind: "page", section: "worship", slug: "monthly-feast-days" },
    note: "Monthly feasts",
  },
  {
    key: "weekly-service",
    start: "፫ኛ ሣምንታዊ አገልግሎት",
    title: { from: "heading", strip: "፫ኛ " },
    target: { kind: "page", section: "worship", slug: "weekly-service" },
    itemHeadings: [
      "ሀ᎖ በየሣምንቱ እሁድ ( በዕለተ ሰንበት)",
      "ለ᎖ በየሣምንቱ ዐርብና ረቡዕ",
      "ሐ᎖ በየሣምንቱ ቅዳሜ",
      "መ᎖ እንዲሁም ቅዳሜ ቅዳሜ ከሰዓት በኋላ",
      "ሠ᎖ ከሰኞ እስከ ዐርብ ከጠዋት 8–12",
      "ረ᎖ንሥሐ ለመግባት እና ሥጋ ወደሙ ለመቀበል",
    ],
    note: "Weekly service; each item's opening words (ሀ᎖ … ረ᎖) become a heading and the sentence continues below",
  },
  {
    key: "about-closing",
    start: "የደብረ ሰላም መድኃኔ ዓለም መንበረ ጵጵስና ቤተ ክርስቲያን በእድሜ",
    title: { fixed: "ስለ ቤተ ክርስቲያናችን", source: "added to the About page" },
    target: { kind: "page", section: "our-church", slug: "index" },
    appendTo: "about",
    note: "Closing words (clergy, growth, blessing) — end of the About page",
  },
];

// ---------------------------------------------------------------------------------------------
// Document → Markdown
// ---------------------------------------------------------------------------------------------

export type Block = { type: "h2" | "h3" | "p"; runs: Run[] };

/** Markdown for one paragraph's runs: bold runs as **…**, adjacent ones merged. */
const runsToMarkdown = (runs: Run[]) => {
  const merged: Run[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && last.bold === run.bold) last.text += run.text;
    else merged.push({ ...run });
  }
  return normalise(
    merged
      .map((r) => {
        if (!r.bold || !r.text.trim()) return r.text;
        const lead = r.text.match(/^\s*/)![0];
        const trail = r.text.match(/\s*$/)![0];
        return `${lead}**${r.text.trim()}**${trail}`;
      })
      .join(""),
  );
};

export type SplitResult = { sections: { section: ContentSection; title: string; blocks: Block[] }[]; warnings: string[] };

/** Splits the document's paragraphs into the mapped sections and marks headings. */
export function splitDocument(paragraphs: Paragraph[]): SplitResult {
  const warnings: string[] = [];
  const starts = CONTENT_SECTIONS.map((section) => {
    const index = paragraphs.findIndex((p) => ("from" in section.title ? p.text === section.start : p.text.startsWith(section.start)));
    if (index < 0) warnings.push(`Section "${section.key}" not found (no paragraph starting "${section.start}")`);
    return { section, index };
  });
  const found = starts.filter((s) => s.index >= 0).sort((a, b) => a.index - b.index);
  if (found[0] && found[0].index > 0) warnings.push(`${found[0].index} paragraph(s) before the first section are not imported`);

  const sections = found.map(({ section, index }, i) => {
    const end = found[i + 1]?.index ?? paragraphs.length;
    const own = paragraphs.slice(index, end);
    const titleFromHeading = "from" in section.title;
    const title = titleFromHeading ? own[0].text.replace((section.title as { strip?: string }).strip ?? "\u0000", "").trim() : (section.title as { fixed: string }).fixed;
    const body = titleFromHeading ? own.slice(1) : own;
    const items = [...(section.itemHeadings ?? [])];
    const blocks = body.flatMap((p): Block[] => {
      const heading = section.headings?.find((h) => h.text === p.text);
      if (heading) return [{ type: heading.level === 3 ? "h3" : "h2", runs: [{ text: p.text, bold: false }] }];
      const item = items.find((label) => p.text.startsWith(label));
      if (item) {
        items.splice(items.indexOf(item), 1);
        // These item paragraphs have no bold runs; the rest of the text stays one paragraph.
        const rest = p.text.slice(item.length).trim();
        return [{ type: "h2", runs: [{ text: item, bold: false }] }, ...(rest ? [{ type: "p" as const, runs: [{ text: rest, bold: false }] }] : [])];
      }
      return [{ type: "p", runs: p.runs }];
    });
    for (const label of items) warnings.push(`Section "${section.key}": item heading not found: "${label}"`);
    return { section, title, blocks };
  });
  return { sections, warnings };
}

/** The Markdown file written to docs/content: a mapping table, then one block per section. */
export function toMarkdown(result: SplitResult, meta: { source: string; date: string }): string {
  const lines = [
    `# Church website content (${meta.date})`,
    "",
    `Converted from \`${meta.source}\` by \`pnpm content:convert\` (D-045). The Amharic text is the church's, word for word; only spacing is normalised and headings are marked (\`##\`). To correct the text, edit the Word document and convert again, then run \`pnpm content:import\`.`,
    "",
    "| Content key | Goes to | Title | Notes |",
    "|---|---|---|---|",
    ...result.sections.map(({ section, title }) => {
      const where =
        section.target.kind === "page"
          ? `Page \`${section.target.section}/${section.target.slug}\``
          : `Teaching \`${section.target.category}/${section.target.slug}\``;
      return `| \`${section.key}\` | ${where}${section.appendTo ? ` (end of \`${section.appendTo}\`)` : ""} | ${title} | ${section.note}${"fixed" in section.title ? `; title: ${section.title.source}` : ""} |`;
    }),
    "",
  ];
  for (const { section, title, blocks } of result.sections) {
    lines.push(`<!-- content: ${section.key} -->`, `# ${title}`, "");
    for (const block of blocks) {
      const text = runsToMarkdown(block.runs);
      lines.push(block.type === "h2" ? `## ${text}` : block.type === "h3" ? `### ${text}` : text, "");
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------
// Markdown → CMS
// ---------------------------------------------------------------------------------------------

export type ParsedSection = { key: string; title: string; blocks: { type: "h2" | "h3" | "p"; text: string }[] };

/** Reads the docs/content Markdown back into sections (the mapping table is for people). */
export function parseMarkdown(markdown: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    const marker = line.match(/^<!-- content: ([\w-]+) -->$/);
    if (marker) {
      current = { key: marker[1], title: "", blocks: [] };
      sections.push(current);
      continue;
    }
    if (!current || !line) continue;
    if (line.startsWith("# ") && !current.title) current.title = line.slice(2).trim();
    else if (line.startsWith("### ")) current.blocks.push({ type: "h3", text: line.slice(4).trim() });
    else if (line.startsWith("## ")) current.blocks.push({ type: "h2", text: line.slice(3).trim() });
    else current.blocks.push({ type: "p", text: line });
  }
  return sections;
}

const BASE = { direction: "ltr" as const, format: "" as const, indent: 0, version: 1 };

/** "**bold** text" → Lexical text nodes (bold = format 1). */
function inline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) => {
      const bold = part.startsWith("**") && part.endsWith("**") && part.length > 4;
      return { type: "text", text: bold ? part.slice(2, -2) : part, format: bold ? 1 : 0, detail: 0, mode: "normal", style: "", version: 1 };
    });
}

/** Sections' blocks → one Lexical document. */
export function toLexical(blocks: ParsedSection["blocks"]) {
  return {
    root: {
      ...BASE,
      type: "root",
      children: blocks.map((b) =>
        b.type === "p"
          ? { ...BASE, type: "paragraph", textFormat: 0, textStyle: "", children: inline(b.text) }
          : { ...BASE, type: "heading", tag: b.type, children: inline(b.text) },
      ),
    },
  };
}

/** Plain text of blocks (for the "nothing lost" check). */
export const plainText = (blocks: { text: string }[]) => blocks.map((b) => b.text.replace(/\*\*/g, "")).join(" ");
