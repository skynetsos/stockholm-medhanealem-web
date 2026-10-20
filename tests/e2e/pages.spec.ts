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

// Teachings and sacrament pages exist only with published content (D-018).
test("faith teachings and sacrament guidance are served", async ({ page }) => {
  await page.goto("/en/our-faith");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.faith.title);
  await page.getByRole("link", { name: "Fasting test teaching" }).click();
  await expect(page).toHaveURL(/\/en\/our-faith\/e2e-fasting$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fasting test teaching");

  await page.goto("/en/sacraments");
  await page.getByRole("link", { name: en.sacraments.baptism }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Baptism guidance test" })).toBeVisible();
});

for (const path of ["/en/our-faith/unknown", "/en/our-faith/e2e-baptism-guidance", "/en/sacraments/marriage"]) {
  test(`${path} without content gets the server-rendered 404`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain(`<h1>${en.notFound.title}</h1>`);
  });
}

// Worship (D-019): lists exist only with events of their kind; the calendar always; iCal feed.
test("weekly services list, calendar and iCal feed", async ({ page, request }) => {
  await page.goto("/en/worship/weekly");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.worship.weekly);
  await expect(page.getByRole("heading", { level: 2, name: "E2E Kidase" })).toBeVisible();
  await expect(page.getByText(/Every Sunday · 8:00\s*–\s*11:30\s*AM/)).toBeVisible();

  await page.goto("/en/worship/calendar");
  const today = page.locator('td[aria-selected="true"] button');
  await expect(today).toHaveAttribute("aria-current", "date");
  await today.focus();
  await page.keyboard.press("PageDown");
  await expect(page.locator('td[aria-selected="true"] button')).toBeFocused();

  const ics = await request.get("/api/ical?lang=en");
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(ics.headers()["cache-control"]).toBe("public, max-age=3600");
  const body = await ics.text();
  expect(body).toContain("SUMMARY:E2E Kidase");
  expect(body).toMatch(/DTSTART:\d{8}T0[67]0000Z/); // 08:00 Stockholm in summer (06Z) or winter (07Z)
});

for (const path of ["/en/worship/monthly-feasts", "/en/worship/livestream"]) {
  test(`${path} without content gets the server-rendered 404`, async ({ request }) => {
    expect((await request.get(path)).status()).toBe(404);
  });
}
