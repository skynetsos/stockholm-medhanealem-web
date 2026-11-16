# Review findings: adversarial review of the public site (2026-11-16)

Written by the reviewer role (Role 2) of the completeness review. Plan: REVIEW-PLAN.md. Verdicts: REVIEW-DECISIONS.md.

**What I checked**
- **Dev site** `http://192.168.10.187:3000`, anonymously, with `curl` and Python. 42 routes × `/am` and `/en`, plus `/sv/our-church`, the sitemap (44 `<loc>`), robots, `/api/ical?lang=am` (526 events), the REST API and GraphQL for private collections, drafts and media files, response headers and cookies.
- **Church text:** all 13 content blocks of `church-content-2026-11-13.md` and `.en.md`, compared paragraph by paragraph (whitespace normalised, `**`/`##` stripped) against the `<main>` text of the mapped pages.
- **Ethiopian dates:** checked by hand (Meskerem 1, 2019 E.C. = 11 Sep 2026; Meskerem 1, 2020 E.C. = 12 Sep 2027).
- **Code read:** the form actions (`src/lib/forms/*`), `Turnstile.tsx`, `date-labels.ts`, `seo.ts`, `i18n/alternates.ts`, `sitemap.ts`, `Caddyfile`, `.env*.example`, the e2e fixtures, `dev-approver.ts`, the admin import map, MFA access helpers and the data-request endpoints.
- **Browser:** one in-app browser check of the Turnstile widget on `/am/visit`.

**What I could not check**
- **Admin:** no password, and logging in to a non-localhost host with fixture credentials is not allowed. Admin screens were judged from code and anonymous responses only.
- **Form submissions:** none were made (no DB writes). Delivery to Mailpit is not verified.
- **External links:** eotc-nordics.org and openstreetmap were not fetched.
- **Devices:** mobile rendering, screen readers and Lighthouse were not run.
- **Amharic quality:** meaning was spot-checked only, by a non-native reader.

---

## Findings

### F-01: Every page's primary button "Request Baptism" leads to a page with no way to request
- **Severity:** high
- **Where:**
  - Header CTA (Navigation global `headerCTAs[1]`) on every page.
  - `/am/sacraments/baptism` and `/en/sacraments/baptism`.
- **Evidence:**
  - `/api/globals/navigation?locale=en` → `{"style":"primary","label":"Request Baptism","link":{"path":"/sacraments/baptism"}}`. The Amharic label is "የክርስትና ጥያቄ".
  - The main menu also says "Sacraments & Requests".
  - `/api/globals/baptism-page` → `{"requirements":[],"requestsOpen":false}`.
  - `/en/sacraments/baptism/request` → 404.
  - The `<main>` of `/en/sacraments/baptism` contains **0 links**. Its only call-out says "Sending a request does not confirm a date. The office will contact you…", but there is nothing to send and no link to /visit.
  - D-028 says "The 'Request a baptism' button appears only while requests are open, so it never points to a form that is closed". That covers the in-page button, but the header CTA is a static CMS link that ignores the switch.
- **Why it matters:** this is the most prominent button on the site, and it promises the site's priority feature. A visitor ends on a page that refers to a request they cannot make and gives no next step.
- **Suggested fix:**
  - While `requestsOpen` is false, hide or relabel the header CTA (e.g. filter header CTAs whose path is `/sacraments/baptism/request`, and point the CTA there).
  - Show a "Contact the office" link (`/visit`) on the baptism page when requests are closed.
  - Reword the notice when closed.

### F-02: Main menu and footer link to 404s on every page
- **Severity:** high
- **Where:**
  - Header nav item "News & Media" / "ዜናና ሚዲያ" → `/news`.
  - Footer "Privacy policy" / "የግላዊነት መመሪያ" → `/privacy`.
  - Footer "Cookies" / "ኩኪዎች" → `/cookies`. Both locales.
- **Evidence:**
  - `curl` gives 404 for `/am/news`, `/en/news`, `/am/privacy`, `/en/privacy`, `/am/cookies` and `/en/cookies`.
  - The links are present in the rendered `<header>` and `<footer>` of `/am` and `/en`.
  - The menu comes from `src/seed/base-data.ts:39`. The header does not filter items by `/api/site/paths`, which does not list `/news`.
