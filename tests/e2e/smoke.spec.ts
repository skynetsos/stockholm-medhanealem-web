import { expect, test } from "@playwright/test";

import am from "../../src/messages/am.json" with { type: "json" };
import en from "../../src/messages/en.json" with { type: "json" };
import sv from "../../src/messages/sv.json" with { type: "json" };
import { baseSeed } from "../../src/seed/base-data";

const messages = { am, en, sv } as const;
const locales = ["am", "en", "sv"] as const;

test("/ redirects to Amharic", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/am$/);
});

for (const locale of locales) {
  test(`home renders in ${locale}`, async ({ page }) => {
    const response = await page.goto(`/${locale}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages[locale].home.welcome);

    // CMS data reaches the page (seeded church name; Swedish falls back to Amharic).
    const name = baseSeed.settings.churchName[locale] ?? baseSeed.settings.churchName.am;
    await expect(page.locator("header").getByRole("link", { name, exact: true })).toBeVisible();

    // hreflang alternates for every locale + x-default.
    for (const code of [...locales, "x-default"]) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${code}"]`)).toHaveCount(1);
    }
  });
}

// Phase 0 has only the home page; extend to a deeper page once Phase 1 pages exist.
test("language switcher links to the same page in the other language", async ({ page }) => {
  await page.goto("/en");
  const switcher = page.getByRole("navigation", { name: en.common.changeLanguage });
  await expect(switcher.getByRole("link", { name: "አማርኛ" })).toHaveAttribute("href", "/am");
  await expect(switcher.getByRole("link", { name: "English" })).toHaveAttribute("aria-current", "true");
});

test("/admin loads the Payload login screen", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
});

// Deferred from Phase 0 task 5: in production the localized 404 must be server-rendered,
// with the right <html lang>, not filled in on the client (docs/DECISIONS.md D-007).
for (const locale of locales) {
  test(`404 is localized and server-rendered (${locale})`, async ({ request, page }) => {
    const raw = await request.get(`/${locale}/does-not-exist`);
    expect(raw.status()).toBe(404);
    const html = await raw.text();
    expect(html).toMatch(new RegExp(`<html[^>]*lang="${locale}"`));
    expect(html).toContain(`<h1>${messages[locale].notFound.title}</h1>`);
    expect(html).not.toContain('id="__next_error__"');

    await page.goto(`/${locale}/does-not-exist`);
    await expect(page.getByRole("link", { name: messages[locale].notFound.backHome })).toHaveAttribute("href", `/${locale}`);
  });
}

test("unknown file-like paths get a localized 404, not a server error", async ({ request }) => {
  const response = await request.get("/wp-login.php");
  expect(response.status()).toBe(404);
  expect(response.url()).toMatch(/\/am\/wp-login\.php$/);
  expect(await response.text()).toContain(`<h1>${am.notFound.title}</h1>`);
});

// D-037 replaces the page cache of spec §4 (ISR): every page carries a fresh CSP nonce, so it is
// rendered per request and must never be stored by Cloudflare or the browser (a cached nonce
// would be shared by everyone). Content data stays cached on the server.
test("public pages are rendered per request with a fresh nonce, never cached publicly", async ({ request }) => {
  for (const path of ["/en", "/en/e2e-test-page"]) {
    const [first, second] = [await request.get(path), await request.get(path)];
    const nonce = (r: typeof first) => r.headers()["content-security-policy"]?.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce(first), path).toBeTruthy();
    expect(nonce(second), path).not.toBe(nonce(first));
    expect(first.headers()["cache-control"], path).toMatch(/private|no-store/);
    expect(first.headers()["cache-control"], path).not.toMatch(/s-maxage/);
  }
});
