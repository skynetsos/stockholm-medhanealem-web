# Content Checklist

## Still needed from the church (2026-11-13, end of Phase 3)

The site is code-complete for Phases 0–3. Everything below needs a person at the church: a name, a
fact, a text, an approval or a permission. Details are in the sections further down.

**People to name** (spec §10 #6)
1. **Office Coordinator** and **Clergy Approver**: they get admin accounts, enrol two-factor sign-in, do the 30-minute walkthrough (RUNBOOK → Baptism requests) and sign off (Phase 2 exit item 7).
2. **Swedish reviewer** (Phase 3 exit item 1) and a **native Amharic reviewer** for the interface text.

**The church's written text (2026-11-14, D-045)** — imported word for word from the Word document; it replaces the old site's text. Corrections: edit `docs/content/church-content-2026-11-13.docx` (or a newer copy), then `pnpm content:convert <file>` and `pnpm content:import`.
- **Check the page split** (mapping table at the top of `docs/content/church-content-2026-11-13.md`): About = opening + closing paragraphs; "ቤተ ክርስቲያን ማለት ምን ማለት ነው?" = Our Faith landing; rites ሀ–መ = Sacraments landing; item ሠ = Worship landing.
- **Check the headings** on the weekly-service page: each item's opening words (ሀ᎖ … ረ᎖) are shown as a heading, with the sentence continuing below.
- **Time to confirm:** Wednesday/Friday ጸሎተ ምህላ እና ትምህርተ ወንጌል from 18:00 (end time?); Saturday deacon and Amharic school (imported as all-day: what time?); Monday–Friday counselling "ከጠዋት 8–12" (imported as 08:00–12:00 European time: is that right?). Also the Saturday afternoon home and hospital visits and confession by appointment (not added as events).
- **Event titles to review:** "የዲቁና እና የአማርኛ ትምህርት (ቅዳሜ)" and "የምክር አገልግሎት (ሰኞ … ዐርብ)" are short labels made from the text's words.

**English versions (2026-11-14, D-046)** — every public page now has English, as a **draft translation for review**:
- Review the English of the church's texts in `docs/content/church-content-2026-11-13.en.md` (edit there, then `pnpm content:import`), especially names, titles, terms and scripture wording. Clergy approve the teachings' English together with the Amharic.
- Review the English event titles (Sunday Kidase, the feasts, Filseta, prayer, school, counselling), the Sunday School introduction and the video title.

**Approvals**
3. **Clergy approval of the four teachings** (ክርስትና, ጋብቻ, ፍትሐት and the new መባዕ, now the church's own text). On the development site they are published with a placeholder approver ("NOT APPROVED – development review"); in production a clergy approver must read and publish each one (D-040).
4. **Committee review of every imported page:** `/our-church`, `/our-church/history`, `/worship`, `/worship/weekly-service`, `/worship/monthly-feast-days`, `/worship/annual-feast-days`, `/sunday-school`, `/support`. Check facts that may be out of date: the building-fund appeal in the history, the Amharic class at Rågsved, pastoral hours Mon–Fri 8–12, the Saturday diaconate class.
5. **Privacy notice for baptism requests** (page `privacy-baptism`) and the **privacy policy** (`/privacy`), am/en, approved by the committee; **legal review** closed or explicitly deferred (Phase 2 exit item 5).
6. **Retention periods:** baptism requests 24 months, inquiries 12 months are defaults; legal review to confirm (Site settings → Requests & privacy).

**Facts for the office**
7. **Service times:** confirm Sunday Kidase 08:00–11:30 and the Wednesday/Friday prayer from 18:00 (end time?). Add Kidase times for the monthly feasts (12th, 21st, 27th) and for the annual feasts, which are imported as all-day. Enter **Genna** and the movable feasts (Hosanna, Siklet, Fasika, Erget) and the fasts (Tsome Nebiyat, Abiy Tsom …) per year.
8. **Office email and phone** (the old site listed a phone number and a Gmail address: which are the office's?), **office notification emails** (who gets form messages), **map pin**, public transport directions, default event location.
9. **Livestream link** (Site settings), then **test the livestream page live on a Sunday** (Phase 3 exit item 2).
10. **Social links**, e.g. the YouTube channel @Dekikebetu27 the old site linked, if it is the church's.
11. **Postgiro numbers** from the old contact page (membership 4980549-2, building 6195429-3): show them on `/support` or not? Giving is Phase 4 (only if approved).

**Photos**
12. **Permission to publish** for the 22 imported photos and the Sunday School chart (four unpublished galleries). For the Sunday School and diaconate photos, which show children, record the **parents'/guardians' written permission** first; the site enforces it (D-042). Replace the generic alt texts with real descriptions. Then publish the galleries.
13. A sharper **default share image and home hero** (≥ 1600 px wide); the church photo from the old site is 727 px.

**Text to write or translate**
14. **English translations** of all imported content: pages, teachings, events and department texts. "Missing translations" in the admin lists what is missing.
15. **Swedish:** translate the core pages, then turn on "Show Swedish in the language switcher" (possible from 80 % translated; today 0 %).
16. **Sunday School departments:** a summary for each (the old site's department pages were empty); a department page appears once it has Amharic text.
17. **Home page:** hero heading, subheading, buttons, about teaser, Sunday School teaser (Settings → Home page).
18. **Review the new interface text** in Amharic and Swedish: search, error pages, media filters, "In this section", the Amharic two-factor sign-in screens (`src/i18n/mfa-am.ts`).
19. **Analytics:** decide whether to switch on cookieless Plausible (off now; D-044). If yes, mention it in the privacy policy.


> **Open items carried from Phase 1** (Phase 1 accepted conditionally by Biruk on 2026-10-27:
> code-complete):
> 1. **Task 7 — WordPress import:** done on 2026-11-13 from the old site's public pages (no WXR
>    export; D-040). Imported rows say **Imported**. On the development site the imported pages and
>    teachings are **published for review only**: the three teachings carry a placeholder approval
>    ("NOT APPROVED – development review"), so **clergy must read and approve each one before
>    production**, and the committee must review every imported page (sign-off table at the end).
> 2. **Committee content review:** every page reviewed and signed off (table at the end of this
>    file), including the privacy policy's legal review.

What the church needs to write, translate, photograph or decide before launch (spec Phase 1 task 11).
Every row says **where in the admin** it is done. The site never shows placeholder text: anything
missing is simply hidden, and a page without content answers "page not found".

- **Status:** Not started · Draft · Translated · Approved · Published
- **Am / En:** status of the Amharic and English text. Amharic is the default language: English and
  Swedish fall back to it when a translation is missing. Swedish waits for the Phase 3 reviewer.
- **Owner:** who writes it. The Office Coordinator and Clergy Approver are still to be named (spec
  §10 #6); until then the owner is "Committee".
- **Imported:** brought over from dev.medhanealem.se by `pnpm import:wordpress` (D-040), Amharic
  only. Needs review; English is not started unless stated.

## Start here: menu links that are 404 today

The main menu, the header buttons and the footer (seeded in Phase 0) already link to these pages.
Until they are published they answer "page not found", so they come first.

| Link | Page | Needs | Owner |
|---|---|---|---|
| Our Church | `/our-church` | ✅ Imported (review) | Committee |
| Our Faith | `/our-faith` | at least one faith teaching (or an intro page) | Clergy |
| Worship & Calendar | `/worship` | ✅ Imported (old "services" page; review) | Committee |
| Sunday School | `/sunday-school` | ✅ Imported intro page (review); departments still need text | Sunday School |
| Sacraments & Requests | `/sacraments` | ✅ Imported teachings (**clergy approval needed**) | Clergy |
| News & Media | `/news` | at least one published news post | Communications |
| Support | `/support` | ✅ Imported (old "መባዕ" page; review) | Committee |
| Service Times (header button) | `/worship/weekly` | ✅ Imported events (Kidase, Wed/Fri prayer) | Office |
| Request Baptism (header button) | `/sacraments/baptism` | ✅ Imported christening teaching (**clergy approval needed**); the form appears when "Requests open" is on | Clergy |
| Privacy policy (footer) | `/privacy` | CMS page, section "Other", slug `privacy` | Committee + legal review |
| Cookies (footer) | `/cookies` | CMS page, section "Other", slug `cookies` | Committee |

Alternatively, remove a link in **Settings → Navigation / Footer** until its page is ready.

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
| Landing page `/worship` | Imported (old "services" page) | Not started | Committee | Lists the worship pages below it automatically |
| Explanations: weekly service, monthly feasts, annual feasts | Imported (`/worship/weekly-service`, `/monthly-feast-days`, `/annual-feast-days`) | Not started | Committee | Mentions an Amharic class at "Rågsved" and pastoral hours (Mon–Fri 8–12): still current? |
| Weekly services (e.g. Sunday Kidase 08:00–11:30) | Imported: Sunday Kidase 08:00–11:30; Wednesday and Friday prayer from 18:00 (end time unknown) | Not started | Office | **Confirm times; add the Saturday diaconate class if it should be listed** |
| Monthly feasts (e.g. Medhanealem on the 27th) | Imported: Michael (12th), Mary (21st), Medhanealem (27th), all-day | Not started | Office | **Add Kidase times**; the old site says a sermon follows only morning Kidase outside fasts |
| Annual feasts (Timket, Meskel, Genna …) | Imported: 10 fixed-date feasts from the old page, all-day | Not started | Office | **Add times. Genna not imported** (Tahsas 29 or 28 depending on the year: enter it per year). Movable feasts (Hosanna, Siklet, Fasika, Erget) are one event per year |
| Fasts (Tsome Nebiyat, Abiy Tsom …) | Imported: Filseta (Nehase 1–16, start day only) | Not started | Office | All-day, start and end date |
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