- **Why it matters:** 3 of the 12 persistent links on every page are dead. The committee will hit them immediately.
- **Suggested fix:**
  - Point "News & Media" at `/media`, or hide menu or footer items whose internal path is not in the available-paths list.
  - Publish `/cookies` (the factual text is short) and `/privacy`.

### F-03: Five public forms collect personal data with no privacy notice available
- **Severity:** blocker (for launch); high for this review
- **Where:**
  - `/visit`, `/sacraments/marriage`, `/sacraments/fitihat`, `/sunday-school/join`, `/support/volunteer` (am and en).
  - `src/components/forms/InquirySection.tsx:25`.
- **Evidence:**
  - Each form has a required checkbox: "I agree that the church stores my message and contact details to answer me."
  - The privacy link is rendered only if `/privacy` is available (`privacyHref={available.includes("/privacy") ? "/privacy" : null}`). It is not, so the label ends in an empty slot: `…to answer me.<!-- --> </label>`.
  - `/privacy` → 404. `/privacy-baptism` → 404.
  - The Sunday School form also collects "Child's name" and "Child's age" (required), but the consent text covers only "my message and contact details".
  - The marriage and fitihat inquiries reveal religious affiliation (GDPR Art. 9).
- **Why it matters:**
  - Consent without the information required by GDPR Art. 13 (controller, purpose, retention, rights) is not informed consent.
  - The Phase 2 exit requires an approved privacy notice.
- **Suggested fix:**
  - Do not open any form in production until `/privacy` is published.
  - Consider hiding the forms (as the baptism form is hidden) while `/privacy` is missing.
  - Extend the Sunday School consent wording to the child's data.

### F-04: All service times are shown on a 12-hour clock, which is ambiguous in Amharic and contradicts the church's own text
- **Severity:** high
- **Where:**
  - `src/lib/date-labels.ts:10` (`const TIME = { hour: "2-digit", minute: "2-digit" }`).
  - `/am`, `/am/worship/weekly`, `/am/worship/calendar` and the EN equivalents.
- **Evidence:**
  - `/am`, next service: "ረቡዕ 18 ኖቬምበር 2026 · 06:00 ከሰዓት". `/am/worship/weekly`: "ዘወትር ረቡዕ · 06:00 ከሰዓት" and "ዘወትር እሑድ · 8:00 – 11:30 ጥዋት".
  - EN: "Every Wednesday · 06:00 PM", "Every Sunday · 8:00 – 11:30 AM", counselling "8:00 AM – 12:00 PM".
  - The function's own doc comment (line 46) says the output is `"08:00–11:30"`.
  - The church wrote explicitly "በስዊድን ሀገር የሰዓት አቆጣጠር ከአሥራ ስምንት ሰዓት ጀምሮ" (from 18:00, Swedish time) in order to avoid confusion with the Ethiopian clock, where "6 o'clock" is noon (European time). "06:00 ከሰዓት" invites exactly that misreading.
  - The underlying UTC values are correct (see "Checked and found OK").
- **Why it matters:** service times are the most-used information on the site, and the spec checks for "Sunday Kidase 08:00–11:30".
- **Suggested fix:** add `hourCycle: "h23"` to `TIME` in every locale, so times read 18:00 and 08:00–11:30. Optionally add a short "(Swedish time)" label in Amharic.

### F-05: The calendar and homepage skip the major feasts named in the church's own text
- **Severity:** medium
- **Where:** `/am` and `/en` "Upcoming holy days", `/worship/annual-feasts`, `/worship/calendar`, `/api/ical`.
- **Evidence:**
  - The church's `annual-feasts` text lists:
    - መ᎖ በዓለ ልደት (Genna)
    - ሸ᎖ ሆሣዕና … ሰሙነ ሕማማት … በዓለ ትንሣኤ (Hosanna, Holy Week, Easter)
    - በ᎖ በዓለ ዕርገት (Ascension)
  - None of these exists as an event. The annual list has 10 feasts plus Filseta only.
  - The homepage "Upcoming holy days" starts with "Timket (Epiphany) Tuesday, January 19, 2027", skipping Genna on 7 Jan 2027.
  - Fasika (2 May 2027) and Erget are absent.
  - No fasts are entered except Filseta: Tsome Nebiyat begins Hidar 15 = 24 Nov 2026, next week, and Abiy Tsom is missing too.
  - This is known in D-040 and the checklist, but the visible result is a homepage that omits Christmas and Easter.
