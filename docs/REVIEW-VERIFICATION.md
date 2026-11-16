# Review verification: second pass after the fixes (2026-11-16)

This file was written by an adversarial verifier with fresh context. It checks the fixes in commits 8213d82, 3b49fe4 and 2b4eb22 (D-047) against REVIEW-FINDINGS.md and REVIEW-DECISIONS.md. "Resolution" at the end records what was done about the new findings.

**What I checked**
- **Dev site** `http://192.168.10.187:3000`, anonymously, with curl and Python:
  - all 48 sitemap URLs (44 before, plus `/support` and `/support/volunteer` in both languages)
  - the gated routes: news, privacy, cookies, clergy, baptism request
  - `/sv/our-church`
  - Ethiopic and English search on `/am` and `/en`
  - a 404 probe
  - `/api/ical?lang=am|en`
- **Church text:** all 13 blocks of `church-content-2026-11-13.md` and `.en.md` were re-compared paragraph by paragraph against `<main>` on their mapped pages.
- **Structure:** headings and hreflang on every crawled page; header and footer links on `/am` and `/en`; 12-hour times in `<main>`; Ethiopic characters on `/en` pages.
- **Security:**
  - REST and GraphQL for the private collections
  - `?draft=true` on teachings, pages and events
  - media 403
  - response headers
  - admin login title
  - placeholder approver state, by a read-only `SELECT` on the dev Postgres
- **Browser:** one in-app browser check of Turnstile on `/am/visit`: console messages, plus a client navigation away and back.
- **Code read:** every diff in the three commits, `visit/page.tsx`, `sunday-school/join/page.tsx`, `ical.ts`, `CONTENT-CHECKLIST.md`, and the docx metadata.

**What I could not check**
- **Admin UI:** no password. The dashboard warning (F-09) and the sign-in alert email (F-12) were judged from code and tests only.
- **Form submissions:** none made, so no DB writes and no Mailpit delivery.
- **Production-only behaviour:** the `SITE_ENV=production` form gate, GraphQL introspection off, and the Caddy `trusted_proxies` setup. Judged from code; the dev server runs in development mode.
- **Turnstile widget:** its iframe did not render in the hidden browser pane. Only the absence of console warnings was observed.
- **Not run:** lint, typecheck and the tests. Mobile, screen-reader and Lighthouse checks were not run either.

---

## Fix-now findings

