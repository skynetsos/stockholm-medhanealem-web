import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import en from "../../src/messages/en.json" with { type: "json" };

/**
 * Accessibility (spec Phase 1 task 9, exit checklist: "axe: 0 serious/critical issues on all
 * templates"). WCAG 2.2 A/AA rules on every page type with the e2e fixture content, in both main
 * languages, at desktop and phone size, plus the interactive states (lightbox, form errors, menu).
 * Third-party frames (Turnstile, video players) are outside our control and not scanned.
 */
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectAccessible(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).exclude("iframe").analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const report = results.violations.map(
    (v) => `${v.impact} ${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join("\n    ")}`,
  );
  if (report.length) console.log(`[axe] ${label}\n  ${report.join("\n  ")}`);
  expect(serious.map((v) => `${v.id} (${v.nodes.length})`), label).toEqual([]);
}

const PAGES = [
  "/en",
  "/am",
  "/en/e2e-test-page",
  "/en/our-church",
  "/en/our-church/clergy",
  "/en/our-faith",
  "/en/our-faith/e2e-fasting",
  "/en/sacraments",
  "/en/sacraments/baptism",
  "/en/worship/weekly",
  "/en/worship/calendar",
  "/am/worship/calendar",
  "/en/sunday-school",
  "/en/sunday-school/mezmur",
  "/en/news",
  "/en/news/e2e-news",
  "/en/media",
  "/en/media/galleries/e2e-gallery",
  "/en/media/videos",
  "/en/visit",
  "/am/visit",
  "/en/does-not-exist",
];

for (const [device, viewport] of [
  ["desktop", { width: 1280, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test.describe(device, () => {
    test.use({ viewport });
    for (const path of PAGES) {
      test(`${path} has no serious accessibility issues`, async ({ page }) => {
        await page.goto(path);
        await expectAccessible(page, `${device} ${path}`);
      });
    }
  });
}

test("lightbox open", async ({ page }) => {
  await page.goto("/en/media/galleries/e2e-gallery");
  await page.getByRole("button", { name: /E2E photo/ }).click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await expectAccessible(page, "lightbox");
});

test("contact form with errors", async ({ page }) => {
  await page.goto("/en/visit");
  await page.getByRole("button", { name: en.contact.submit }).click();
  await expect(page.locator("#contact-errors")).toBeFocused();
  await expectAccessible(page, "contact form errors");
});

test("phone menu open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/am");
  await page.getByRole("button", { name: /ማውጫ/ }).click();
  await expectAccessible(page, "phone menu");
});

test("skip link is the first thing keyboard users reach and moves focus to the content", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: en.common.skipToContent });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});
