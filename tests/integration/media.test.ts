/**
 * Media: real uploads to S3 (local RustFS / CI service). The public only ever sees images with
 * recorded publication permission — in queries AND via the file URL.
 */
import { REST_GET } from "@payloadcms/next/routes";
import { getPayload, type Payload } from "payload";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";
import type { Role } from "../../src/access/roles";

const BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
let payload: Payload;
const restGet = REST_GET(config);
const created: number[] = [];

async function png(color: string) {
  return sharp({ create: { width: 1800, height: 1000, channels: 3, background: color } }).png().toBuffer();
}

async function upload(name: string, permissionObtained: boolean) {
  const data = await png(permissionObtained ? "#0b3d2e" : "#c8a24a");
  const doc = await payload.create({
    collection: "media",
    overrideAccess: true,
    data: { alt: `Test ${name}`, permissionObtained },
    file: { data, mimetype: "image/png", name: `${name}.png`, size: data.length },
  });
  created.push(doc.id);
  return doc;
}

async function staff(email: string, roles: Role[]) {
  const user = await payload.create({
    collection: "users",
    overrideAccess: true,
    data: { email, password: "Media-test-Pa55!", name: email, roles, active: true },
  });
  return { ...user, collection: "users" as const };
}

const fileUrl = (filename: string) => `media/file/${filename}`;
const getFile = (path: string) =>
  restGet(new Request(`${BASE}/api/${path}`), { params: Promise.resolve({ slug: path.split("/") }) });

let allowed: Awaited<ReturnType<typeof upload>>;
let restricted: Awaited<ReturnType<typeof upload>>;

beforeAll(async () => {
  payload = await getPayload({ config });
  allowed = await upload(`allowed-${Date.now()}`, true);
  restricted = await upload(`restricted-${Date.now()}`, false);
});

afterAll(async () => {
  for (const id of created) {
    await payload.delete({ collection: "media", id, overrideAccess: true }).catch(() => undefined);
  }
  await payload?.destroy();
});

describe("media uploads", () => {
  it("stores the original and the four sizes from spec §2.8", () => {
    // Served through Payload (so access control applies), as an absolute URL from serverURL.
    expect(allowed.url).toMatch(/\/api\/media\/file\/allowed-\d+\.png$/);
    expect(allowed.sizes?.thumbnail?.width).toBe(400);
    expect(allowed.sizes?.card?.width).toBe(800);
    expect(allowed.sizes?.hero?.width).toBe(1600);
    expect(allowed.sizes?.og).toMatchObject({ width: 1200, height: 630 });
  });

  it("rejects SVG uploads", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(
      payload.create({
        collection: "media",
        overrideAccess: true,
        data: { alt: "svg" },
        file: { data: svg, mimetype: "image/svg+xml", name: "x.svg", size: svg.length },
      }),
    ).rejects.toThrow();
  });
});

describe("public access", () => {
  it("lists only images with publication permission", async () => {
    const { docs } = await payload.find({ collection: "media", overrideAccess: false, limit: 100 });
    const ids = docs.map((d) => d.id);
    expect(ids).toContain(allowed.id);
    expect(ids).not.toContain(restricted.id);
  });

  it("serves the file of a permitted image but not of a restricted one", async () => {
    const ok = await getFile(fileUrl(allowed.filename!));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toContain("image/png");

    const blocked = await getFile(fileUrl(restricted.filename!));
    expect([403, 404]).toContain(blocked.status);
    const blockedSize = await getFile(fileUrl(restricted.sizes!.thumbnail!.filename!));
    expect([403, 404]).toContain(blockedSize.status);
  });
});

describe("staff access (spec §3)", () => {
  it("translators can see all media but cannot upload", async () => {
    const translator = await staff("media-translator@test.local", ["translator"]);
    const { docs } = await payload.find({ collection: "media", overrideAccess: false, user: translator, limit: 100 });
    expect(docs.map((d) => d.id)).toContain(restricted.id);

    const data = await png("#ffffff");
    await expect(
      payload.create({
        collection: "media",
        overrideAccess: false,
        user: translator,
        data: { alt: "nope" },
        file: { data, mimetype: "image/png", name: "nope.png", size: data.length },
      }),
    ).rejects.toThrow();
  });

  it("finance has no media access beyond what the public sees", async () => {
    const finance = await staff("media-finance@test.local", ["finance"]);
    const { docs } = await payload.find({ collection: "media", overrideAccess: false, user: finance, limit: 100 });
    expect(docs.map((d) => d.id)).not.toContain(restricted.id);
  });

  it("editors can upload", async () => {
    const editor = await staff("media-editor@test.local", ["editor"]);
    const data = await png("#f8f4ea");
    const doc = await payload.create({
      collection: "media",
      overrideAccess: false,
      user: editor,
      data: { alt: "Editor upload" },
      file: { data, mimetype: "image/png", name: `editor-${Date.now()}.png`, size: data.length },
    });
    created.push(doc.id);
    expect(doc.permissionObtained).toBe(false);
  });
});

describe("alt text fallback for the public site (D-024)", () => {
  async function uploadIn(locale: "am" | "en", name: string, alt: string) {
    const data = await png("#0b3d2e");
    const doc = await payload.create({
      collection: "media",
      overrideAccess: true,
      locale,
      data: { alt, permissionObtained: true },
      file: { data, mimetype: "image/png", name: `${name}-${Date.now()}.png`, size: data.length },
    });
    created.push(doc.id);
    return doc;
  }
  const publicAlt = async (id: number, locale: "am" | "en" | "sv") =>
    (await payload.findByID({ collection: "media", id, locale, overrideAccess: false })).alt;

  it("falls back to Amharic, and to another language when Amharic is missing too", async () => {
    const amharic = await uploadIn("am", "alt-am", "የቤተ ክርስቲያን ፎቶ");
    expect(await publicAlt(amharic.id, "en")).toBe("የቤተ ክርስቲያን ፎቶ");
    expect(await publicAlt(amharic.id, "sv")).toBe("የቤተ ክርስቲያን ፎቶ");

    const englishOnly = await uploadIn("en", "alt-en", "Church photo");
    expect(await publicAlt(englishOnly.id, "am")).toBe("Church photo");
    expect(await publicAlt(englishOnly.id, "sv")).toBe("Church photo");
  });

  it("leaves a missing translation empty for staff, so the admin never saves a fallback", async () => {
    const englishOnly = await uploadIn("en", "alt-staff", "Church photo");
    const editor = await staff(`alt-editor-${Date.now()}@test.local`, ["editor"]);
    const asEditor = await payload.findByID({ collection: "media", id: englishOnly.id, locale: "am", user: editor, overrideAccess: false });
    expect(asEditor.alt ?? null).toBeNull();
  });
});
