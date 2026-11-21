import { type APIRequestContext, type Browser, expect, type Page, test } from "@playwright/test";
import { generate } from "otplib";

import en from "../../src/messages/en.json" with { type: "json" };

/**
 * The whole baptism case journey (spec Phase 2 task 11), as people do it:
 * an applicant submits the form → acknowledgement email → the office sends it to clergy review →
 * the clergy approver approves it for scheduling → the office sets the date and confirms it →
 * the applicant gets the confirmation email → the office marks it completed.
 * Staff sign in through the admin login and MFA screens (enrolment with a TOTP code, recovery codes).
 * Users come from scripts/e2e-fixtures.ts (test passwords, the _e2e database only).
 */
const PASSWORD = "E2e-journey-Pa55!";
const OFFICE = "e2e-office-staff@example.org";
const CLERGY = "e2e-journey-clergy@example.org";
const APPLICANT = `e2e-journey-${Date.now()}@example.org`;

/** Sign in at /admin/login and enrol MFA on the first sign-in, as staff would. */
async function signIn(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Set up two-factor authentication" })).toBeVisible({ timeout: 30_000 });
  const secret = (await page.locator("main code, section code").first().textContent())!.replace(/\s+/g, "");
  await page.getByLabel("6-digit code").fill(await generate({ secret }));
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByLabel("I have saved these codes").check();
  await page.getByRole("button", { name: "Continue to admin" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 30_000 });
  return page;
}

/** Press a status button on the case page; the page reloads with the new status. */
async function move(page: Page, action: string, status: string, confirm?: string) {
  await page.getByRole("button", { name: action, exact: true }).click();
  if (confirm) await page.getByRole("dialog").getByRole("button", { name: confirm }).click();
  await expect(page.getByText(`Status: ${status}`, { exact: true })).toBeVisible({ timeout: 30_000 });
}

async function mailTo(request: APIRequestContext, subject: string) {
  const query = encodeURIComponent(`to:"${APPLICANT}" subject:"${subject}"`);
  const search = (await (await request.get(`http://localhost:8025/api/v1/search?query=${query}`)).json()) as { messages: unknown[] };
  return search.messages.length;
}

test("a baptism case goes from the form to completed, with both applicant emails", async ({ page, browser, request }) => {
  test.setTimeout(180_000);
  const f = en.baptismForm;

  // 1. The applicant submits the request.
  await page.goto("/en/sacraments/baptism/request");
  await page.getByLabel(f.candidateName).fill("E2E Journey Candidate");
  await page.getByLabel(f.dateOfBirth).fill("1990-03-14");
  await page.getByLabel(f.gender).selectOption("male");
  await page.getByLabel(f.placeOfBirth).fill("Gondar");
  await page.getByLabel(f.fatherName).fill("E2E Journey Father");
  await page.getByLabel(f.motherName).fill("E2E Journey Mother");
  await page.getByLabel(f.applicantName).fill("E2E Journey Applicant");
  await page.getByLabel(f.applicantPhone).fill("070 123 45 67");
  await page.getByLabel(f.applicantEmail).fill(APPLICANT);
  await page.getByRole("button", { name: f.next }).click();
  await page.getByLabel(f.privacy).check();
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await page.getByRole("button", { name: f.submit }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText(f.successTitle, { timeout: 20_000 });
  const reference = (await status.textContent())!.match(/BAP-\d{4}-\d+/)![0];

  // 2. Acknowledgement email to the applicant.
  await expect.poll(() => mailTo(request, `Baptism request received (${reference})`)).toBe(1);

  // 3. The office opens the case and sends it to clergy review.
  const office = await signIn(browser, OFFICE);
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const found = await office.request.get(`/api/baptism-requests?where[reference][equals]=${reference}&depth=0`, { headers: { origin } });
  const id = ((await found.json()) as { docs: { id: number }[] }).docs[0].id;
  const casePage = `/admin/collections/baptism-requests/${id}`;
  await office.goto(casePage);
  await expect(office.getByText("Status: New", { exact: true })).toBeVisible({ timeout: 30_000 });
  // The office can't decide for the clergy: no "Approve for scheduling" here.
  await expect(office.getByRole("button", { name: "Approve for scheduling" })).toHaveCount(0);
  await move(office, "Send to clergy review", "Clergy review");
  // Under clergy review the office has no buttons: the decision is the clergy's.
  await expect(office.getByText("The next step is for someone with another role.")).toBeVisible();

  // 4. The clergy approver approves it for scheduling.
  const clergy = await signIn(browser, CLERGY);
  await clergy.goto(casePage);
  await expect(clergy.getByText("Status: Clergy review", { exact: true })).toBeVisible({ timeout: 30_000 });
  await move(clergy, "Approve for scheduling", "Scheduling");
  await clergy.context().close();

  // 5. The office sets the date (Stockholm time, shown with the Ethiopian date) and confirms it.
  const scheduled = await office.request.patch(`/api/baptism-requests/${id}`, {
    headers: { origin },
    data: { internal: { scheduledDate: "2026-12-20T09:00:00.000Z" } },
  });
  expect(scheduled.ok()).toBe(true);
  await office.reload();
  await expect(office.getByText("Status: Scheduling", { exact: true })).toBeVisible({ timeout: 30_000 });
  await office.getByRole("button", { name: "Confirm date…", exact: true }).click();
  await expect(office.getByRole("dialog")).toContainText("20 Dec 2026, 10:00"); // 09:00 UTC is 10:00 in Stockholm
  await expect(office.getByRole("dialog")).toContainText("E.C.");
  await office.getByRole("dialog").getByRole("button", { name: "Confirm and email" }).click();
  await expect(office.getByText("Status: Confirmed", { exact: true })).toBeVisible({ timeout: 30_000 });

  // 6. The applicant gets the confirmation email.
  await expect.poll(() => mailTo(request, `Baptism confirmed (${reference})`)).toBe(1);

  // 7. After the baptism, the office marks it completed; nothing follows.
  await move(office, "Mark as completed", "Completed");
  await expect(office.getByRole("button", { name: "Mark as completed" })).toHaveCount(0);
  // The timeline records every step.
  await expect(office.getByRole("heading", { name: "Timeline" })).toBeVisible();
  for (const label of ["Clergy review", "Scheduling", "Confirmed", "Completed"]) {
    await expect(office.locator("section, div").filter({ has: office.getByRole("heading", { name: "Timeline" }) }).last()).toContainText(label);
  }
  await office.context().close();
});