- **Why it matters:** committee members will read this as an error in the church calendar.
- **Suggested fix:**
  - Enter Genna and the 2027 movable feasts and fasts manually before the committee review.
  - Or show a note on the annual-feasts page that movable feasts are added per year.

### F-06: The Sunday School page lost its two headings in the import (Amharic lists are misnumbered and broken mid-sentence)
- **Severity:** medium
- **Where:** `/am/sunday-school`, `/en/sunday-school`. Cause: `scripts/lib/html-to-lexical.ts:53` (`DROPPED = /<(script|…|button|template)…/`).
- **Evidence:**
  - In the snapshot (`dev-medhanealem.json`, wpId 116), the old page's two accordion titles are `<button>` elements:
    - "የደብረ ሰላም መድኃኔዓለም ቤተክርስቲያን ሰንበት ት/ት ዓላማ" (aims)
    - "የ2 አመት ስትራቴጅክ ዕቅድ" (2-year strategic plan)
  - The converter drops `<button>` with its content.
  - The rendered `/am/sunday-school` has two `<ol>` lists back to back, with `<li value>` = 1, 2, 1, 2, 3 and no heading between them.
  - The old site's hard `<br>` line breaks are kept inside sentences, e.g. `…ትምህርተ ሃይማኖት እና<br/>የአብነት ትምህርት…`.
  - `/en/sunday-school` instead shows a single 5-item `<ul>`, a different structure from the Amharic.
  - The "2-year plan" dates from April 2024 (`modified: 2024-04-10`). Presenting it as current, unlabelled, is misleading.
- **Why it matters:**
  - It is the only remaining old-site text, and it reads as garbled.
  - "Every sentence verbatim" also implies the structure is kept.
- **Suggested fix:**
  - Convert `<button>` text inside accordion headers to H2, and turn `<br>` inside `<li>` into a space.
  - Re-import, and ask the church whether the 2024 plan is still current.

### F-07: The "Sacraments" (ምሥጢራት) title covers rites that are not sacraments
- **Severity:** medium
- **Where:** `/am/sacraments` H1 "ምሥጢራት", `/en/sacraments` H1 "Sacraments", menu "Sacraments & Requests". Mapping in D-045.
- **Evidence:**
  - The church's text says "ቤተ ክርስቲያናችን ለተከታዮቿ የምትፈጽማቸው **ሥርዓቶች**" (the *rites* our church performs). It lists ክርስትና, ጋብቻ, መባዕ (offerings) and ፍትሐት (prayer for the dead).
  - The title "ምሥጢራት" was the site's choice (mapping table: "title: the site's own name for this section"), not the church's.
  - Offerings and fitihat are not among the seven sacraments (ምሥጢራተ ቤተ ክርስቲያን).
- **Why it matters:** clergy are likely to object to a theological mislabel, and it is on a top-level menu item.
- **Suggested fix:** ask the clergy for the title, e.g. "ሥርዓተ ቤተ ክርስቲያን" or "Church services and rites", or keep only the sacraments under this heading.

### F-08: Splitting the church's single text across pages leaves dangling sentences and orphan list letters
- **Severity:** medium
- **Where:** `/sacraments`, `/worship`, `/our-church` (both locales).
- **Evidence:**
  - `/am/sacraments` ends with "መ‚ ፍትሐት ሲሆኑ፦" ("d) Fitihat, being:"). `/en/sacraments` ends with "d) Fitihat (prayers for the departed); and". Nothing follows.
  - `/am/worship` starts with "ሠ‚ በተጨማሪም…" and `/en/worship` with "e) In addition…": item e) with no a)–d) on the page.
  - The `/sacraments` list names ሐ‚ መባዕ, but the cards below show only 3 items (ክርስትና, ጋብቻ, ፍትሐት).
  - The `/our-church` introduction ends "…ከማየታችን በፊት እንደ መግቢያ ቤተ ክርስቲያን ማለት ምን ማለት እንደሆነ በአጭሩ እንገልጻለን።" ("as an introduction we briefly explain what 'church' means"). The next paragraph jumps to the closing words, the explanation is on `/our-faith`, and `/our-church` does not link there (its "In this section" lists only the history).
