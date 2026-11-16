# Content Checklist

## Still needed from the church (updated 2026-11-16, after the completeness review)

The site is code-complete for Phases 0–3. Everything below needs a person at the church: a name, a fact, a text, an approval or a permission. This list is current: it includes the review's points (REVIEW-DECISIONS.md, "For the church"). The detailed tables further down record the history item by item; where they disagree with this list, this list is right.

**What is on the site now**
- **The church's own text** (Word document, 2026-11-13; D-045), word for word in Amharic, with an English draft translation (D-046), on these pages:
  - `/our-church` (About)
  - `/our-church/history`
  - `/our-faith` ("ቤተ ክርስቲያን ማለት ምን ማለት ነው?")
  - `/sacraments`, with the christening, marriage and fitihat teachings
  - `/our-faith/offerings` (መባዕ), also listed on `/support`
  - `/worship`, and the weekly service, monthly feasts and annual feasts explanation pages
- **From the old site** (D-040): the Sunday School introduction, the event list (Sunday Kidase, feasts) and one video.
- **Galleries:** 22 photos and the Sunday School chart, in four unpublished galleries.
- **Pages not shown at all yet**, because they have no content (hidden, no dead links):
  - News, Privacy policy, Cookies
  - Clergy, Leadership, Diocese
  - the six Sunday School department pages
  - Livestream, the baptism request form

