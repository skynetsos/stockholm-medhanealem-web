import { expect, test } from "@playwright/test";

import en from "../../src/messages/en.json" with { type: "json" };

// CMS pages in the production build (fixtures: scripts/e2e-fixtures.ts). D-017: published page
// addresses are rewritten by the middleware; everything else must get the real, server-rendered 404.

test("a published page is server-rendered in the visitor's language", async ({ request }) => {
  const response = await request.get("/en/e2e-test-page");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toMatch(/<html[^>]*lang="en"/);
  expect(html).toMatch(/<h1[^>]*>Test page<\/h1>/);
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

// The clergy page exists only once a profile is published (review F-15); the fixtures have none.
test("/our-church/clergy without published clergy gets the server-rendered 404", async ({ request }) => {
  expect((await request.get("/en/our-church/clergy")).status()).toBe(404);
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

// Phase 2 task 3: checklist and notice from the Baptism page settings, request button while open.
test("the baptism page shows what to prepare, the notice and the request button", async ({ page }) => {
  await page.goto("/en/sacraments/baptism");
  const checklist = page.getByRole("region", { name: en.sacraments.requirementsTitle });
  await expect(checklist.getByRole("listitem")).toHaveText(["A godparentAn Orthodox Tewahedo Christian"]);
  await expect(page.getByRole("complementary", { name: en.sacraments.noticeTitle })).toContainText(en.sacraments.baptismNotice);
  await expect(page.getByRole("link", { name: en.sacraments.requestCta })).toHaveAttribute("href", "/en/sacraments/baptism/request");

  // Untranslated rows fall back to Amharic like other content; the notice is always translated.
  await page.goto("/sv/sacraments/baptism");
  await expect(page.getByText("የክርስትና አባት/እናት")).toBeVisible();
});

// A sacrament page without guidance is a 404 too (tests/unit/cms-routing.test.ts; the fixtures now have all three).
for (const path of ["/en/our-faith/unknown", "/en/our-faith/e2e-baptism-guidance"]) {
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
  // 24-hour clock (review F-04).
  await expect(page.getByText(/Every Sunday · 08:00\s*–\s*11:30/)).toBeVisible();

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
  // Departments are an accordion (D-049): open the row, then follow its link.
  await page.locator("summary", { hasText: /Mezmur|መዝሙር/ }).click();
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
  await page.getByRole("button", { name: en.video.play }).first().click();
  await expect(page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/"]')).toHaveCount(1);
});

// Media library (Phase 3 task 3, D-042): filters by type and year, uploaded recordings in an audio player.
test("videos can be filtered by type and year; recordings play from this site", async ({ page, request }) => {
  await page.goto("/en/media/videos");
  const filters = page.getByRole("navigation", { name: en.media.filters });
  await filters.getByRole("link", { name: en.media.categories.liturgy }).click();
  await expect(page).toHaveURL(/\/en\/media\/videos\?category=liturgy$/);
  await expect(page.getByRole("heading", { level: 3 })).toHaveText(["E2E liturgy"]);
  await expect(filters.getByRole("link", { name: en.media.categories.liturgy })).toHaveAttribute("aria-current", "page");

  await page.goto("/en/media/videos?year=2026");
  await expect(page.getByRole("heading", { level: 3, name: "E2E liturgy" })).toHaveCount(0);
  const audio = page.locator("audio");
  await expect(audio).toHaveCount(1);
  await expect(audio).toHaveAttribute("preload", "none");
  const src = await audio.locator("source").getAttribute("src");
  // Served by this site (same origin), never by a third party.
  expect(new URL(src!, page.url()).origin).toBe(new URL(page.url()).origin);
  expect(new URL(src!, page.url()).pathname).toMatch(/^\/api\/audio\/file\//);
  const file = await request.get(src!);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toBe("audio/mpeg");

  await page.goto("/en/media/videos?category=liturgy&year=2026");
  await expect(page.getByText(en.media.noResults)).toBeVisible();
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
  // Scoped to the page content: the footer repeats the address and map link (D-049).
  await expect(page.locator("main address")).toContainText("Bandhagen");
  await expect(page.getByRole("main").getByRole("link", { name: en.home.openMap })).toHaveAttribute("href", /openstreetmap\.org|^https:/);
  expect(requests.filter((url) => !url.startsWith("http://localhost"))).toEqual([]);
});

// Baptism request form (Phase 2 task 4; D-050): the reference layout's two groups, then our review
// step with the privacy consent, and the reference at the end.
test("a baptism request goes through details and review and gets a reference", async ({ page, request }) => {
  test.setTimeout(60_000);
  const startedAt = Date.now() - 1000;
  const f = en.baptismForm;
  await page.goto("/en/sacraments/baptism");
  await page.getByRole("link", { name: en.sacraments.requestCta }).click();
  await expect(page).toHaveURL(/\/en\/sacraments\/baptism\/request$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(f.title);

  // Details: errors first, in the form's order (the group about the child, then the contact person).
  await page.getByRole("button", { name: f.next }).click();
  const summary = page.locator("#baptism-errors");
  await expect(summary).toBeFocused();
  await expect(summary.getByRole("link")).toHaveText([
    `${f.candidateName}: ${f.errors.required}`,
    `${f.dateOfBirth}: ${f.errors.required}`,
    `${f.gender}: ${f.errors.choice}`,
    `${f.placeOfBirth}: ${f.errors.required}`,
    `${f.fatherName}: ${f.errors.required}`,
    `${f.motherName}: ${f.errors.required}`,
    `${f.applicantName}: ${f.errors.required}`,
    `${f.applicantPhone}: ${f.errors.required}`,
    `${f.applicantEmail}: ${f.errors.required}`,
  ]);
  await expect(page.getByRole("group", { name: f.groups.candidate })).toBeVisible();
  await expect(page.getByRole("group", { name: f.groups.contact })).toBeVisible();

  // The parent's relationship and consent appear for a child, not for an adult.
  await page.getByLabel(f.dateOfBirth).fill("1990-01-01");
  await expect(page.getByLabel(f.guardianRelationship)).toBeHidden();
  await page.getByLabel(f.dateOfBirth).fill("2026-05-02");
  await expect(page.getByLabel(f.guardianRelationship)).toBeVisible();
  await page.getByLabel(f.candidateName).fill("E2E Infant");
  await page.getByLabel(f.preferredPeriod).fill("December 2026");
  await page.getByLabel(f.baptismalName).fill("Welde Mikael");
  await page.getByLabel(f.gender).selectOption("male");
  await page.getByLabel(f.placeOfBirth).fill("Stockholm");
  await page.getByLabel(f.fatherName).fill("E2E Applicant");
  await page.getByLabel(f.motherName).fill("E2E Mother");
  await page.getByLabel(f.applicantName).fill("E2E Applicant");
  await page.getByLabel(f.applicantPhone).fill("070 123 45 67");
  await page.getByLabel(f.applicantEmail).fill("e2e-applicant@example.org");
  await page.getByLabel(f.guardianRelationship).fill("Father");
  await page.getByLabel(f.guardianConsent).check();
  await page.getByRole("button", { name: f.next }).click();

  // Review, go back to change something, then consent and send.
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(f.steps.review) })).toBeFocused();
  const review = page.getByRole("region", { name: f.groups.candidate });
  await expect(review).toContainText("E2E Infant");
  await expect(review).toContainText("Welde Mikael");
  await expect(review).toContainText(/2 May 2026|May 2, 2026/);
  await review.getByRole("button", { name: new RegExp(f.change) }).click();
  await page.getByLabel(f.candidateName).fill("E2E Infant Changed");
  await page.getByRole("button", { name: f.next }).click();
  await expect(review).toContainText("E2E Infant Changed");

  await page.getByRole("button", { name: f.submit }).click();
  await expect(summary).toContainText(f.errors.privacy);
  await page.getByLabel(f.privacy).check();
  // Turnstile (Cloudflare test key) passes by itself once the form is in use; give it a moment.
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await page.getByRole("button", { name: f.submit }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText(f.successTitle, { timeout: 20_000 });
  const reference = (await status.textContent())!.match(/BAP-\d{4}-\d+/)![0];

  // Task 5: the applicant's acknowledgement and the office notification arrive (Mailpit).
  const freshMail = async () => {
    const search = await (await request.get(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`subject:"${reference}"`)}`)).json();
    return (search.messages as { Created: string }[]).filter((m) => Date.parse(m.Created) >= startedAt).length;
  };
  await expect.poll(freshMail).toBe(2);
});

// Inquiry forms (Phase 2 task 7). Turnstile (Cloudflare test key) passes by itself once a form is in use.
test("a child is registered for Sunday School from the Sunday School page", async ({ page }) => {
  test.setTimeout(60_000);
  const f = en.inquiryForms.sunday_school;
  await page.goto("/en/sunday-school");
  await page.getByRole("link", { name: f.title }).click();
  await expect(page).toHaveURL(/\/en\/sunday-school\/join$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(f.title);
  await page.getByLabel(f.name).fill("E2E Parent");
  await page.getByLabel(en.contact.email, { exact: true }).fill("e2e-parent@example.org");
  await page.getByLabel(f.childName, { exact: true }).fill("E2E Child");
  await page.getByLabel(f.childAge, { exact: true }).fill("2");
  await page.getByLabel(en.inquiryForms.privacySundaySchool).check();
  await page.getByRole("button", { name: f.submit }).click();
  await expect(page.locator("#inquiry-sunday-school-errors")).toContainText(en.contact.errors.childAge);
  await page.getByLabel(f.childAge, { exact: true }).fill("8");
  await page.getByLabel(en.inquiryForms.privacySundaySchool).check();
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await page.getByRole("button", { name: f.submit }).click();
  await expect(page.getByRole("status")).toContainText(/INQ-\d{4}-\d+/, { timeout: 20_000 });
});

test("someone offers to volunteer", async ({ page }) => {
  test.setTimeout(60_000);
  const f = en.inquiryForms.volunteer;
  await page.goto("/en/support/volunteer");
  await page.getByLabel(en.contact.name, { exact: true }).fill("E2E Volunteer");
  await page.getByLabel(en.contact.email, { exact: true }).fill("e2e-volunteer@example.org");
  await page.getByLabel(f.interest.choir).check();
  await page.getByLabel(f.interest.media).check();
  await page.getByLabel(f.availability).fill("Saturday mornings");
  await page.getByLabel(en.contact.privacy).check();
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await page.getByRole("button", { name: f.submit }).click();
  await expect(page.getByRole("status")).toContainText(/INQ-\d{4}-\d+/, { timeout: 20_000 });
});

test("the fitihat page has the memorial request form under the guidance (D-050)", async ({ page }) => {
  const f = en.inquiryForms.funeral;
  await page.goto("/en/sacraments/fitihat");
  await expect(page.getByRole("heading", { level: 2, name: "Fitihat guidance test" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: f.title })).toBeVisible();
  // The reference layout's fields, in order.
  const form = page.locator('form[aria-labelledby="inquiry-funeral-title"]');
  await expect(form.locator("label:visible").filter({ hasNotText: en.contact.honeypot })).toHaveText([f.name, f.phone, f.email, f.deceasedName, f.dateOfPassing, f.preferredDate, f.message, new RegExp(en.contact.privacy.slice(0, 20))]);
  await expect(page.getByRole("button", { name: f.submit })).toBeVisible();
});

// Wedding request (D-050): two steps as on the reference layout; "Next" checks the first step.
test("a wedding request goes through two steps and gets a reference", async ({ page }) => {
  test.setTimeout(60_000);
  const f = en.inquiryForms.marriage;
  await page.goto("/en/sacraments/marriage");
  const form = page.locator('form[aria-labelledby="inquiry-marriage-title"]');
  await form.getByRole("button", { name: en.inquiryForms.next }).click();
  await expect(page.locator("#inquiry-marriage-errors")).toBeFocused();
  await expect(page.locator("#inquiry-marriage-errors").getByRole("link")).toHaveText([
    `${f.name}: ${en.contact.errors.required}`,
    `${f.partnerName}: ${en.contact.errors.required}`,
    `${f.phone}: ${en.contact.errors.required}`,
    `${f.partnerPhone}: ${en.contact.errors.required}`,
  ]);
  await page.getByLabel(f.name).fill("E2E Groom");
  await page.getByLabel(f.partnerName).fill("E2E Bride");
  await page.getByLabel(f.phone).fill("070 111 22 33");
  await page.getByLabel(f.partnerPhone).fill("070 444 55 66");
  await form.getByRole("button", { name: en.inquiryForms.next }).click();
  await expect(form.getByRole("heading", { name: new RegExp(f.steps.wedding) })).toBeFocused();
  await expect(page.getByLabel(f.name)).toBeHidden();
  await page.getByLabel(f.email).fill("e2e-couple@example.org");
  await page.getByLabel(en.contact.privacy).check();
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await form.getByRole("button", { name: f.submit }).click();
  await expect(page.getByRole("status")).toContainText(/INQ-\d{4}-\d+/, { timeout: 20_000 });
});

// Prayer request (D-050): its own page under Services; phone required, email optional.
test("a prayer request is sent from its page", async ({ page }) => {
  test.setTimeout(60_000);
  const f = en.inquiryForms.pastoral;
  await page.goto("/en/sacraments/prayer-request");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(f.title);
  await page.getByLabel(f.name).fill("E2E Prayer");
  await page.getByLabel(f.phone).fill("070 111 22 33");
  await page.getByLabel(f.requestType).selectOption("sick");
  await page.getByLabel(f.privacy).check();
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await page.getByRole("button", { name: f.submit }).click();
  await expect(page.getByRole("status")).toContainText(/INQ-\d{4}-\d+/, { timeout: 20_000 });
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

// Site search (Phase 3 task 6, D-043): from the header, a GET form, results with highlighted words.
test("search finds content in English and Amharic, from the header link", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("banner").getByRole("link", { name: en.common.search }).click();
  await expect(page).toHaveURL(/\/en\/search$/);
  await page.getByLabel(en.search.label).fill("fasting");
  await page.getByRole("button", { name: en.search.submit }).click();
  await expect(page).toHaveURL(/\/en\/search\?q=fasting$/);
  const results = page.getByRole("region", { name: /result/ });
  await expect(results.getByRole("link", { name: "Fasting test teaching" })).toHaveAttribute("href", "/en/our-faith/e2e-fasting");
  await expect(results.locator("mark").first()).toBeVisible();

  // Amharic: the teaching's Amharic text (ጽሑፍ), and its Amharic title.
  await page.goto(`/am/search?q=${encodeURIComponent("ጽሑፍ")}`);
  await expect(page.getByRole("link", { name: "Fasting test teaching (am)" })).toBeVisible();

  await page.goto("/en/search?q=nothing-matches-this");
  await expect(page.getByRole("status")).toContainText("Nothing found");
});