- **Why it matters:** the text is verbatim but reads as broken. The church has not confirmed the split (REVIEW-PLAN (b)).
- **Suggested fix:**
  - Ask the church to confirm or adjust the split.
  - At minimum, link `/our-church` → `/our-faith`, and add Offerings to the `/sacraments` cards or drop it from the list.

### F-09: New messages probably reach nobody (no office address configured)
- **Severity:** medium
- **Where:** `src/lib/forms/inquiry.ts` `notifyOffice`, Site settings.
- **Evidence:**
  - `/api/globals/site-settings` → `"officeEmail": null, "phone": null`.
  - When there are no recipients, the code logs a warning and returns: `"Inquiry form: no office email in Site settings; inquiry saved without notification"`.
  - The notification list is staff-only, so it cannot be read anonymously. REVIEW-PLAN (c)12 states it is unset.
  - Phase 1 exit: "Contact form delivers to office mailbox".
- **Why it matters:** messages collect silently in the admin with no alert to anyone.
- **Suggested fix:**
  - Set the office notification emails before any review in which people try the forms.
  - Consider surfacing a warning in the admin dashboard when no recipient is configured.

### F-10: Per-IP limits trust client-supplied headers, so they can be bypassed in the planned production setup
- **Severity:** medium
- **Where:**
  - `src/lib/forms/security.ts:12-19` (`clientIp`), used by the inquiry and baptism actions and `src/lib/security/login-limit.ts:19`.
  - `Caddyfile`; `docs/RUNBOOK.md:173`.
- **Evidence:**
  - `clientIp` takes `cf-connecting-ip ?? x-real-ip ?? x-forwarded-for[0]`.
  - The RUNBOOK opens ports 80 and 443 to everyone (`ufw allow 80,443/tcp`), not to Cloudflare's ranges only.
  - Caddy's `reverse_proxy` passes `CF-Connecting-IP` and `X-Real-IP` through unchanged.
  - So a client hitting the origin directly can send a new `CF-Connecting-IP` per request. Each one is a new IP hash and a fresh allowance for the 5/10-min forms, 3/h baptism and 10/15-min admin sign-in limits.
  - Payload's per-account lockout and Turnstile still apply.
- **Why it matters:** the spec's per-IP rate limits (§8) are only nominal.
- **Suggested fix:**
  - Either restrict the origin to Cloudflare IPs (or use authenticated origin pulls), or have Caddy overwrite the header from a trusted source (`trusted_proxies` with Cloudflare ranges + `header_up X-Real-IP {client_ip}`, and strip `CF-Connecting-IP` otherwise).
  - Then read only that header.

### F-11: The church's Word document dates from 2021, so "current facts" may be five years old
- **Severity:** medium
- **Where:** `docs/content/church-content-2026-11-13.docx` (docProps/core.xml); D-045.
- **Evidence:**
  - `core.xml`: `<dcterms:created>2021-03-28T16:42:00Z</dcterms:created>` and `<dcterms:modified>2021-10-01T06:11:00Z</dcterms:modified>`, revision 20.
  - D-045 says the file was "saved 2026-11-14 08:10", which is probably the file-system time, not the content date.
  - Time-sensitive statements now published:
    - "we are now only awaiting the building permit"
    - "we are now teaching a third group" (diaconate)
    - "two regular priests … three priests … five deacons"
    - the Rågsved Amharic class
    - counselling Mon–Fri 8–12
- **Why it matters:** the committee may approve text it assumes is current.
- **Suggested fix:** in the sign-off, ask the church explicitly to confirm each time-sensitive statement.

### F-12: Spec §8 "login alerts" for privileged roles is not implemented, and no decision records it
- **Severity:** medium
- **Where:** spec §8 ("Privileged roles: MFA, 8h sessions, login alerts"), `src/collections/Users.ts`.
- **Evidence:**
  - `grep -ri "login alert|loginAlert|sign-in alert"` over `src` and `docs/DECISIONS.md` finds nothing.
  - MFA and the 8-hour session exist (`Users.ts:38`, `MFA_SESSION_SECONDS = 8 * 60 * 60`).
