// E2E fixtures (run by `pnpm test:e2e:prepare`, only against the throwaway <db>_e2e database):
// a few pages and teachings to test content routing in the production build. Never run against real data.
import { getPayload } from "payload";
import sharp from "sharp";

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
// Teachings need an active clergy approver to be published (spec §2.3).
const clergy = await payload.create({
  collection: "users",
  ...ctx,
  data: { email: "e2e-clergy@example.org", password: crypto.randomUUID(), name: "E2E Clergy", roles: ["clergy_approver"], active: true },
});
// In Amharic (the default language) and English, like real content.
const teaching = async (category: string, slug: string, title: string) => {
  const doc = await payload.create({
    collection: "teachings",
    ...ctx,
    locale: "am",
    data: { title: `${title} (am)`, category, slug, body: text(`${title} ጽሑፍ`), _status: "published", approvedBy: clergy.id } as never,
  });
  await payload.update({
    collection: "teachings",
    id: doc.id,
    ...ctx,
    locale: "en",
    data: { title, body: text(`${title} text`), _status: "published" } as never,
  });
};
await teaching("fasting", "e2e-fasting", "Fasting test teaching");
await teaching("christening", "e2e-baptism-guidance", "Baptism guidance test");

// A weekly service (Sunday 08:00–11:30 Stockholm) for the worship pages, calendar and iCal feed.
await payload.create({
  collection: "events",
  ...ctx,
  locale: "en",
  data: {
    title: "E2E Kidase",
    type: "weekly_service",
    start: "2026-10-04T06:00:00.000Z",
    start_tz: "Europe/Stockholm",
    end: "2026-10-04T09:30:00.000Z",
    end_tz: "Europe/Stockholm",
    recurrence: { frequency: "weekly" },
  },
});

// Sunday School, News and Media (D-020).
const mezmur = (await payload.find({ collection: "departments", ...ctx, where: { slug: { equals: "mezmur" } } })).docs[0];
// Text in Amharic (the default language) is what makes a department page exist (D-020).
await payload.update({ collection: "departments", id: mezmur.id, ...ctx, locale: "am", data: { summary: "የመዝሙር ልምምድ በየሳምንቱ።" } });
await payload.update({ collection: "departments", id: mezmur.id, ...ctx, locale: "en", data: { summary: "Choir practice every week.", body: text("Join the choir.") } });
await payload.create({ collection: "posts", ...ctx, locale: "en", data: { title: "E2E news", slug: "e2e-news", body: text("News text"), _status: "published" } });
const photo = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#c8a24a" } }).jpeg().toBuffer();
const image = await payload.create({
  collection: "media",
  ...ctx,
  locale: "en",
  data: { alt: "E2E photo", permissionObtained: true },
  file: { data: photo, mimetype: "image/jpeg", name: `e2e-photo-${Date.now()}.jpg`, size: photo.length },
});
await payload.create({
  collection: "galleries",
  ...ctx,
  locale: "en",
  data: { title: "E2E gallery", slug: "e2e-gallery", date: "2026-09-26T22:00:00.000Z", date_tz: "Europe/Stockholm", images: [image.id], published: true },
});
await payload.create({
  collection: "videos",
  ...ctx,
  locale: "en",
  data: { title: "E2E sermon", kind: "video", category: "sermon", date: "2026-10-11T22:00:00.000Z", date_tz: "Europe/Stockholm", url: "https://youtu.be/dQw4w9WgXcQ" },
});

// Contact form (task 6): where office notifications go.
await payload.updateGlobal({ slug: "site-settings", ...ctx, data: { officeNotificationEmails: [{ email: "e2e-office@example.org" }] } });

// Baptism page (Phase 2 task 3): a requirement in Amharic and English, requests open.
const baptismPage = await payload.updateGlobal({
  slug: "baptism-page",
  ...ctx,
  locale: "am",
  data: { requestsOpen: true, requirements: [{ item: "የክርስትና አባት/እናት", detail: "ኦርቶዶክስ ተዋሕዶ" }] },
});
await payload.updateGlobal({
  slug: "baptism-page",
  ...ctx,
  locale: "en",
  data: { requirements: baptismPage.requirements!.map((r) => ({ id: r.id, item: "A godparent", detail: "An Orthodox Tewahedo Christian" })) },
});

console.log("E2E fixtures created");
process.exit(0);
