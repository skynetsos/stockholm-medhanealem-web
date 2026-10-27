# Content Checklist

What the church needs to write, translate, photograph or decide before launch (spec Phase 1 task 11).
Every row says **where in the admin** it is done. The site never shows placeholder text: anything
missing is simply hidden, and a page without content answers "page not found".

- **Status:** Not started · Draft · Translated · Approved · Published
- **Am / En:** status of the Amharic and English text. Amharic is the default language: English and
  Swedish fall back to it when a translation is missing. Swedish waits for the Phase 3 reviewer.
- **Owner:** who writes it. The Office Coordinator and Clergy Approver are still to be named (spec
  §10 #6); until then the owner is "Committee".
- **WP:** the WordPress import (task 7, waiting for the export of dev.medhanealem.se) can bring a
  first version of this item; it still needs review.

## Start here: menu links that are 404 today

The main menu, the header buttons and the footer (seeded in Phase 0) already link to these pages.
Until they are published they answer "page not found", so they come first.

| Link | Page | Needs | Owner |
|---|---|---|---|
| Our Church | `/our-church` | CMS page, section "Our Church", slug `index` | Committee |
| Our Faith | `/our-faith` | at least one faith teaching (or an intro page) | Clergy |
| Worship & Calendar | `/worship` | CMS page, section "Worship", slug `index` | Committee |
| Sunday School | `/sunday-school` | text (summary) for at least one department, in Amharic | Sunday School |
| Sacraments & Requests | `/sacraments` | a christening, marriage or fitihat teaching | Clergy |
| News & Media | `/news` | at least one published news post | Communications |
| Support | `/support` | CMS page, section "Support", slug `index` | Committee |
| Service Times (header button) | `/worship/weekly` | the weekly services as events | Office |
| Request Baptism (header button) | `/sacraments/baptism` | christening guidance teaching(s); the request form follows in Phase 2 | Clergy |
| Privacy policy (footer) | `/privacy` | CMS page, section "Other", slug `privacy` | Committee + legal review |
| Cookies (footer) | `/cookies` | CMS page, section "Other", slug `cookies` | Committee |

Alternatively, remove a link in **Settings → Navigation / Footer** until its page is ready.

## Site interface text (menus, buttons, footer, 404, forms)

| File | Status | Reviewer | Sign-off |
|---|---|---|---|
| `src/messages/en.json` | Draft | Biruk | |
| `src/messages/am.json` | Draft: needs native Amharic review (DECISIONS Q-004; new strings listed in D-016, D-018–D-022) | Biruk | |
| `src/messages/sv.json` | Draft: needs Swedish review (Phase 3) | Phase 3 Swedish reviewer (TBD) | |
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
| Office email, office phone | Not started | Office | Office numbers only, never personal ones |
| **Office notification emails** | Not started | Office | Who is emailed about contact messages (D-022) |
| Social links | Not started | Communications | |
| Livestream link | Not started | Media | /worship/livestream appears once set |
| Show Swedish in the language switcher | Off | Committee | Turn on after the Phase 3 Swedish review |

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
| Landing page | `/our-church` | Not started | Not started | Committee | WP (About) |
| History | `/our-church/history` | Not started | Not started | Committee | |
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
| Landing page `/worship` | Not started | Not started | Committee | |
| Weekly services (e.g. Sunday Kidase 08:00–11:30) | Not started | Not started | Office | Repeat: every week. **Exit checklist item.** WP (weekly services) |
| Monthly feasts (e.g. Medhanealem on the 27th) | Not started | Not started | Office | Repeat: every Ethiopian month, day 27 |
| Annual feasts (Timket, Meskel, Genna …) | Not started | Not started | Office | Repeat: every Ethiopian year. Movable feasts (Fasika …) are one event per year. WP (feasts) |
| Fasts (Tsome Nebiyat, Abiy Tsom …) | Not started | Not started | Office | All-day, start and end date |
| Single-date changes (cancelled / moved Sundays) | As needed | As needed | Office | "Changes to single dates" on the event |

## Sunday School (Content → Departments; Pages, section "Sunday School")

| Item | Am | En | Owner | Notes |
|---|---|---|---|---|
| Intro page (optional) | Not started | Not started | Sunday School | Page, slug `index` |
| ትምህርት (education) | Name only | Name only | Sunday School | A department page appears once it has a summary or text **in Amharic** (D-020). WP |
| ህጻናት (children) | Name only | Name only | Sunday School | |
| መዝሙር (mezmur) | Name only | Name only | Sunday School | |
| አይቲ (IT) | Name only | Name only | Sunday School | |
| ንብረት (property) | Name only | Name only | Sunday School | |
| ግንኙነት (communications) | Name only | Name only | Sunday School | |

## Sacraments & Requests (Content → Teachings; clergy approval)

| Item | Am | En | Owner | Notes |
|---|---|---|---|---|
| Baptism (christening) guidance | Not started | Not started | Clergy | Category "Christening". WP (ክርስትና). The request form comes in Phase 2 |
| Marriage guidance | Not started | Not started | Clergy | Category "Marriage". WP (ጋብቻ) |
| Fitihat guidance | Not started | Not started | Clergy | Category "Fitihat". WP (ፍትሃት) |

## News & Media (Content → Posts, Galleries, Videos; Media)

| Item | Status | Owner | Notes |
|---|---|---|---|
| First news posts | Not started | Communications | Byline is optional and public; the author account is never shown |
| Photo galleries | Not started | Media | Only photos with **Permission to publish** appear |
| Facebook photos for review | Waiting for photos | Biruk / Yonas | Import with `scripts/import-photos.ts` into the unpublished gallery "ፎቶዎች / Photos" (RUNBOOK) |
| Photo permissions review | Not started | Yonas | Tick **Permission to publish** (and check **Shows children**) per photo |
| Videos (sermons, liturgy, events) | Not started | Media | YouTube/Vimeo links. WP (videos) |

## Support (Pages, section "Support")

| Item | Am | En | Owner | Notes |
|---|---|---|---|---|
| Landing page `/support` | Not started | Not started | Committee | Donations only if approved (spec §10 #8) |
| Volunteer page `/support/volunteer` | — | — | — | Form comes later (built on the task 6 form setup) |

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

## Committee sign-off

| Area | Approved by | Date |
|---|---|---|
| Church names and identity | | |
| Palette (spec §10 #2) | | |
| Amharic interface text | | |
| Privacy policy (legal review) | | |
| Content ready for launch | | |
