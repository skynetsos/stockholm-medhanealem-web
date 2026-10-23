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
  const today = page.locator('button[aria-pressed="true"]');
  await expect(today).toHaveAttribute("aria-current", "date");
  await today.focus();
  await page.keyboard.press("PageDown");
  await expect(page.locator('button[aria-pressed="true"]')).toBeFocused();

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

// Sunday School, News and Media (D-020).
test("Sunday School, News and Media pages with content", async ({ page }) => {
  await page.goto("/en/sunday-school");
  await page.getByRole("link", { name: /Mezmur|መዝሙር/ }).click();
  await expect(page.getByText("Choir practice every week.")).toBeVisible();

  await page.goto("/en/news");
  await page.getByRole("link", { name: "E2E news" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E news");

  await page.goto("/en/media");
  await page.getByRole("link", { name: "E2E gallery" }).click();
  await page.getByRole("button", { name: /E2E photo/ }).click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/en/media/videos");
  await expect(page.locator("iframe")).toHaveCount(0); // nothing from YouTube before Play
  await page.getByRole("button", { name: en.video.play }).click();
  await expect(page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/"]')).toHaveCount(1);
});

for (const path of ["/en/sunday-school/education", "/en/news/unknown", "/en/media/galleries/unknown"]) {
  test(`${path} without content gets the server-rendered 404`, async ({ request }) => {
    expect((await request.get(path)).status()).toBe(404);
  });
}

// Visit (D-021): built-in page with the address from Site settings; nothing third-party on load.
test("/visit shows the address and loads nothing from map services", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/en/visit");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.visit.title);
  await expect(page.locator("address")).toContainText("Bandhagen");
  await expect(page.getByRole("link", { name: en.home.openMap })).toHaveAttribute("href", /openstreetmap\.org|^https:/);
  expect(requests.filter((url) => !url.startsWith("http://localhost"))).toEqual([]);
});

test("/support/volunteer waits for the form (task 6): 404", async ({ request }) => {
  expect((await request.get("/en/support/volunteer")).status()).toBe(404);
});

// Contact form (task 6): sends, shows the reference, and the office gets an email without the message.
test("contact form sends a message and the office is notified", async ({ page, request }) => {
  test.setTimeout(60_000);
  const startedAt = Date.now() - 1000;
  await page.goto("/en/visit");
  await page.getByLabel(en.contact.name, { exact: true }).fill("E2E Visitor");
  await page.getByLabel(en.contact.email, { exact: true }).fill("e2e-visitor@example.org");
  await page.getByLabel(en.contact.message, { exact: true }).fill("A question sent by the end-to-end test.");
  await page.getByLabel(en.contact.privacy, { exact: true }).check();
  // Turnstile (Cloudflare test key) passes by itself once the form is in use; give it a moment.
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await page.getByRole("button", { name: en.contact.submit }).click();
  const status = page.getByRole("status");
  // Sending checks the token with Cloudflare and emails the office: allow more than the default 5 s.
  await expect(status).toContainText(en.contact.successTitle, { timeout: 20_000 });
  const reference = (await status.textContent())!.match(/INQ-\d{4}-\d+/)![0];

  // Only mail sent during this test counts (references restart with each fresh e2e database).
  const freshMail = async () => {
    const search = await (await request.get(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`subject:"${reference}"`)}`)).json();
    return (search.messages as { Created: string }[]).filter((m) => Date.parse(m.Created) >= startedAt).length;
  };
  await expect.poll(freshMail).toBe(1);
});

test("contact form shows field errors and keeps what was typed", async ({ page }) => {
  await page.goto("/en/visit");
  await page.getByLabel(en.contact.name, { exact: true }).fill("E2E Visitor");
  await page.getByLabel(en.contact.email, { exact: true }).fill("not-an-email");
  await page.getByRole("button", { name: en.contact.submit }).click();
  const summary = page.locator("#contact-errors");
  await expect(summary).toBeFocused();
  await expect(summary).toContainText(en.contact.errors.email);
  await expect(page.getByLabel(en.contact.email, { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel(en.contact.name, { exact: true })).toHaveValue("E2E Visitor");
});