| ID | Verdict | Evidence |
|---|---|---|
| F-04 24-hour clock | **VERIFIED** | `/am` next service "ረቡዕ 18 ኖቬምበር 2026 · 18:00". `/am/worship/weekly`: "· 18:00", "· 08:00–11:30". `/en/worship/weekly`: "08:00 – 11:30". `/en/worship/calendar`: "08:00 – 12:00", "18:00". No AM/PM, ጥዋት or ከሰዓት times in `<main>` on any of 48 pages. iCal is UTC; JSON-LD is `2026-11-18T18:00:00+01:00`. `src/lib/date-labels.ts:12` has `hourCycle: "h23"`. |
| F-02 menu/footer 404 links | **VERIFIED** | The `/am` and `/en` headers have no `/news` link. The footers have no `/privacy` or `/cookies` link; the only footer link is the diocese. `/news`, `/privacy` and `/cookies` still return 404, but nothing links to them. Side effect: see V-03. |
| F-01 baptism CTA | **VERIFIED** | Navigation global CTA path is `/sacraments/baptism/request` (`src/seed/base-data.ts:51` too). The CTA is hidden in both headers while `requestsOpen:false`. `/en/sacraments/baptism` shows "Baptism requests through the website are not open yet. Please contact the office." plus a link to `/en/visit`; the Amharic page matches. Weak spots: V-02 and V-05. |
| F-03 forms without privacy notice | **PARTIAL** | `InquirySection.tsx:19` hides the marriage, fitihat, Sunday School and volunteer forms in production while `/privacy` is missing. But **the `/visit` contact form is not gated**: `visit/page.tsx:59-64` renders `InquiryForm form="contact"` directly with `privacyHref=null`, and F-03 named `/visit` explicitly. The Sunday School consent now covers the child's name and age in am, en and sv (`/en/sunday-school/join` label confirmed). See V-01 and V-04. |
| F-15 clergy page | **VERIFIED** | `/am/our-church/clergy` and `/en/our-church/clergy` return 404 ("Page not found"); `/api/clergy` has `totalDocs: 0`. |
| F-17 hreflang/sitemap | **VERIFIED** | All 48 pages, including `/sv/our-church`, emit hreflang only for am, en and x-default. The sitemap has 48 `<loc>` entries including `/support` and `/support/volunteer`; its `xhtml:link` alternates are am and en only; all 48 return 200. |
| F-20 heading skip | **VERIFIED** | `/sacraments`: h1 then four h2 cards. No heading skips on any of the 48 pages, and exactly one h1 on each. |
| F-08 links | **VERIFIED** | `/en/sacraments` now has a fourth card, "Offerings (Mebae)" → `/en/our-faith/offerings`. The `/en/our-church` "In this section" section links `/en/our-faith` ("What Does 'Church' Mean?"). Minor: the card order differs from the list order (V-07). |
| F-14 worship titles | **VERIFIED** | `/en/worship` lists "Weekly service times", "Monthly feast dates", "Annual feast and fast dates", then the church's "Annual Major Feasts", "Monthly Feasts", "Weekly Services". The Amharic is "የሳምንታዊ አገልግሎት ሰዓታት" and so on; H1s match. |
| F-16 homepage H1 fallback | **VERIFIED** | `/am` h1 is the church's full name. `/en` h1 is "Debre Selam Menbere Papasat Medhanealem Ethiopian Orthodox Tewahedo Church, Stockholm". Meta descriptions are still absent (a church item, as decided). |
| F-06 Sunday School headings | **VERIFIED** | `/am/sunday-school`: h2 "…ሰንበት ት/ት ዓላማ" with an `<ol>` of 2 items, then h2 "የ2 አመት ስትራቴጅክ ዕቅድ" with an `<ol>` of 3. No `<br>` inside `<li>`; wrapped lines are joined. `/en/sunday-school` has the same structure (2 + 3 items). |
| F-05 Genna, Easter, fasts | **VERIFIED** | Events 45–51 (`church-year:2019:*`, all-day, non-recurring, am and en titles). Dates: Tsome Nebiyat 24 Nov 2026–6 Jan 2027, Genna 7 Jan 2027, Abiy Tsom 8 Mar–1 May 2027, Hosanna 25 Apr, Siklet 30 Apr, Fasika 2 May, Erget 10 Jun 2027. They appear on `/worship/annual-feasts` under feasts and fasts, in the calendar grid, in the homepage "Upcoming holy days" in both languages, and in iCal with an exclusive DTEND. All dates are correct. |
| F-19 iCal notices and Filseta | **VERIFIED** | The feed has 266 events, down from 526, with 0 counselling entries in both languages. Filseta is in iCal as `20270807`–`20270823` (Nehase 1–16) and on the page as "Saturday, August 7 – Sunday, August 22, 2027". As decided, Wed/Fri still have no DTEND and the Saturday school is still all-day. |
| F-18 Turnstile | **VERIFIED** (code + console) | `Turnstile.tsx` sends `language: "auto"` for am and calls `turnstile.remove` on unmount. On `/am/visit`, after focusing a field and navigating away and back on the client, there were no "Language am is not supported" or "Cannot find Widget" warnings. The widget iframe itself was not observable in the hidden pane. |
| F-22 Ethiopic search on /en | **VERIFIED** | `/en/search?q=ጥምቀት` returns "6 results", with results marked `lang="am"` and links to `/en/...`. Ranking is unchanged, as decided. |
| F-21 English draft (two points) | **VERIFIED** | `.en.md` now reads "Sundays of every week", "Every Sunday (the Lord's day)" and "Rågsved centrum"; no "Sabbath" is left. The English pages match the file (111/111 paragraphs). |
| F-24 placeholder approver | **VERIFIED** | Read-only SELECT: user 10 (`*@example.invalid`, `clergy_approver`) has `active = f`. Only 2 users exist; no e2e fixture accounts are in the dev DB. |
| F-25 introspection / admin title | **VERIFIED** (code) | `graphQL.disableIntrospectionInProduction: true`. Dev still answers `__schema`, as designed. The `/admin/login` title is "Login  – Medhanealem admin", with a cosmetic double space. |
| F-12 login alerts | **VERIFIED** (code only) | `Users.ts` adds `afterLogin: [loginAlert]`. `login-alert.ts` mails privileged roles with the Stockholm time and browser and never blocks sign-in. `tests/integration/login-alert.test.ts` exists. Not exercised live. |
| F-10 trusted IP header | **VERIFIED** (code) | `clientIp` reads only `x-real-ip`, then `x-forwarded-for`. Caddyfile has `trusted_proxies static <Cloudflare ranges>`, `client_ip_headers CF-Connecting-IP` and `header_up X-Real-IP {client_ip}`. The app port is only `expose`d in `docker-compose.prod.yml`. No other reader of `cf-connecting-ip` remains in `src`. |
| F-09 office email warning | **VERIFIED** (code only) | `OfficeEmailWarning.tsx` is registered first in `beforeDashboard` and in `importMap.js`; the en strings are in `admin.ts`. `officeEmail`, `phone` and `officeNotificationEmails` are still empty (a church item); consequence in V-02. |
| F-23 repo hygiene (two) | **VERIFIED** | The docx `dc:creator` and `cp:lastModifiedBy` are both "Stockholm Medhanealem". `git grep AIzaSy` finds only the redacted quote in REVIEW-FINDINGS.md. History is unchanged, as documented. |
| F-26 checklist | **PARTIAL** | CONTENT-CHECKLIST.md was rewritten, but the Calendar table still says "Genna not imported", Fasts "Filseta (… start day only)", English "Not started" for the worship rows, and "add the Saturday diaconate class if it should be listed", which is already listed. See V-06. |