**People to name** (spec §10 #6)
1. **Office Coordinator** and **Clergy Approver**: they get admin accounts, enrol two-factor sign-in, do the 30-minute walkthrough (RUNBOOK → Baptism requests) and sign off (Phase 2 exit item 7).
2. **Swedish reviewer** (Phase 3 exit item 1), a **native Amharic reviewer** for the interface text, and a reviewer for the **English draft translation**.

**Approvals**
3. **Clergy approval of the four teachings** (ክርስትና, ጋብቻ, ፍትሐት, መባዕ), Amharic and English together.
   - On the development site they show with a placeholder approver ("NOT APPROVED – development review", deactivated after publishing).
   - In production a clergy approver reads and publishes each one.
4. **Committee review of the church-text pages** listed above, including:
   - **The page split** (mapping table at the top of `docs/content/church-content-2026-11-13.md`):
     - the About page = opening + closing paragraphs; the "What is a church?" explanation is on `/our-faith`, linked from `/our-church`
     - the rites list ሀ–መ = `/sacraments`
     - item ሠ = `/worship`
     The split leaves `/sacraments` ending in "መ‚ ፍትሐት ሲሆኑ፦" and `/worship` starting with "ሠ‚". Keep, or adjust the text? (review F-08)
   - **The weekly-service headings:** each item's opening words are shown as a heading.
   - **The section title "ምሥጢራት" (Sacraments)** for a list that includes መባዕ and ፍትሐት, which are rites rather than sacraments. The clergy's wording? E.g. "ሥርዓተ ቤተ ክርስቲያን" (review F-07).
5. **The Word document dates from 2021.** Confirm or update each time-sensitive statement (review F-11):
   - "only the building permit is awaited"
   - the building-fund appeal (1,000 autogiro members)
   - "two regular priests (incl. Melake Hiwot Kesis Getu), three priests, five deacons"
   - "teaching a third diaconate group"
   - the Amharic class at Rågsved centrum
   - counselling Mon–Fri 8–12
   - and in the history: the tabot "stayed five months and moved in April of the same year" after arriving 20 Tikimt 1989, which does not add up (review F-21)
6. **Canonical names** (spec §10 #1, review F-13):
   - The church's name in Amharic and English: the header, the About heading and the history title use three different forms.
   - **The diocese:** the footer says "Nordic & Greece Diocese / የኖርዲክና የግሪክ ሀገረ ስብከት", while the church's text says "የስዊድን እና እስካንዲናቪያን አህጉረ ስብከት (Diocese of Sweden and Scandinavia)".
7. **Privacy:**
   - **Privacy policy** (`/privacy`), **Cookies** page (`/cookies`) and **privacy notice for baptism requests** (`privacy-baptism`), am/en, approved by the committee.
   - **Legal review** closed or explicitly deferred (Phase 2 exit item 5).
   - **In production the inquiry forms appear only once `/privacy` is published** (review F-03). The Sunday School form's consent now also covers the child's name and age; please check that wording.
8. **Retention periods:** baptism requests 24 months, inquiries 12 months are defaults; legal review to confirm (Site settings → Requests & privacy).
9. **English draft translation:** review `docs/content/church-content-2026-11-13.en.md` (edit there, then `pnpm content:import`). Points to check (review F-21):
   - "Sunday" for ሰንበት (corrected from "Sabbath")
   - who the sentence about Melake Hiwot Kesis Getu refers to (regular or volunteer priests)
   - names, titles and scripture wording

**Facts for the office**
10. **Service times:**
    - Confirm Sunday Kidase 08:00–11:30 and the Wednesday/Friday prayer from 18:00 — **what is the end time?** (review F-19).
    - Saturday deacon and Amharic school: what time? It is imported as all-day.
    - Monday–Friday counselling "ከጠዋት 8–12": shown as 08:00–12:00 Swedish time; is that right?
    - Kidase times for the monthly (12th, 21st, 27th) and annual feasts, which are now all-day.
11. **Feasts and fasts of the coming church year** (review F-05). Also: is Siklet (Good Friday) right under "Feasts"? (review V-07)
    - Tsome Nebiyat, Genna, Abiy Tsom, Hosanna, Siklet, Fasika and Erget were entered as all-day events, computed from the Ethiopian calendar.
    - **Please confirm the dates and add times**, then enter them each year: Genna and the movable feasts change yearly.
12. **Office email and phone**: the old site listed a phone number and a Gmail address; which are the office's?
    - **Office notification emails**: who gets form messages? Without one, messages wait in the admin unnoticed, and the admin dashboard now warns about it (review F-09).
    - Also the map pin, public transport directions and default event location.
13. **Livestream link** (Site settings), then **test the livestream page live on a Sunday** (Phase 3 exit item 2).
14. **Social links**, e.g. the YouTube channel @Dekikebetu27 the old site linked, if it is the church's.
15. **Postgiro numbers** from the old contact page (membership 4980549-2, building 6195429-3): show them on `/support` or not? Giving is Phase 4 (only if approved).
16. **Baptism requests:** when may "Requests open" be turned on? Until then the "Request Baptism" header button is hidden, and the baptism page says requests aren't open yet and links to the office contact (review F-01).
17. **Sunday School:** is the April 2024 "two-year strategic plan" on `/sunday-school` still current (review F-06)?

**Photos**
18. **Permission to publish** for the 22 imported photos and the Sunday School chart.
    - For the Sunday School and diaconate photos, which show children, record the **parents'/guardians' written permission** first; the site enforces it (D-042).
    - Replace the generic alt texts with real descriptions, then publish the galleries.
19. A sharper **default share image and home hero** (≥ 1600 px wide; the current one is 727 px), and **clergy photos** with permission.

**Text to write**
20. **Home page:** hero heading and subheading (the page now shows the church's name as its heading), buttons, about teaser, Sunday School teaser, and short descriptions for search results (review F-16).
21. **Clergy profiles** (names, Amharic bios, photos), **Leadership** and **Diocese** pages.
22. **Our Faith teachings:** mysteries, sacraments, fasting, prayers, questions & answers.
23. **Sunday School departments:** a summary for each.
24. **News:** at least one post. The "News & Media" menu item is hidden until then; or should it point to Media instead (review F-02)?
25. **Swedish:** translate the core pages, then turn on "Show Swedish in the language switcher" (possible from 80 % translated; today 0 %).
26. **Review the interface text** in Amharic and Swedish. New since the last review:
    - search, error pages, media filters, "In this section", the Amharic two-factor sign-in screens (`src/i18n/mfa-am.ts`)
    - the worship list titles ("Weekly service times", "Monthly feast dates", "Annual feast and fast dates")
    - the baptism "requests not open" notice
    - the Sunday School consent
    - the sign-in alert email

**Decisions**
27. **Analytics:** switch on cookieless Plausible or not (off now; D-044). If yes, mention it in the privacy policy.
28. **Hosting and staging:** needed for every open "staging" item and for launch.
29. **Repository visibility:** the code repository on GitHub is public. Should it be private until launch (review F-23)? Biruk decides.

> **Open items carried from Phase 1:** the WordPress import is done (D-040), and the church's own text has replaced most of it (D-045). The committee content review is item 4 above (sign-off table at the end).

What the church needs to write, translate, photograph or decide before launch (spec Phase 1 task 11).
Every row says **where in the admin** it is done. The site never shows placeholder text: anything
missing is simply hidden, and a page without content answers "page not found".

- **Status:** Not started · Draft · Translated · Approved · Published
- **Am / En:** status of the Amharic and English text. Amharic is the default language: English and
  Swedish fall back to it when a translation is missing. Swedish waits for the Phase 3 reviewer.
- **Owner:** who writes it. The Office Coordinator and Clergy Approver are still to be named (spec
  §10 #6); until then the owner is "Committee".

## Links hidden until their page has content

Menu, header and footer links to a page without content are hidden automatically (review F-02), so none leads to "page not found". They appear once the page is published:

| Link | Page | Needs | Owner |
|---|---|---|---|
| News & Media (menu) | `/news` | at least one published news post (or point the item at `/media`) | Communications |
| Request Baptism (header button) | `/sacraments/baptism/request` | "Requests open" on (Settings → Baptism page) and the baptism privacy notice | Office |
| Privacy policy (footer) | `/privacy` | CMS page, section "Other", slug `privacy` | Committee + legal review |
| Cookies (footer) | `/cookies` | CMS page, section "Other", slug `cookies` | Committee |

## Site interface text (menus, buttons, footer, 404, forms)

| File | Status | Reviewer | Sign-off |
|---|---|---|---|
| `src/messages/en.json` | Draft | Biruk | |
| `src/messages/am.json` | Draft: needs native Amharic review (DECISIONS Q-004; new strings listed in D-016, D-018–D-022) | Biruk | |
| `src/messages/sv.json` | Draft: needs Swedish review (Phase 3) | Phase 3 Swedish reviewer (TBD) | |
| `src/messages/errors.json` (error pages), `src/i18n/mfa-am.ts` (Amharic two-factor screens) | Draft (D-044) | Amharic / Swedish reviewers | |
| Menu and footer labels | Seeded (am/en/sv) — **Settings → Navigation / Footer** | Biruk | |

## Site settings (Settings → Site settings)

| Item | Status | Owner | Notes |
|---|---|---|---|
| Church name (am/en), short name | Seeded | Committee | Approved names per spec §10 #1 |
| Logo | Imported (512 × 512 from the old site) | Communications | Replace if a better original exists |
| Default share image | Imported, **only 727 × 297 px** | Communications | Upload a landscape church photo ≥ 1200 px wide (D-023) |
| Address | Seeded (Pålsbodagränd 3, Bandhagen) | Office | |
| **Map pin** (latitude / longitude) | Not started | Office | Needed for the map on /visit (D-021) |
| Map link | Optional | Office | Otherwise an OpenStreetMap link is used |
| Public transport directions (am/en) | Not started | Office | Shown on home and /visit |
| Default event location (am/en) | Not started | Office | Used when an event has no location |
| Office email, office phone | Not started | Office | Office numbers only, never personal ones. The old contact page listed a phone number and a Gmail address: confirm which are the office's |
| **Office notification emails** | Not started | Office | Who is emailed about contact messages (D-022) |
| Social links | Not started | Communications | |
| Livestream link | Not started | Media | /worship/livestream appears once set. YouTube, Vimeo or Facebook video link plays in the page after Play; a channel/page live tab opens as a link (D-042). Test live on a Sunday |
| Show Swedish in the language switcher | Off | Committee | Can be turned on once 80 % of pages and teachings have Swedish text (today 0 %; see "Missing translations"), after the Swedish review |

## Home (Settings → Home page)

| Item | Am | En | Owner | Notes |
|---|---|---|---|---|
| Hero image | Imported (church photo, low resolution) | — | Communications | A sharper photo ≥ 1600 px wide is better |
| Hero heading and subheading | Not started | Not started | Committee | Without a heading the page shows "Welcome"; the subheading is also the search description |
| Hero buttons (up to 2) | Not started | Not started | Committee | |
| Section order | Default | — | Committee | Remove a row to hide a section |
| Featured events (holy days) | Optional | — | Office | Otherwise annual feasts and fasts are shown |
| About teaser (heading, text, image, link) | Not started | Not started | Committee | WP (About page) |
| Sunday School teaser (heading, text, image) | Not started | Not started | Sunday School | |

## Our Church (Content → Pages, section "Our Church"; Content → Clergy)

| Page / item | Address | Am | En | Owner | Notes |
|---|---|---|---|---|---|
| Landing page | `/our-church` | Imported (old "About", incl. "What is a church?") | Not started | Committee | Review |
| History | `/our-church/history` | Imported | Not started | Committee | Check facts and dates; the text ends with a building-fund appeal (still current?) |
| Leadership | `/our-church/leadership` | Not started | Not started | Committee | |
| Diocese | `/our-church/diocese` | Not started | Not started | Committee | Link to eotc-nordics.org |
| Clergy profiles | `/our-church/clergy` | Not started | Not started | Clergy | Each needs a photo **with permission** and an Amharic bio before it can be published (D-013) |

## Our Faith (Content → Teachings; publishing needs clergy approval)

| Item | Am | En | Owner | Notes |
|---|---|---|---|---|
| Intro page (optional) | Not started | Not started | Clergy | Page, section "Our Faith", slug `index` |
| The five mysteries | Not started | Not started | Clergy | |
| The seven sacraments | Not started | Not started | Clergy | |
| Fasting | Not started | Not started | Clergy | |
| Prayers | Not started | Not started | Clergy | |
| Questions & answers | Not started | Not started | Clergy | |

## Worship & Calendar (Content → Events; Pages, section "Worship")

| Item | Am | En | Owner | Notes |
|---|---|---|---|---|
| Landing page `/worship` | Church text (item ሠ; D-045) | EN draft (D-046) | Committee | Lists the worship pages below it automatically |
| Explanations: weekly service, monthly feasts, annual feasts | Church text (`/worship/weekly-service`, `/monthly-feast-days`, `/annual-feast-days`) | EN draft | Committee | Mentions the Amharic class at Rågsved centrum and counselling Mon–Fri 8–12: still current? (item 5) |
| Weekly services | Sunday Kidase 08:00–11:30; Wednesday and Friday prayer from 18:00 (end time unknown); Saturday deacon and Amharic school (all-day); counselling Mon–Fri 08:00–12:00 (calendar only) | EN titles (draft) | Office | **Confirm times and the Wed/Fri end time** (item 10) |
| Monthly feasts (Michael 12th, Mary 21st, Medhanealem 27th) | Imported, all-day | EN titles (draft) | Office | **Add Kidase times**; the church's text says a sermon follows only a morning Kidase outside fasts |
| Annual feasts | 10 fixed-date feasts (yearly, all-day) + the coming year's Genna, Hosanna, Siklet, Fasika, Erget (computed by `pnpm events:church-year`, D-047) | EN titles (draft) | Office | **Confirm the computed dates, add times, and re-run each year.** Is Siklet (Good Friday) right under "Feasts"? It is typed as a feast for now (review V-07) |
| Fasts | Filseta (Nehase 1–16, yearly) + the coming year's Tsome Nebiyat and Abiy Tsom (computed) | EN titles (draft) | Office | All-day, start and end date; no place shown |
| Single-date changes (cancelled / moved Sundays) | As needed | As needed | Office | "Changes to single dates" on the event |

## Sunday School (Content → Departments; Pages, section "Sunday School")

| Item | Am | En | Owner | Notes |
|---|---|---|---|---|
| Intro page (optional) | Imported (aims of the Sunday School + structure chart) | Not started | Sunday School | The chart shows once **Permission to publish** is ticked on it |
| ትምህርት (education) | Name only | Name only | Sunday School | A department page appears once it has a summary or text **in Amharic** (D-020). The old site's six department pages were empty: nothing to import |
| ህጻናት (children) | Name only | Name only | Sunday School | |
| መዝሙር (mezmur) | Name only | Name only | Sunday School | |
| አይቲ (IT) | Name only | Name only | Sunday School | |
| ንብረት (property) | Name only | Name only | Sunday School | |
| ግንኙነት (communications) | Name only | Name only | Sunday School | |

## Sacraments & Requests (Content → Teachings; clergy approval)

| Item | Am | En | Owner | Notes |
|---|---|---|---|---|
| Baptism (christening) guidance | Imported (ክርስትና) | Not started | Clergy | **Clergy approval needed** (placeholder on the development site) |
| Baptism page: intro and "What to prepare" checklist | Not started | Not started | Clergy | **Settings → Baptism page** (D-028) |
| Baptism page: **Requests open** | Off | — | Office | Turn on when the office is ready to receive requests; shows the button and the form (D-029) |
| Marriage guidance | Imported (ጋብቻ) | Not started | Clergy | **Clergy approval needed**. The marriage inquiry form appears under it (D-033) |
| Fitihat guidance | Imported (ፍትሐት) | Not started | Clergy | **Clergy approval needed**. The fitihat contact form appears under it (D-033) |

## News & Media (Content → Posts, Galleries, Videos; Media)

| Item | Status | Owner | Notes |
|---|---|---|---|
| First news posts | Not started | Communications | Byline is optional and public; the author account is never shown |
| Photo galleries | Not started | Media | Only photos with **Permission to publish** appear |
| Facebook photos for review | Waiting for photos | Biruk / Yonas | Import with `scripts/import-photos.ts` into the unpublished gallery "ፎቶዎች / Photos" (RUNBOOK) |
| Old-site photos | Imported: 22 photos in 4 unpublished galleries (መጋቢት መድኃኔ ዓለም 2016, ሰንበት ት/ቤት, የዲቁና ትምህርት, ፎቶዎች ከቀድሞው ድረ ገጽ) + the Sunday School chart | Media | Alt texts are generic ("… (3)"): describe each photo. Sunday School and diaconate photos are marked **Shows children** |
| Photo permissions review | Not started | Yonas | Tick **Permission to publish** (and check **Shows children**) per photo; then publish the galleries |
| Audio recordings (sermons) | Not started | Media | Upload MP3/M4A under Audio recordings, then add an entry of type Audio in Videos & audio (D-042) |
| Videos (sermons, liturgy, events) | Imported: 1 (ሥርዓተ ቅዳሴ ዘጥቅምት 29/2019) | Media | The old site linked the YouTube channel @Dekikebetu27: add it under Social links if it is the church's |

## Support (Pages, section "Support")

| Item | Am | En | Owner | Notes |
|---|---|---|---|---|
| Landing page `/support` | Imported (old "መባዕ" page) | Not started | Committee | Donations only if approved (spec §10 #8). The old contact page listed Postgiro numbers (membership 4980549-2, building 6195429-3): confirm before showing any |
| Volunteer form `/support/volunteer` | Ready (draft text) | Ready | Committee | Review the list of ways to help (liturgy, choir, Sunday School, kitchen, cleaning, media, events, other) and the intro text (D-033) |

## Visit & Contact (Pages, section "Visit"; Site settings)

| Item | Am | En | Owner | Notes |
|---|---|---|---|---|
| Intro (optional) | Not started | Not started | Office | Page, section "Visit", slug `index` |
| Address, map pin, directions, office contact | See Site settings | | Office | |
| Contact form | Ready | Ready | — | Needs the office notification emails and, in production, the Turnstile keys (RUNBOOK) |

## Legal (Pages, section "Other")

| Item | Am | En | Owner | Notes |
|---|---|---|---|---|
| Privacy policy `/privacy` | Not started | Not started | Committee + legal review | Must cover the contact form (name, email, phone, message), processors (hosting, Resend, Cloudflare/Turnstile, storage), retention, rights (D-022). Linked from the form once published |
| Cookies `/cookies` | Not started | Not started | Committee | The site sets no tracking cookies; embeds load only after a click |
| Retention periods | Baptism 24 months, inquiries 12 months (defaults) | — | Committee + legal review | Site settings → Requests & privacy → Retention months (baptism / inquiries). Closed cases are archived (personal data removed) after them (D-035). State both in the privacy notices |
| Privacy notice for baptism requests | Not started | Not started | Committee + legal review | Page, section "Other", slug `privacy-baptism`: shown in the form's last step (D-029). Must cover what the form stores (applicant, candidate incl. date of birth, guardian, notes), why, who sees it (office, clergy), retention (task 8) and rights. Without it the form links to `/privacy` |

## Committee sign-off

| Area | Approved by | Date |
|---|---|---|
| Church names and identity | | |
| Palette (spec §10 #2) | | |
| Amharic interface text | | |
| Privacy policy (legal review) | | |
| Content ready for launch | | |
