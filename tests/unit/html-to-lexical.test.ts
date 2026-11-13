import { describe, expect, it } from "vitest";

import { decodeEntities, htmlToLexical, lexicalText } from "../../scripts/lib/html-to-lexical";

const blocks = (html: string, skip?: string[]) => htmlToLexical(html, skip).root.children;

describe("htmlToLexical (WordPress HTML import, D-040)", () => {
  it("keeps Ethiopic headings and paragraphs from Elementor wrappers, h1 becomes h2", () => {
    const html = `<div class="elementor"><div class="e-con"><h1 class="t">በቤተ ክርስቲያናችን የሚሰጡት አገልግሎቶች</h1></div>
      <div><p>የደብረሰላም  መድኃኔዓለም&nbsp;ቤተ ክርስቲያን።</p><h3>ስቶክሆልም</h3></div></div>`;
    const out = blocks(html);
    expect(out.map((b) => b.type === "heading" ? b.tag : b.type)).toEqual(["h2", "paragraph", "h3"]);
    expect(lexicalText(htmlToLexical(html))).toBe("በቤተ ክርስቲያናችን የሚሰጡት አገልግሎቶች\nየደብረሰላም መድኃኔዓለም ቤተ ክርስቲያን።\nስቶክሆልም");
  });

  it("turns lists into Lexical lists, numbered or bullet, flattening nested ones", () => {
    const out = blocks("<ul><li>ሥርዓተ ጥምቀት</li><li>ጋብቻ<ul><li>ተክሊል</li></ul></li></ul><ol><li>one</li></ol>");
    expect(out).toHaveLength(2);
    const [bullets, numbers] = out as Extract<(typeof out)[number], { type: "list" }>[];
    expect(bullets.listType).toBe("bullet");
    expect(bullets.children.map((li) => li.value)).toEqual([1, 2, 3]);
    expect(numbers.listType).toBe("number");
  });

  it("keeps bold and italic, line breaks, and decodes entities", () => {
    const [p] = blocks("<p><strong>መባዕ</strong> ማለት&#8211;<em>ስጦታ</em><br>ነው &amp; &#x1200;</p>");
    expect(p.type).toBe("paragraph");
    const children = (p as Extract<typeof p, { type: "paragraph" }>).children;
    expect(children.map((c) => (c.type === "text" ? [c.text, c.format] : "br"))).toEqual([
      ["መባዕ", 1],
      [" ማለት–", 0],
      ["ስጦታ", 2],
      "br",
      ["ነው & ሀ", 0],
    ]);
  });

  it("drops scripts, styles, embeds, images and empty blocks; links keep their text", () => {
    const out = blocks(`<style>.x{}</style><script>alert(1)</script><iframe src="https://youtube.com"></iframe>
      <p><img src="a.jpg" alt=""></p><p> </p><p>ወደ <a href="https://dev.medhanealem.se/x">ገጹ</a> ይሂዱ</p>`);
    expect(lexicalText({ root: { ...htmlToLexical("").root, children: out } })).toBe("ወደ ገጹ ይሂዱ");
  });

  it("text directly inside a wrapper becomes a paragraph; skipped texts are left out", () => {
    const out = blocks("<div>ከፎቶ ማህደር</div><div>ጽሑፍ</div>", ["ከፎቶ ማህደር"]);
    expect(lexicalText({ root: { ...htmlToLexical("").root, children: out } })).toBe("ጽሑፍ");
  });

  it("decodes numeric and named entities, leaves unknown ones", () => {
    expect(decodeEntities("&laquo;a&raquo; &#039;b&#039; &bogus;")).toBe("«a» 'b' &bogus;");
  });
});
