import { expect, type Page, test } from "@playwright/test";
import { generate } from "otplib";

import en from "../../src/messages/en.json" with { type: "json" };

/**
 * Content Security Policy (spec Phase 2 task 10, D-037): the pages that load third-party frames or
 * rely on scripts work with zero CSP violations — the contact form (Turnstile), a video embed
 * (youtube-nocookie) and the admin case page (its own policy). Violations are caught both as
 * `securitypolicyviolation` events and as the browser's console errors.
 */
async function watchCsp(page: Page) {
  const console: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to (load|execute|apply|frame|connect)/i.test(message.text())) console.push(message.text());
  });
  await page.addInitScript(() => {
    const store: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = store;
    document.addEventListener("securitypolicyviolation", (e) => store.push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`));
  });
  return async () => [...console, ...(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []))];
}

test("contact form with Turnstile: nonce policy, scripts run, zero violations", async ({ page }) => {
  test.setTimeout(60_000);
  const violations = await watchCsp(page);
  const response = await page.goto("/en/visit");
  const csp = response!.headers()["content-security-policy"];
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).not.toContain("'unsafe-inline' 'strict-dynamic'");
  // A new nonce on every response.
  const again = (await page.request.get("/en/visit")).headers()["content-security-policy"];
  expect(again).not.toBe(csp);

  await page.getByLabel(en.contact.name, { exact: true }).click();
  // The Turnstile token proves our scripts and Cloudflare's frame both ran under the policy.
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  expect(await violations()).toEqual([]);
});

test("video embed (youtube-nocookie): zero violations", async ({ page }) => {
  const violations = await watchCsp(page);
  await page.goto("/en/media/videos");
  await page.getByRole("button", { name: en.video.play }).first().click();
  const frame = page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/"]');
  await expect(frame).toBeVisible();
  await page.waitForTimeout(1500);
  expect(await violations()).toEqual([]);
});

/** Signs in the fixture super admin through the API (enrolling MFA once per run; later runs verify). */
let adminSecret: string | null = null;
async function adminSignIn(page: Page) {
  const api = page.request;
  // Payload only accepts the session cookie on requests from its own origin, as a browser sends it.
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const post = (path: string, data: unknown) => api.post(`/api/${path}`, { data, headers: { origin } });
  expect((await post("users/login", { email: "e2e-csp-admin@example.org", password: "E2e-csp-admin-Pa55!" })).ok()).toBe(true);
  if (!adminSecret) {
    adminSecret = ((await (await post("users/mfa/setup", {})).json()) as { secret: string }).secret;
    expect((await post("users/mfa/enroll", { code: await generate({ secret: adminSecret }) })).ok()).toBe(true);
  } else {
    // A new code each time: the previous one can't be replayed.
    await new Promise((r) => setTimeout(r, 31_000 - (Date.now() % 30_000)));
    expect((await post("users/mfa/verify", { code: await generate({ secret: adminSecret }) })).ok()).toBe(true);
  }
  return { api, origin };
}

test.describe.configure({ mode: "serial" });

test("admin case page: its own policy, zero violations", async ({ page }) => {
  test.setTimeout(90_000);
  const violations = await watchCsp(page);
  const { api, origin } = await adminSignIn(page);

  const { docs } = (await (await api.get("/api/baptism-requests?limit=1&depth=0", { headers: { origin } })).json()) as { docs: { id: number }[] };
  const response = await page.goto(`/admin/collections/baptism-requests/${docs[0].id}`);
  expect(response!.headers()["content-security-policy"]).toMatch(/^default-src 'self'; script-src 'self' 'unsafe-inline'/);
  await expect(page.getByText("Next step")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  await page.waitForTimeout(1000);
  expect(await violations()).toEqual([]);
});

test("404 page and optimised images: zero violations, nonce on scripts, images load (Next.js 16, D-038)", async ({ page }) => {
  const violations = await watchCsp(page);
  const response = await page.goto("/en/does-not-exist");
  expect(response!.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  // Every script on the 404 page carries this response's nonce.
  const nonce = response!.headers()["content-security-policy"].match(/'nonce-([^']+)'/)![1];
  const scripts = await page.locator("script").evaluateAll((els) => els.map((el) => (el as HTMLScriptElement).nonce));
  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts.every((n) => n === nonce)).toBe(true);

  // Gallery thumbnails go through Next.js's image optimiser (/_next/image).
  await page.goto("/en/media/galleries/e2e-gallery");
  const images = page.locator('main img[src*="/_next/image"]');
  await expect(images.first()).toBeVisible();
  // Below-the-fold thumbnails load lazily: ask the optimiser for each one directly.
  const sources = await images.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src));
  expect(sources.length).toBeGreaterThan(0);
  for (const src of sources) {
    const res = await page.request.get(src);
    expect(res.status(), src).toBe(200);
    expect(res.headers()["content-type"], src).toMatch(/^image\//);
  }
  expect(await violations()).toEqual([]);
});

test("admin missing translations: lists untranslated content, zero violations (D-041)", async ({ page }) => {
  test.setTimeout(120_000);
  const violations = await watchCsp(page);
  await adminSignIn(page);
  await page.goto("/admin/translations");
  await expect(page.getByRole("heading", { level: 1, name: "Missing translations" })).toBeVisible({ timeout: 30_000 });
  // The fixtures have English for pages and teachings, but no Swedish.
  const swedish = page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: "Svenska" }) });
  await expect(swedish).toContainText("Core content (pages and teachings) translated: 0 %");
  await expect(swedish.getByRole("link", { name: "Fasting test teaching (am)" })).toHaveAttribute("href", /\/admin\/collections\/teachings\/\d+\?locale=sv$/);
  await expect(page.getByRole("link", { name: "Missing translations" }).first()).toBeVisible();
  expect(await violations()).toEqual([]);
});
