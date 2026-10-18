/** Globals: public read never exposes staff-only fields; only the right roles may edit. */
import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../src/payload.config";

let payload: Payload;

/** A staff user as Payload's local API sees them. Non-privileged roles need no MFA cookie. */
async function staffUser(email: string, roles: ("editor" | "translator")[]) {
  const user = await payload.create({
    collection: "users",
    data: { email, password: "Globals-test-Pa55!", name: email, roles, active: true },
    overrideAccess: true,
  });
  return { ...user, collection: "users" as const };
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await payload.updateGlobal({
    slug: "site-settings",
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: {
      shortName: "Test Church",
      officeNotificationEmails: [{ email: "private-office@test.local" }],
      retentionMonthsBaptism: 24,
    },
  });
});

afterAll(async () => {
  await payload?.destroy();
});

describe("site-settings", () => {
  it("public read omits notification emails and retention period", async () => {
    const settings = await payload.findGlobal({ slug: "site-settings", overrideAccess: false });
    expect(settings.shortName).toBe("Test Church");
    expect(JSON.stringify(settings)).not.toContain("private-office@test.local");
    expect(settings.retentionMonthsBaptism).toBeUndefined();
  });

  it("an editor cannot change site settings", async () => {
    const editor = await staffUser("settings-editor@test.local", ["editor"]);
    await expect(
      payload.updateGlobal({
        slug: "site-settings",
        overrideAccess: false,
        user: editor,
        context: { disableRevalidate: true },
        data: { shortName: "Hijacked" },
      }),
    ).rejects.toThrow();
  });
});

describe("navigation and footer", () => {
  it("an editor can update the menu; a translator and the public cannot", async () => {
    const editor = await staffUser("nav-editor@test.local", ["editor"]);
    const translator = await staffUser("nav-translator@test.local", ["translator"]);
    const data = {
      headerItems: [{ label: "Visit", link: { type: "internal" as const, path: "/visit" } }],
    };

    await expect(
      payload.updateGlobal({ slug: "navigation", overrideAccess: false, user: editor, context: { disableRevalidate: true }, data }),
    ).resolves.toBeTruthy();
    await expect(
      payload.updateGlobal({ slug: "navigation", overrideAccess: false, user: translator, context: { disableRevalidate: true }, data }),
    ).rejects.toThrow();
    await expect(
      payload.updateGlobal({ slug: "footer", overrideAccess: false, context: { disableRevalidate: true }, data: { legalLinks: [] } }),
    ).rejects.toThrow();
  });

  it("rejects a menu link that includes a locale prefix", async () => {
    const error = await payload
      .updateGlobal({
        slug: "navigation",
        overrideAccess: true,
        context: { disableRevalidate: true },
        data: { headerItems: [{ label: "Bad", link: { type: "internal", path: "/en/visit" } }] },
      })
      .then(() => null)
      .catch((e: { data?: { errors?: { message: string; path: string }[] } }) => e);
    expect(error?.data?.errors?.[0]).toMatchObject({
      path: expect.stringContaining("path"),
      message: expect.stringMatching(/language/i),
    });
  });
});
