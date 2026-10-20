// E2E fixtures (run by `pnpm test:e2e:prepare`, only against the throwaway <db>_e2e database):
// a few pages to test CMS routing in the production build. Never run against real data.
import { getPayload } from "payload";

import config from "../src/payload.config";

if (!process.env.DATABASE_URI?.includes("_e2e")) throw new Error("e2e fixtures only run against the _e2e database");

const payload = await getPayload({ config });
const ctx = { overrideAccess: true, context: { disableRevalidate: true } } as const;
const text = (value: string) => ({
  root: {
    type: "root",
    format: "" as const,
    indent: 0,
    version: 1,
    direction: "ltr" as const,
    children: [
      {
        type: "paragraph",
        format: "" as const,
        indent: 0,
        version: 1,
        direction: "ltr" as const,
        textFormat: 0,
        children: [{ type: "text", text: value, format: 0, detail: 0, mode: "normal", style: "", version: 1 }],
      },
    ],
  },
});

const page = async (section: "our-church" | "other", slug: string, title: Record<"am" | "en", string>, status: "published" | "draft") => {
  const doc = await payload.create({
    collection: "pages",
    ...ctx,
    locale: "am",
    draft: status === "draft",
    data: { title: title.am, section, slug, _status: status, layout: [{ blockType: "richText", content: text(title.am) }] },
  });
  await payload.update({
    collection: "pages",
    id: doc.id,
    ...ctx,
    locale: "en",
    draft: status === "draft",
    data: { title: title.en, _status: status, layout: [{ id: doc.layout?.[0]?.id, blockType: "richText", content: text(title.en) }] },
  });
};

await page("our-church", "index", { am: "ቤተ ክርስቲያናችን", en: "Our Church" }, "published");
await page("other", "e2e-test-page", { am: "የሙከራ ገጽ", en: "Test page" }, "published");
await page("our-church", "e2e-draft", { am: "ረቂቅ", en: "Draft" }, "draft");
console.log("E2E fixtures created");
process.exit(0);
