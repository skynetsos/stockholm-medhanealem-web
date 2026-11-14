/** The church's written content (D-045): Word → Markdown → CMS keeps every sentence verbatim. */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

import {
  CONTENT_SECTIONS,
  docxParagraphs,
  normalise,
  parseMarkdown,
  splitDocument,
  toLexical,
  toMarkdown,
} from "../../scripts/lib/church-content";

const DOCX = "docs/content/church-content-2026-11-13.docx";
const MD = "docs/content/church-content-2026-11-13.md";
const paragraphs = docxParagraphs(DOCX);
const result = splitDocument(paragraphs);

/** All text of the converted sections (titles included), bold markers removed. */
const allText = (sections: { title: string; blocks: { text: string }[] }[]) =>
  normalise(sections.map((s) => [s.title, ...s.blocks.map((b) => b.text.replace(/\*\*/g, ""))].join(" ")).join(" "));

describe("church content conversion", () => {
  it("reads the Word document (zip) and finds every mapped section, without warnings", () => {
    expect(paragraphs.length).toBe(89);
    expect(result.warnings).toEqual([]);
    expect(result.sections.map((s) => s.section.key)).toEqual(CONTENT_SECTIONS.map((s) => s.key));
  });

  it("keeps every paragraph of the document, word for word and in order", () => {
    const parsed = parseMarkdown(toMarkdown(result, { source: "x.docx", date: "2026-11-13" }));
    let text = allText(parsed);
    for (const p of paragraphs) {
      // Section numbers (፩ኛ፦ / ፪ኛ / ፫ኛ) of the three worship headings are dropped from page titles.
      const expected = p.text.replace(/^(፩ኛ፦|፪ኛ|፫ኛ) /, "");
      const at = text.indexOf(expected);
      expect(at, expected.slice(0, 60)).toBeGreaterThanOrEqual(0);
      text = text.slice(at + expected.length);
    }
  });

  it("the committed Markdown is what the converter makes from the committed .docx", () => {
    const committed = parseMarkdown(readFileSync(MD, "utf8"));
    const fresh = parseMarkdown(toMarkdown(result, { source: "x", date: "x" }));
    expect(committed).toEqual(fresh);
  });

  it("marks headings: marriage purposes heading, feast names, weekly items; scripture stays in the text", () => {
    const parsed = parseMarkdown(readFileSync(MD, "utf8"));
    const marriage = parsed.find((s) => s.key === "marriage")!;
    expect(marriage.blocks.filter((b) => b.type === "h2").map((b) => b.text)).toEqual(["የጋብቻ ዓላማዎች"]);
    expect(marriage.blocks.filter((b) => /^[123]ኛ‚/.test(b.text))).toHaveLength(3);
    expect(marriage.blocks.some((b) => b.text.includes("(ዘፍ 2፥18)"))).toBe(true);
    expect(parsed.find((s) => s.key === "annual-feasts")!.blocks.filter((b) => b.type === "h2")).toHaveLength(12);
    expect(parsed.find((s) => s.key === "weekly-service")!.blocks.filter((b) => b.type === "h2")).toHaveLength(6);
  });

  it("turns blocks into Lexical: headings, paragraphs, bold lead-ins", () => {
    const doc = toLexical([
      { type: "h2", text: "የጋብቻ ዓላማዎች" },
      { type: "p", text: "1ኛ‚ **ለመረዳዳት፦** የሚመቸውን ረዳት" },
    ]);
    expect(doc.root.children[0]).toMatchObject({ type: "heading", tag: "h2" });
    expect(doc.root.children[1].children).toEqual([
      expect.objectContaining({ text: "1ኛ‚ ", format: 0 }),
      expect.objectContaining({ text: "ለመረዳዳት፦", format: 1 }),
      expect.objectContaining({ text: " የሚመቸውን ረዳት", format: 0 }),
    ]);
  });
});

describe("English translation (D-046)", () => {
  it("mirrors the Amharic: same sections, same block types in the same order, no Ethiopic left", () => {
    const am = parseMarkdown(readFileSync(MD, "utf8"));
    const en = parseMarkdown(readFileSync(MD.replace(/\.md$/, ".en.md"), "utf8"));
    expect(en.map((s) => s.key)).toEqual(am.map((s) => s.key));
    for (const section of am) {
      const translated = en.find((s) => s.key === section.key)!;
      expect(translated.blocks.map((b) => b.type), section.key).toEqual(section.blocks.map((b) => b.type));
      expect(translated.title.length, section.key).toBeGreaterThan(0);
      expect(/[ሀ-፿]/.test([translated.title, ...translated.blocks.map((b) => b.text)].join(" ")), section.key).toBe(false);
    }
  });
});
