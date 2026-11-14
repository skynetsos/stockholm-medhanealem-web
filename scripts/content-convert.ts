// `pnpm content:convert <file.docx> [date]`: the church's Word document → docs/content/church-content-<date>.md
// (D-045). Prints what was found and any warning; then run `pnpm content:import`.
import { copyFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { docxParagraphs, normalise, plainText, splitDocument, toMarkdown } from "./lib/church-content.ts";

const [file, date = new Date().toISOString().slice(0, 10)] = process.argv.slice(2);
if (!file?.toLowerCase().endsWith(".docx")) throw new Error("Usage: pnpm content:convert <file.docx> [YYYY-MM-DD]");

const paragraphs = docxParagraphs(file);
const result = splitDocument(paragraphs);
const out = path.resolve("docs/content");
mkdirSync(out, { recursive: true });
const docx = path.join(out, `church-content-${date}.docx`);
copyFileSync(file, docx);
const md = path.join(out, `church-content-${date}.md`);
writeFileSync(md, toMarkdown(result, { source: path.basename(docx), date }), "utf8");

// Nothing lost: every paragraph's text appears in the output, in order.
const imported = normalise(result.sections.map(({ title, blocks }) => `${title} ${plainText(blocks.map((b) => ({ text: b.runs.map((r) => r.text).join("") })))}`).join(" "));
const missing = paragraphs.filter((p) => !imported.includes(p.text.replace(/^፩ኛ፦ |^፪ኛ |^፫ኛ /, "")));
for (const { section, title, blocks } of result.sections) console.log(`${section.key.padEnd(16)} ${String(blocks.length).padStart(3)} blocks  ${title}`);
for (const w of result.warnings) console.log(`WARNING ${w}`);
for (const p of missing) console.log(`MISSING ${p.text.slice(0, 80)}`);
console.log(`\n${paragraphs.length} paragraphs → ${path.relative(process.cwd(), md)}`);