- **Why it matters:** this is a quiet deviation from the security baseline for the accounts that can read baptism data.
- **Suggested fix:** email the user on each new sign-in to a privileged account, or record a decision to defer it.

### F-13: The church's identity is named inconsistently, including the diocese
- **Severity:** medium
- **Where:** the header (Site settings `churchName`), the footer (Footer global), `/our-church` and `/our-church/history`.
- **Evidence:**
  - **Amharic header:** "በኢትዮጵያ ኦርቶዶክስ ተዋህዶ የደብረ ሰላም መንበረ ጵጵስና መድኃኔ ዓለም ቤተ ክርስቲያን".
  - **The church's own document (About H2):** "በኢትዮጵያ ኦርቶዶክስ ተዋህዶ ቤተ ክርስቲያናን የስዊድን እና እስካንዲናቪያን አህጉረ ስብከት መንበረ ጵጵስና የደብረ ሰላም መድኃኔ ዓለም ቤተ ክርስቲያን".
  - **English, three different forms:**
    - header "Debre Selam Menbere Papasat Medhanealem Ethiopian Orthodox Tewahedo Church, Stockholm"
    - About H2 "Debre Selam Medhanealem Church, Archiepiscopal See of the Diocese of Sweden and Scandinavia…"
    - History H1 "…Medhanealem Archiepiscopal Cathedral, Stockholm"
  - **Diocese:** the footer says "Nordic & Greece Diocese" / "የኖርዲክና የግሪክ ሀገረ ስብከት", while the church's text on the same site says "the Diocese of Sweden and Scandinavia" (የስዊድን እና እስካንዲናቪያን አህጉረ ስብከት).
- **Why it matters:** spec §10 #1 (canonical names) is still open, and the site currently contradicts itself.
- **Suggested fix:** have the committee fix one canonical name per language and one diocese name.

### F-14: The worship section has two pairs of near-identical page titles
- **Severity:** low
- **Where:** `/am/worship` and `/en/worship` "In this section".
- **Evidence:**
  - EN lists "Weekly services", "Monthly feasts", "Annual feasts and fasts", "Calendar", "Annual Major Feasts", "Monthly Feasts", "Weekly Services".
  - AM lists "ወርኃዊ በዓላት" twice (`/worship/monthly-feasts` and `/worship/monthly-feast-days`), plus "ሳምንታዊ አገልግሎቶች" vs "ሣምንታዊ አገልግሎት".
- **Why it matters:** visitors cannot tell which link is the schedule and which is the explanation.
- **Suggested fix:** rename one of each pair (e.g. "Weekly service times" vs "About the weekly services"), or merge the explanation into the list page.

### F-15: `/our-church/clergy` answers 200 with only a heading
- **Severity:** low
- **Where:** `/am/our-church/clergy`, `/en/our-church/clergy`.
- **Evidence:**
  - The `<main>` contains only `[h1] ካህናት` / `[h1] Clergy`.
  - `/api/clergy` → `totalDocs: 0`.
  - The page is not in the sitemap and not linked, but it is reachable.
- **Why it matters:** it violates the CLAUDE.md rule "If content is missing, hide the section" (already raised in REVIEW-PLAN (d)3).
- **Suggested fix:** gate the route like the other content pages (404 while there are no published clergy).

### F-16: The homepage H1 is the generic placeholder, and most pages have no meta description
- **Severity:** low
- **Where:** `/am`, `/en`; page metadata.
- **Evidence:**
  - **H1:** `[h1] እንኳን ደህና መጡ` / `[h1] Welcome` (Homepage hero heading empty).
  - **Meta descriptions:** none on `/en`, `/en/our-church`, `/en/visit` or `/am/worship/weekly`. Only teaching pages have one, taken from the body's first words.
  - **Share image:** `og:image` is 727×297 (below the 1200×630 og size of spec §2.8).
- **Why it matters:** the H1 counts as placeholder content per CLAUDE.md, and the site's search and social previews will be weak.
- **Suggested fix:** get the hero heading from the church; fall back to the church name as H1; add descriptions for the landing pages.

