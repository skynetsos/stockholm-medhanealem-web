import { expect, test } from "@playwright/test";

// SEO (task 8, D-023). The e2e server runs with SITE_ENV=development, so it must stay out of search.

test("robots.txt keeps search engines out outside production", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toMatch(/User-Agent: \*\s+Disallow: \//);
});

test("pages are noindex outside production", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("sitemap lists existing pages in each indexed language, never drafts or Swedish (not public yet)", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml).toContain("/en/e2e-test-page</loc>");
  expect(xml).toContain("/am/our-faith/e2e-fasting</loc>");
  expect(xml).toContain("/en/worship/calendar</loc>");
  expect(xml).toMatch(/hreflang="am" href="[^"]+\/am\/e2e-test-page"/);
  expect(xml).not.toContain("e2e-draft");
  expect(xml).not.toContain("/sv/");
});

test("structured data: the church on the home page, services on the calendar", async ({ page }) => {
  const jsonLd = async () =>
    (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap((text) => {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [data];
    });

  await page.goto("/en");
  expect((await jsonLd()).find((d) => d["@type"] === "Church")).toMatchObject({ address: { addressLocality: "Bandhagen" } });

  await page.goto("/en/worship/calendar");
  const kidase = (await jsonLd()).find((d) => d["@type"] === "Event" && d.name === "E2E Kidase");
  expect(kidase?.startDate).toMatch(/T08:00:00\+0[12]:00$/);
});