**Church text: still verbatim.** 111/111 Amharic paragraphs and 111/111 English paragraphs were found on their 13 mapped pages, in order. No Ethiopic text appears in `<main>` on any `/en` page except search. There are no 500 errors; every route returned 200 or the expected 404.

**Security:** `/api/users`, `/api/baptism-requests`, `/api/inquiries`, `/api/case-events`, `/api/payload-preferences`, `/api/teachings/versions` and `/api/pages/versions` all return 403. GraphQL BaptismRequests, Inquiries and Users are Forbidden. `?draft=true` returns only published teachings (4) and pages (9). `/api/media` lists 2 images; other files return 403. The nonce CSP and the security headers are intact; the API CSP is `default-src 'none'; … sandbox`. No regressions.

---

## New findings

### V-01: In production, `/sunday-school/join` and `/support/volunteer` become empty pages that stay linked and in the sitemap
- **Severity:** medium (production only; not visible in the dev review)
- **Where:**
  - `src/components/forms/InquirySection.tsx:19` (`return null`)
  - `src/app/(frontend)/[locale]/sunday-school/join/page.tsx`
  - `src/app/(frontend)/[locale]/support/volunteer/page.tsx`
  - `src/app/sitemap.ts`
- **Evidence:**
  - On both pages the form section is the whole page and also renders the h1. With the gate active, `<main>` holds only the breadcrumb link (join page) or nothing, and no h1.
  - Both pages still answer 200. They are linked from `/sunday-school` and `/support`, and both are in the sitemap.
- **Suggested fix:** treat the privacy notice as part of availability, so these pages 404 and drop out of links and the sitemap while `/privacy` is unpublished in production.

### V-02: The baptism page's new "Contact the office" link leads to a page with no office contact details
- **Severity:** medium
- **Where:** `/sacraments/baptism` → `/visit`; Site settings.
- **Evidence:**
  - `/en/visit` shows only the address, a map link and the contact form. There is no phone and no email: `officeEmail`, `phone` and `officeNotificationEmails` are empty.
  - So the F-01 fallback route ends at a form whose messages notify nobody (F-09).
- **Suggested fix:** the church fills in the office email, phone and notification emails before the committee review.