### F-17: Swedish is advertised in hreflang, and the sitemap is missing `/support`
- **Severity:** low
- **Where:** `src/i18n/alternates.ts` (all of `routing.locales`), `src/app/sitemap.ts`.
- **Evidence:**
  - **hreflang:** every page emits `<link rel="alternate" hrefLang="sv" …/sv>`, although `swedishPublic: false`. `/sv/our-church` is `noindex` and shows Amharic (`lang="am"`). D-041 says Swedish is not in the switcher, sitemap or search until it is turned on.
  - **Sitemap:** it lists 44 URLs but not `/support` or `/support/volunteer`, which both answer 200. They are missing from `/api/site/paths`, and `ALWAYS` has only `""`, `/worship/calendar` and `/visit`.
- **Suggested fix:**
  - Use `indexedLocales(settings)` for the alternates too.
  - Add `/support` and `/support/volunteer` to the sitemap's always-present paths.

### F-18: Turnstile does not support Amharic, and the widget is not cleaned up
- **Severity:** low
- **Where:** `src/components/forms/Turnstile.tsx`.
- **Evidence:** the browser console on `/am/visit` after focusing a field showed:
  - `[Cloudflare Turnstile] Language am is not supported, falling back to: en-us.`
  - `[Cloudflare Turnstile] Cannot find Widget cf-chl-widget-…, consider using turnstile.remove() to clean up a widget.`
- **Why it matters:** an interactive challenge (rare with `interaction-only`) would appear in English on Amharic pages, and widgets leak across client navigations.
- **Suggested fix:** pass `language: "auto"` (or `en`) for `am`, and call `turnstile.remove(widget)` in the effect cleanup.

### F-19: The calendar data is noisy in iCal and slightly mis-modelled
- **Severity:** low
- **Where:** `/api/ical?lang=am`, `/worship/annual-feasts`, `/worship/calendar`.
- **Evidence:**
  - **Feed contents:** the public feed has 526 events over 12 months, including five "notice" counselling events every week (`SUMMARY:የምክር አገልግሎት (ሰኞ)` 07:00–11:00Z, etc.) and an all-day "የዲቁና እና የአማርኛ ትምህርት (ቅዳሜ)" every Saturday.
  - **Missing end times:** the Wednesday and Friday events have DTSTART but no DTEND.
  - **Filseta:** it is one all-day event on Nehase 1 titled "Fast of Filseta (Nehase 1–16)", not a 16-day span.
- **Why it matters:** subscribers get a weekday block every morning and an all-day block every Saturday, so they are likely to unsubscribe.
- **Suggested fix:** leave notice events out of iCal, give the fast an end date, and confirm the times (REVIEW-PLAN (c)10).

### F-20: Heading level skip on `/sacraments`
- **Severity:** low
- **Where:** `/am/sacraments`, `/en/sacraments`.
- **Evidence:** the headings in `<main>` go h1 → h3 (sacrament cards with no h2). All other crawled pages have exactly one h1 and no skips.
- **Suggested fix:** add an h2 above the cards, or render card titles as h2.

### F-21: English draft: points for the native reviewer
- **Severity:** low
- **Where:** `docs/content/church-content-2026-11-13.en.md`; `/en/worship/weekly-service`, `/en/our-church`, `/en/our-church/history`.
- **Evidence:**
  - **"Sabbath" for Sunday:** "a) Every Sunday (the Sabbath)" and "the weekly Sabbaths". English readers take "Sabbath" as Saturday, and EOTC distinguishes ቀዳሚት ሰንበት from ሰንበተ ክርስቲያን.
  - **Rågsved:** "ሮግስ ቤድ ሴንት ሩም" (Rågsved centrum) is shortened to "at the place called Rågsved".
  - **About closing, ambiguous parse:** "በሁለት መደበኛ ካህናት፣ መል አከ ሕይወት ቀሲስ ጌጡን ጨምሮ በሦስት ቀሳውስት…" is rendered as Melake Hiwot Kesis Getu being among the *volunteer* priests. It could equally attach to the regular priests. Factual, and about a named person.
  - **History dates:**
    - "ጥቅምት 20 ቀን 1989" (an Ethiopian month name with "European calendar") is translated as "20 October 1989".
    - The next paragraph says the tabot stayed five months and moved "in April of the same year", which is chronologically impossible. The same inconsistency exists in the Amharic.
