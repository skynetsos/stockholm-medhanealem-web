import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import en from "../../src/messages/en.json" with { type: "json" };

/**
 * The reference-layout menu (D-049): dropdowns on wide screens (hover, click, keyboard), the drawer
 * with one accordion per section on phones. Uses the seeded menu: "Connect" always has "Contact Us"
 * (/visit) and "Events" always has "Calendar".
 */
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("desktop dropdowns", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("open on click, close on Escape with focus back on the button", async ({ page }) => {
    await page.goto("/en");
    const menu = page.getByRole("navigation", { name: en.common.mainNavigation });
    const connect = menu.getByRole("button", { name: "Connect" });
    await expect(connect).toHaveAttribute("aria-expanded", "false");
    await connect.click();
    await expect(connect).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("link", { name: "Contact Us" })).toBeVisible();

    // An open dropdown passes axe.
    const results = await new AxeBuilder({ page }).withTags(WCAG).include("header").analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(connect).toHaveAttribute("aria-expanded", "false");
    await expect(menu.getByRole("link", { name: "Contact Us" })).toBeHidden();
    await expect(connect).toBeFocused();
  });

  test("open on hover and with the keyboard; a click elsewhere closes", async ({ page }) => {
    await page.goto("/en");
    const menu = page.getByRole("navigation", { name: en.common.mainNavigation });
    await menu.getByRole("button", { name: "Events" }).hover();
    await expect(menu.getByRole("link", { name: "Calendar" })).toBeVisible();
    await page.mouse.move(700, 700);
    await expect(menu.getByRole("link", { name: "Calendar" })).toBeHidden();

    const connect = menu.getByRole("button", { name: "Connect" });
    await connect.focus();
    await page.keyboard.press("Enter");
    await expect(connect).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Tab");
    await expect(menu.getByRole("link", { name: "Contact Us" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/en\/visit$/);
    // The current page's item is marked.
    await connect.click();
    await expect(menu.getByRole("link", { name: "Contact Us" })).toHaveAttribute("aria-current", "page");
    await page.mouse.click(700, 700);
    await expect(connect).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("phone drawer", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the drawer opens; each section is an accordion", async ({ page }) => {
    await page.goto("/en");
    const toggle = page.getByRole("button", { name: en.common.menu });
    await toggle.click();
    const menu = page.getByRole("navigation", { name: en.common.mainNavigation });
    const connect = menu.getByRole("button", { name: "Connect" });
    await expect(connect).toBeVisible();
    await expect(menu.getByRole("link", { name: "Contact Us" })).toBeHidden();
    await connect.click();
    await expect(connect).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("link", { name: "Contact Us" })).toBeVisible();
    // On phones the language switcher is the drawer's first row.
    await expect(page.getByRole("navigation", { name: en.common.changeLanguage })).toBeVisible();
    // No horizontal scrolling at phone width.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await menu.getByRole("link", { name: "Contact Us" }).click();
    await expect(page).toHaveURL(/\/en\/visit$/);
    await expect(page.getByRole("button", { name: en.common.menu })).toHaveAttribute("aria-expanded", "false");
  });
});