### V-03: The media section is now unreachable from navigation
- **Severity:** low
- **Where:** the header "News & Media" item (`/news`) is hidden by the F-02 fix; `/media`, `/media/videos`.
- **Evidence:** only the media pages themselves link to `/media`; they are 200 and in the sitemap, so they are orphaned for visitors.
- **Suggested fix:** point the item at `/media` (already a church question, checklist item 24); raise it before the review.

### V-04: The `/visit` contact form is not covered by the production privacy gate (F-03 partial)
- **Severity:** medium (launch-blocker class, as F-03; not a blocker for the dev committee review)
- **Where:** `src/app/(frontend)/[locale]/visit/page.tsx`.
- **Evidence:**
  - Only `InquirySection` was gated. `/visit` renders `<InquiryForm form="contact">` directly.
  - The server action does not refuse submissions while `/privacy` is missing.
- **Suggested fix:**
  - Apply the same check on `/visit`, keeping the address visible.
  - Refuse submissions in the action under the same condition.

### V-05: The closed baptism page still opens with a notice about "sending a request"
- **Severity:** low
- **Where:** `BaptismIntro.tsx` (`baptismNotice`, shown unconditionally).
- **Evidence:** "Please note: Sending a request does not confirm a date… Baptism requests through the website are not open yet." The two notices contradict each other.
- **Suggested fix:** show the notice only while requests are open.

### V-06: CONTENT-CHECKLIST.md's calendar table is still stale
- **Severity:** low
- **Where:** `docs/CONTENT-CHECKLIST.md`, Worship & Calendar table.
- **Evidence:** "Genna not imported", "Filseta (… start day only)", English "Not started", "add the Saturday diaconate class". These contradict item 11 of the same file.
- **Suggested fix:** update the rows to the D-046 and D-047 state.

### V-07: Small presentation points in the new calendar entries and cards
- **Severity:** low
- **Evidence:**
  - **Good Friday:** "Good Friday (Siklet)" is typed as an annual feast, so it is listed under "Feasts". The clergy may object.
  - **Location on fasts:** fasts show a location line, which is meaningless for a fast period.
  - **Amharic date ranges:** they use a different format from single dates (an ICU range-pattern difference).
  - **Filseta:** it says "Every year on Nehase 1" next to a 16-day span.
  - **Card order:** the `/sacraments` card order (baptism, marriage, fitihat, offerings) differs from the church's list (ሀ ክርስትና, ለ ጋብቻ, ሐ መባዕ, መ ፍትሐት).
- **Suggested fix:**
  - Ask the clergy about Siklet.
  - Hide the location on all-day fasts.
  - Put the offerings card third.

---

**Overall verdict:** there are no blockers for showing the dev site to the church committee. Before the meeting, fill in the office email and phone (V-02) and decide the "News & Media" → `/media` link (V-03). V-01 and V-04 must be fixed before production.

---

## Resolution (decider and builder, 2026-11-16)

| ID | Verdict | What was done |
|---|---|---|
| V-01 | **Fixed** | Form-only pages (`/sunday-school/join`, `/support/volunteer`) exist only while forms are open (`src/lib/forms/open.ts`): in production, once `/privacy` is published. Otherwise they 404 and drop out of links, "In this section" and the sitemap. Development is unchanged. |
| V-04 | **Fixed** | The `/visit` contact form follows the same rule (the address stays). The inquiry action also refuses submissions while forms are closed. |
| V-05 | **Fixed** | The "a request does not confirm a date" notice is shown only while requests are open. |
| V-06 | **Fixed** | The calendar rows of CONTENT-CHECKLIST.md are updated to the D-046/D-047 state. |
| V-07 | **Fixed (two)** + church | The offerings card is third, as in the church's list. Fasts show no place. Siklet's category is a church question (checklist item 11). The date-range format and the Filseta label are cosmetic and left as they are. |
| F-25 title | **Fixed** | No double space before the admin title suffix. |
| V-02 | **For the church** | Office email, phone and notification emails (checklist item 12); needed before the committee tries the forms. |
| V-03 | **For the church** | Whether "News & Media" should point at `/media` until there is news (checklist item 24). |