- **Why it matters:** the committee may approve wrong facts in English.
- **Suggested fix:** list these for the reviewer and the church.

### F-22: Search ranking and cross-language search
- **Severity:** low
- **Where:** `/am/search?q=ጥምቀት`, `/en/search?q=ጥምቀት`.
- **Evidence:**
  - The Amharic query returns 6 results. The calendar event "በዓለ ጥምቀት" comes first and the christening teaching "ክርስትና" **last**.
  - On `/en`, the same word gives "Nothing found for 'ጥምቀት'", because the English versions no longer contain Ethiopic.
  - English queries work ("baptism" returns the teaching first).
- **Suggested fix:**
  - Re-run the P3 exit-3 queries in Amharic as well.
  - Consider falling back to an Amharic-text search on `/en` when English finds nothing.

### F-23: The public repository holds personal data and unapproved content
- **Severity:** low
- **Where:**
  - GitHub repository (`gh repo view` → `"visibility":"PUBLIC"`).
  - `docs/content/church-content-2026-11-13.docx`, `docs/DECISIONS.md:405`, `src/seed/wordpress/dev-medhanealem.json:86`.
- **Evidence:**
  - **Word document metadata:** the .docx's `dc:creator` and `cp:lastModifiedBy` hold a private individual's full name.
  - **Developer email:** DECISIONS.md:405 holds the developer's personal Gmail address.
  - **API key in the snapshot:** it contains the old site's Google Maps embed URL with an API key (`key=AIzaSy…`; already public on the old site, but it will trigger secret scanners).
  - **Unapproved text:** the church's not-yet-approved text and the English draft are public before committee sign-off.
- **Why it matters:** these are GDPR data-minimisation and reputational issues, small but avoidable.
- **Suggested fix:**
  - Strip the docx metadata (or keep the .docx out of git).
  - Drop the API key from the snapshot.
  - Decide whether the repository should be private until launch.

### F-24: Committed test credentials and the placeholder approver account
- **Severity:** low
- **Where:**
  - `scripts/e2e-fixtures.ts:174,193` and `tests/e2e/csp.spec.ts:59`.
  - `scripts/lib/dev-approver.ts`; `/api/teachings`.
- **Evidence:**
  - **e2e fixtures:** they create `super_admin` and `clergy_approver`/`office_coordinator` users with literal passwords (e.g. `"E2e-csp-admin-Pa55!"`) in a public repo. They are guarded by `if (!process.env.DATABASE_URI?.includes("_e2e")) throw …`, and MFA is required for these roles. **Not verified** whether these accounts exist in the dev database.
  - **Placeholder approver:** it is an **active** `clergy_approver` (`not-approved-dev-review@example.invalid`, random UUID password). All 4 published teachings show `"approvedBy":10` in the public API (id only; the user is not populated, since Users read is denied).
- **Why it matters:** the e2e risk is low as long as the guard holds. If the dev database is ever copied to staging or production, the 4 teachings arrive "approved" and published.
- **Suggested fix:**
  - Set the placeholder `active: false` after publishing.
  - Make the production deploy check (or a migration) refuse teachings approved by `*@example.invalid`.

### F-25: Information exposed to anonymous visitors (not private data)
- **Severity:** info
- **Evidence:**
  - **GraphQL introspection:** POST `/api/graphql` `{ __schema { queryType { name } } }` → 200 with the schema.
  - **Access map:** `/api/access` returns the full field-level access map.
  - **Account state:** `/api/users/init` → `{"initialized":true}`.
  - **Admin titles:** anonymous `/admin/*` pages have the title "Payload - Payload" (no admin title suffix). Their content is only a `NEXT_REDIRECT` to `/admin/login`.
- **Suggested fix:** consider `graphQL.disableIntrospectionInProduction` (or disabling GraphQL if it is unused), and set `admin.meta.titleSuffix`.

### F-26: Documentation and cut-over items not yet in place
- **Severity:** info
- **Evidence:**
  - **CONTENT-CHECKLIST.md is stale** relative to D-045/D-046, as REVIEW-PLAN (b) lists.
  - **No redirect map:** spec §7's 301 map `src/lib/redirects.ts` does not exist (`No such file`). The old WordPress Amharic slugs (e.g. `/ሰንበት-ት-ቤት/`, `/ታሪክ/`) will 404 after cut-over.
  - **Sentry:** not installed (documented as skipped in the Phase 0 exit report).
