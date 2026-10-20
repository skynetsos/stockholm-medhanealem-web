import { expect, test } from "@playwright/test";

import en from "../../src/messages/en.json" with { type: "json" };

// CMS pages in the production build (fixtures: scripts/e2e-fixtures.ts). D-017: published page
// addresses are rewritten by the middleware; everything else must get the real, server-rendered 404.

test("a published page is server-rendered in the visitor's language", async ({ request }) => {
  const response = await request.get("/en/e2e-test-page");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toMatch(/<html[^>]*lang="en"/);
  expect(html).toContain("<h1>Test page</h1>");
});

test("a section landing page lives at the section address", async ({ page }) => {
  await page.goto("/en/our-church");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Our Church");
  // The language switcher stays on the same page.
  const switcher = page.getByRole("navigation", { name: en.common.changeLanguage });
  await expect(switcher.getByRole("link", { name: "አማርኛ" })).toHaveAttribute("href", "/am/our-church");
});

for (const path of ["/en/our-church/e2e-draft", "/en/our-church/does-not-exist", "/en/cms/other/e2e-test-page"]) {
  test(`${path} gets the server-rendered 404`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toMatch(/<html[^>]*lang="en"/);
    expect(html).toContain(`<h1>${en.notFound.title}</h1>`);
  });
}

test("built-in pages win over CMS addresses: /our-church/clergy", async ({ page }) => {
  const response = await page.goto("/en/our-church/clergy");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.clergy.title);
});

test("CMS pages are cached like other pages (ISR)", async ({ request }) => {
  await expect
    .poll(async () => (await request.get("/en/e2e-test-page")).headers()["x-nextjs-cache"], { timeout: 15_000 })
    .toMatch(/^(HIT|STALE)$/);
});