- **Why it matters:** none of these is due yet, but they must not be forgotten before DNS cut-over.

---

## Checked and found OK
- **Church text is verbatim:**
  - All 13 Amharic blocks (89+ paragraphs) appear on their mapped pages, complete and in order.
  - No stray `**`/`##`, no mojibake and no U+FFFD.
  - The unusual characters (᎖ U+1396, ‚ U+201A, `<< >>`) are present in the source .docx itself (18 and 8 occurrences).
  - The same holds for all 13 English blocks against `.en.md`.
- **English pages:** 0 Ethiopic characters inside `<main>` on all 44 crawled `/en` pages. Fallback text on `/sv` is marked `lang="am"`.
- **Ethiopian date conversions** (hand-checked):
  - Hidar 9 = 18 Nov 2026; Tir 11 = 19 Jan 2027; Megabit 27 = 5 Apr 2027; Ginbot 1 = 9 May 2027.
  - Sene 12 = 19 Jun 2027; Nehase 1 = 7 Aug 2027.
  - Meskerem 1 = 12 Sep 2027, Meskerem 17 = 28 Sep 2027 (Pagume 6 in 2019 E.C. handled).
  - Monthly 12/21/27 dates are correct.
- **DST in iCal:** Kidase is 07:00–10:30Z in winter and 06:00–09:30Z from 28 Mar 2027 (the last Sunday of March). Wed/Fri 18:00 = 17:00Z in winter. JSON-LD `2026-11-18T18:00:00+01:00`.
- **iCal format:** CRLF line endings, lines ≤ 75 octets, all-day events as `VALUE=DATE`, and `X-WR-TIMEZONE`.
- **Routes:** every route matches REVIEW-PLAN's 200/404 table. All 44 in-content links (cards, "In this section", calendar) return 200. All 44 sitemap URLs return 200.
- **Private data:**
  - `/api/users`, `/api/baptism-requests`, `/api/inquiries`, `/api/case-events`, `/api/payload-preferences` and versions all return 403.
  - The GraphQL queries for BaptismRequests, Inquiries and Users are Forbidden.
  - `?draft=true` returns published documents only.
  - `/api/media` lists only the 2 images that have permission. Unpermitted photo files and their resized variants (`/api/media/file/wp-147-…jpg`, `-400x267`, `-800x533`, `-1200x630`) and `/_next/image` all return 403.
  - The local object storage is not reachable from the LAN.
  - MFA is enforced inside the access helpers (`src/access/index.ts:14`), not only in the UI. Export and erase require `super_admin`.
- **Site settings:** the public read omits the notification emails and retention periods (also covered by an integration test).
- **Secrets:**
  - No value from the local `.env` (15 secrets checked) appears in the served HTML or in 28 client JS chunks.
  - `.env` is git-ignored.
  - Local secrets are not the example placeholders.
- **Headers:**
  - Nonce CSP with `strict-dynamic`, `object-src 'none'`, `frame-ancestors 'self'` (`'unsafe-eval'` only in dev).
  - `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `nosniff` and Permissions-Policy.
  - HSTS is set in the Caddyfile.
  - API CSP `default-src 'none'; sandbox`.
  - No `Set-Cookie` on public pages.
- **No third-party requests on load:** the only external URLs in the HTML are links. Turnstile loads only after the visitor interacts with the form.
- **Form accessibility:** every visible field has a `<label for>`. `autoComplete` is set for name, email and tel. The volunteer interests are a fieldset with a legend. The honeypot is `aria-hidden`, off-screen and `tabindex=-1`.
- **Spam protection:** the server-side honeypot, zod validation, rate limit and Turnstile run in that order, and Turnstile fails closed in production without a key.
- **Page language:** `<html lang>` is correct for am, en and sv, and the skip link is present.
- **Contrast:** the palette tokens pass (muted on cream 4.85:1). Gold is not used for text.
- **Admin import map:** it contains every admin component referenced in the config, collections and access (12 paths).
