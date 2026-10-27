# Decisions Log

## Open questions

## Deferred work (by phase)

### Phase 3 — polish
- **Mark fallback text with its language:** Amharic text shown on an English/Swedish page because the translation is missing should carry `lang="am"` (WCAG 3.1.2). Found in task 9 (D-024).
- **`containsMinors` enforcement** (spec Phase 3 task 3): e.g. require a guardian-permission note before an image showing children can be marked publishable. Phase 1 already keeps every image without "Permission to publish" off the public site (D-009).
- **404 page with the CMS header and footer.** Today the 404 shows only the translated message and a home link (D-007). Requested by Biruk 2026-10-18.
- **Amharic text for the admin MFA screens** (enrol, verify, recovery codes, reset). Today they are English-only (`src/i18n/admin.ts`). Payload admin has no built-in Amharic, so this means adding `am` custom translations and enabling the language for the admin UI; text needs native review. Requested by Biruk 2026-10-18.

## Resolved decisions

### D-029 — Baptism request form (2026-10-27, Phase 2 task 4)
- **`/sacraments/baptism/request`**, three steps: About you (name, email, optional phone, connection to the parish) → Who is to be baptised (name, date of birth, infant/child/adult; parent or guardian with name, relationship and consent unless adult; optional preferred time and notes) → Review (everything entered, a "Change" button per step, the privacy notice and consent). No file uploads.
- **Validation:** one zod schema per step (`src/lib/forms/baptism-schema.ts`), used by the browser on "Next" and by the server for all steps again; the server's errors open the first step that has one. Date of birth: a real day, from 1900, not in the future. An adult's guardian details are dropped even if typed before switching.
- **Protection** as the contact form (D-022): honeypot, Turnstile, **3 requests per hour per IP hash**, saved only through the server action (`overrideAccess`). The stored request keeps the IP hash, browser (user agent, max 300 characters) and time of sending (§2.12 `source`). The applicant's language is the page's language (emails in task 5 use Amharic or English).
- **Open/closed:** the form exists only while **Requests open** is on (Baptism page settings, D-028) and the baptism page exists; otherwise its address is a real 404 (content-gated like D-018). The server also refuses requests when they are closed, for a form left open in a tab.
- **Privacy notice:** the content of the CMS page section Other, slug `privacy-baptism` (unpublished pages aren't shown), plus a link to `/privacy` when published. Both are on the content checklist with legal review.
- **Needs JavaScript (§10 default):** the steps, the guardian section and the review are built in the browser. Without JavaScript the page says so and links to the office (/visit). Keeping a no-JavaScript version of a three-step form would double the work for very few visitors.
- **Accessibility:** a "Step n of 3" heading receives focus on every step change; the error summary receives focus and links to each field (radio groups to their first option); radio groups are fieldsets with a legend; progress list marks the current step with `aria-current`. axe: 0 issues on the form, its error states and the review (desktop and phone).
- **Interface text:** new namespace `baptismForm` (am/en/sv). Amharic and Swedish are drafts for review (Q-004).

### D-028 — Baptism guidance page (2026-10-27, Phase 2 task 3)
- **New global "Baptism page"** (Settings): optional intro, the "What to prepare" checklist (rows shared by all languages, text translated per language; empty rows hidden) and **"Requests open"** (off by default). The guidance itself stays in Teachings (category Christening), and the page still exists only when guidance is published (D-018).
- **Who edits (§10 default; §3 doesn't list this global):** super admins, clergy approvers (they decide the requirements) and office coordinators (they open and pause requests). Translators translate the text in their languages but cannot add, remove or reorder rows or switch requests on/off. Editors cannot change it.
- **The notice** "a request does not confirm a date" is fixed interface text (am/en/sv in `src/messages`), not CMS content, so it can never be missing. Amharic and Swedish wording are drafts for review with the other interface text (Q-004).
- **The "Request a baptism" button** appears only while requests are open, so it never points to a form that is closed — or, until task 4, doesn't exist yet. Task 4 gates the form on the same switch.
- **E2E fix:** the production server also keeps the pages it rendered on demand (ISR) on disk in `.next/server/app/{am,en,sv}`; the e2e prepare step now clears them with the cached data, so an e2e run never sees a page rendered from an earlier database.

### D-027 — Baptism status workflow and audit log (2026-10-27, Phase 2 task 2)
- **Transitions** exactly as the spec (`src/lib/baptism/state.ts`, pure functions; the admin's status buttons in task 6 will use `allowedTransitions`). A save that breaks them is refused with a message ("A request cannot go from … to …", "Only a clergy approver can change a request in clergy_review", "Set the scheduled date before confirming").
- **Who moves a case (§10 default):** out of `clergy_review` only a **clergy approver** — the spec says "clergy_approver only", so a super admin without that role cannot decide either (give them the role if needed). Every other step: **office coordinators and super admins**; clergy approvers only decide. This matches the exit-checklist journey (office → clergy_review, clergy → scheduling, office → confirmed → completed).
- **Extra rules:** a new request always starts as `new`, whatever is sent; `confirmed` needs a scheduled date (the confirmation email gives it, task 5). Server code acting without a user (e.g. jobs) follows the transitions but no role check, and is logged as "system".
- **Audit log entries** (CaseEvents, with staff member and time): status changes (from → to), assignment (from → to, by staff name), clergy decision (new value), scheduled date (Stockholm time), and edits of office notes or clergy notes — **without the note text**, because the log is kept after the retention job removes personal data (task 8). Inquiries log status changes and assignments; any inquiry status may follow any other.
- **Users readable by case handlers:** assigning a case (and an inquiry — this was broken since Phase 1) failed for office staff, because Payload checks the chosen user with the editor's own access and only super admins could read Users. Office coordinators and clergy approvers may now read the accounts of **active staff with privileged roles** (plus their own), nothing more; editing stays super admin/self. The Users menu item is shown to super admins only.
- **Reference numbers in development:** Payload's development schema sync (dev server, tests — never production, which runs migrations) drops the Postgres sequences behind `INQ-`/`BAP-` references, so after a restart a new reference could repeat an existing one and the save would fail. `nextReference` now continues above the highest stored reference when that happens.

### D-026 — Baptism requests and the audit log (2026-10-27, Phase 2 task 1)
- **Collections:** `baptism-requests` (spec §2.12) and `case-events` (§2.13), in the admin group "Requests" next to Inquiries. Read: super_admin, office coordinators, clergy approvers (with MFA, like every privileged rule). Update: the same three for requests; only super_admin for case events. Delete: super_admin only.
- **No API create for anyone, staff included** (§2.12: "create via action only"; same as Inquiries, D-022). §3 lists super_admin as CRUD, but a request is always the applicant's own submission, so the admin never creates one; super_admin keeps update and delete. The website form (task 4) saves through server code with `overrideAccess`. Case events are likewise written only by server code (`logCaseEvent`, `src/lib/cases/events.ts`); a "created" entry (actor: system) is logged with every new request.
- **Who edits what inside a request:** office coordinators and super_admin may correct the applicant, candidate and guardian details (e.g. after "information needed"); clergy may not. The clergy decision and clergy notes are editable only by clergy approvers and super_admin. Reference, privacy consent, source (IP hash, browser, submitted at) and `archivedAt` are never editable through the admin or API. Status changes are not restricted yet: the transitions and role checks come in task 2.
- **Guardian:** name, relationship and consent are required when the candidate is an infant or child (§2.12). Required personal fields are not enforced on archived cases, whose personal data the retention job (task 8) removes.
- **`actor`:** a `actorType` field (staff member / system) plus the user, so an entry made by a staff member who is later deleted is not mistaken for a system entry.
- **Deleting a request** removes the link from its audit entries (the entries stay, without a request). Task 9 ("Erase case") decides what an erasure keeps.
- **Privacy evidence:** integration tests (`tests/integration/baptism-requests.test.ts`) check that the public, editors and translators get 403 or errors, and no personal data, from REST (list, by id, count, create, update, delete) and GraphQL (queries and the create mutation), and that editors, translators and finance get nothing through the local API, which is what server components use. A unit test checks that no code behind the public site queries `baptism-requests`, `case-events` or `inquiries`.

### D-025 — Performance (2026-10-27, Phase 1 task 10)
- **Result (Lighthouse 13.5, default mobile profile, production build, e2e content):** home (am) 91, home (en) 92–93, calendar 90–91, teaching page 91; accessibility 100, best practices 96, SEO 92–100 everywhere (SEO 92 on pages without a description, e.g. a home page without hero subheading). Run with `pnpm lighthouse` against a production server with `SITE_ENV=production` (otherwise the noindex of D-023 lowers SEO on purpose). Before the work: 73–75.
- **Fonts were the main cost** (blocking them gave 98). The four self-hosted variable fonts are now **trimmed** to the weights the site uses (400–700) and, for Ethiopic, the Ethiopic block U+1200–139F: 473 KB → 224 KB (`scripts/fonts/trim-fonts.py`, fonttools — a build tool, not a dependency). The two **Ethiopic fonts are preloaded on Amharic pages only**: they are served from `public/fonts/` (versioned names, `Cache-Control: public, max-age=31536000, immutable`) and declared in `globals.css`, because `next/font` can only preload for every language; English/Swedish pages still never download them unless Ethiopic text appears. This changes D-005 ("nothing preloaded") for Amharic pages.
- **Payload's `Critical-CH` header** (colour scheme hint for its admin) made Chrome load every first public page twice (~0.6 s on a slow connection) and split caches by colour scheme: now limited to `/admin`.
- **Media files** (`/api/media/file/…`): `public, max-age=31536000, immutable` for anonymous requests (they can only get images with publication permission), `private, no-store` for signed-in staff (who may see private images), so Cloudflare can never cache a private image. Requested by Biruk. **If publication permission is later withdrawn**, the image may stay in Cloudflare's and browsers' caches: delete it in the admin and purge its URL in Cloudflare (or upload it again under a new name).
- **Less data per page:** the browser receives only the 7 message namespaces client components use (guarded by a unit test), and the calendar sends its 13 months of dates in a compact form (default location once, optional fields only when set).
- **Note:** real content (a hero photo, longer pages) will move these numbers; re-run `pnpm lighthouse` on staging before launch (Phase 1 exit checklist).

### D-024 — Accessibility pass (2026-10-23, Phase 1 task 9)
- **axe in Playwright** (`tests/e2e/a11y.spec.ts`, WCAG 2.2 A/AA rules) on every page template with the e2e content — home (am/en), CMS page, Our Church, Clergy, Our Faith, teaching, Sacraments, baptism guidance, weekly services, calendar (am/en), Sunday School, department, News, post, Media, gallery, videos, Visit (am/en), 404 — at desktop and phone size, plus the open lightbox, the contact form with errors and the open phone menu. Result: **0 issues of any severity** (the exit checklist asks for 0 serious/critical). Runs in CI with the other e2e tests; a serious or critical issue fails the build.
- **Fixed:** the calendar used `role="grid"` without the row structure that role requires — now a plain table of buttons (keyboard use unchanged), the chosen day marked with `aria-pressed`. And an image without alt text in the page's language was rendered with no `alt` at all. **Changed after Biruk's review:** missing alt text now falls back like other untranslated content — to the Amharic alt, and if Amharic is missing too, to another language's (a Media read hook, public site only; the admin still shows a missing translation as empty so a fallback is never saved into it). Only an image with no alt text in any language is not shown.
- **Already in place (checked):** skip link first in the tab order and moving focus to the content (new test); visible focus ring (cream on dark backgrounds); landmarks (header, navigation, main, footer); every form field labelled, errors linked with `aria-describedby` and summarised; touch targets ≥ 44 px; colour contrast pinned by `tests/unit/design-tokens.test.ts`; reduced motion respected.
- **Known limit, for Phase 3:** when a page has no English/Swedish translation, the Amharic fallback text is not marked `lang="am"` (WCAG 3.1.2). Fixing it needs Payload to tell us which fields fell back.

### D-023 — SEO (2026-10-21, Phase 1 task 8)
- **Only production is indexed.** `robots.txt` lets search engines in only when `SITE_ENV=production` (and keeps them out of `/admin` and `/api/`); otherwise it disallows everything and every page carries `noindex, nofollow`. Read at runtime, so the same image works for staging and production.
- **Swedish stays out of search** until "Show Swedish in the language switcher" is on in Site settings (Q-004: Swedish waits for the Phase 3 review): Swedish pages are `noindex` and not in the sitemap. They still exist (falling back to Amharic) and keep their hreflang alternates.
- **`sitemap.xml`:** every page that exists, in each indexed language, with alternates — built from the same list of available addresses the middleware uses (D-017), plus home, calendar, Visit and (when there is clergy) the Clergy page. Never lists drafts, empty pages or 404s. Generated on request; the data is cached.
- **Titles/descriptions:** every page sets its title (with the site name) and language alternates; CMS pages, teachings, posts, galleries and departments also set a description; the home page uses the hero subheading.
- **Share images:** pages with a picture of their own use it (CMS page share image or hero, post cover, gallery). Otherwise a new **Site settings → Default share image** (migration `site_settings_share_image`). Instead of a generated image: the fonts are self-hosted as WOFF2, which Next's image generator can't read, and spec §5 asks for real church photos. **Please upload one** (landscape church photo with publication permission).
- **JSON-LD:** schema.org `Church` (name, address, map pin, contact, logo, share image, social profiles) on the home and Visit pages; `Event` for the next service and upcoming holy days on the home page and for the next 60 days (up to 50 dates) on the calendar — Stockholm times with offset, cancelled/moved dates marked as such.

### D-022 — Contact form and Inquiries (2026-10-20, Phase 1 task 6)
- **Inquiries collection now** (spec §2.14; it is listed under Phase 2 but task 6 stores contact messages in it): all spec fields, plus `preferredLocale` (the form's language, so the office can reply in it). Reference `INQ-YYYY-NNNN` from a Postgres sequence per year (no duplicates even at the same moment; Phase 2's `BAP-` references use the same helper). Access (§3): super_admin CRUD, office RU (status/assignment only — what the visitor sent can't be edited), clergy R, everyone else nothing; **no API create at all** — only the site's form actions create inquiries. Shown under "Requests" in the admin. CaseEvents (audit log) come with Phase 2.
- **The form (on `/visit`):** server action; zod validation with translated field errors and an error summary that gets focus; entries are kept after an error; works without JavaScript except the spam check. Honeypot field: a filled-in honeypot looks like success to the bot but nothing is stored or sent.
- **Turnstile** loads from Cloudflare only once the visitor starts using the form (no third-party request on page load), invisible unless Cloudflare wants an interaction. The site key is read at runtime (`TURNSTILE_SITE_KEY`, renamed from `NEXT_PUBLIC_…` so the Docker build needn't know it). Without `TURNSTILE_SECRET_KEY` the check is skipped locally but **every message is refused when `SITE_ENV=production`**.
- **Rate limit:** 5 messages per 10 minutes per salted IP hash, in memory (one app container; a restart resets counters; Cloudflare's rate limiting is in front). Only valid sends count, so fixing typos doesn't lock anyone out. Raw IPs are never stored or logged, and the hash isn't stored on the inquiry.
- **Office email:** to Site settings → "Requests & privacy" → office notification emails (else the public office email). It contains only the reference and the admin link — no name, address or message ("no sensitive echo"). If sending fails, the inquiry is still saved and the error logged. No email goes to the visitor: the page shows the reference (an open form that mails arbitrary addresses could be abused). So the Q-001 Reply-To follow-up still waits for the first email to the public (Phase 2 acknowledgements).
- **Email setup:** Resend when `RESEND_API_KEY` is set; otherwise SMTP to Mailpit locally (and in CI, where tests read Mailpit's API to check the office email). Sender name `EMAIL_FROM_NAME`.
- **For the privacy notice (committee/legal):** the form stores name, email, optional phone and message; Cloudflare (Turnstile) and Resend are processors. The checkbox links to `/privacy` once that page is published.
- **For Biruk's review:** the Amharic and Swedish form texts (`contact.*` in the message files).

### D-021 — Visit page and map (2026-10-20, Phase 1 task 5e)
- **`/visit` is a built-in page** (it will hold the contact form, task 6): the optional CMS landing page (section Visit, slug "index") is shown as introduction, then address, "Open in a map", directions, office email/phone and social links from Site settings. Other pages in the Visit section (e.g. `/visit/parking`) are normal CMS pages. The home page's "Visit us" section links to it.
- **Map (spec §4: "static image or consent-loaded embed"):** an OpenStreetMap embed that loads only after the visitor presses "Show map", with a note that OpenStreetMap receives their IP address. It needs the church's coordinates, so Site settings gets an optional **Map pin** (latitude/longitude; migration `site_settings_map_location`). **Not filled in:** I won't guess the church's position — please enter it (right-click the church in OpenStreetMap or Google Maps). Without it the page shows the address and the map link only.
- **"Open in a map":** the Map link from Site settings; if empty, OpenStreetMap at the pin; if no pin either, an OpenStreetMap search for the address.
- **Support:** `/support` is the CMS landing page (as since 5a). `/support/volunteer` stays a 404 until the volunteer form is built on task 6's form setup.

### D-020 — Sunday School, News, Media and the home page links (2026-10-20, Phase 1 task 5d)
- **Sunday School:** `/sunday-school` shows the optional CMS landing page (section Sunday School, slug "index") as introduction, then the departments that have a summary or text, as cards. `/sunday-school/<department>`: name, summary, image, text and leader. A department without text in Amharic (the default language, which the others fall back to) has no page (D-013) — so in a fresh install every department page and `/sunday-school` itself 404 until the church writes something.
- **News:** `/news` lists published posts, newest first (up to 100); `/news/<slug>` shows date, the public byline (never the author account, D-014), cover image and text.
- **Media:** `/media` lists published galleries that have at least one image that may be shown, and links to `/media/videos`. `/media/galleries/<slug>` shows the permitted photos with the lightbox. `/media/videos` groups videos by category, newest first; each loads from YouTube/Vimeo only after Play. If an editor turns off "Load only after the visitor clicks" for a video, its player loads with the page but doesn't start by itself.
- **All of these exist only with content** (middleware list, D-017); unknown or empty ones get the real 404.
- **Home page links (task 4 follow-up):** "All services" → `/worship/weekly`, "Full calendar" → `/worship/calendar`, "See all photos" → the latest gallery's page, and the Sunday School teaser links to `/sunday-school` — each shown only when the page exists. The latest announcement has no link: the spec has no announcements page.
- **For Biruk's review (Amharic):** ሰንበት ትምህርት ቤት, ኃላፊ, ዜና, ሚዲያ, የፎቶ ስብስቦች, ቪዲዮና የድምፅ ቅጂዎች, ድምፅ, ፎቶ/ፎቶዎች, ስብከቶች, ቅዳሴ, ዝግጅቶች, ሁሉም አገልግሎቶች, ሙሉ የቀን መቁጠሪያ, ሁሉንም ፎቶዎች ይመልከቱ.

### D-019 — Worship pages, calendar, livestream and iCal (2026-10-20, Phase 1 task 5c)
- **List pages:** `/worship/weekly` (weekly services), `/worship/monthly-feasts`, `/worship/annual-feasts` (feasts and fasts in two groups). Each service or feast is shown once with its rule ("Every Sunday · 8:00–11:30", "Every Ethiopian month on day 27", "Every year on Tir 11"), place, description, its next date (Gregorian + Ethiopian) and any cancelled, moved or annotated dates in the next 60 days. Each page exists only when there are such events (middleware list, D-017); `/worship` itself is the CMS landing page.
- **Calendar `/worship/calendar`:** always available. Month grid starting Monday with the Gregorian and Ethiopian day in each cell (the Ethiopian month name on its 1st), event titles (dots on phones), the chosen day's events listed below. Keyboard: arrows move by day/week, Home/End to the week's start/end, PageUp/PageDown by month; today is marked. Shows the current month and the next 12; past one-off events of the current month are included. Built without a new dependency.
- **Livestream `/worship/livestream`:** exists only when Site settings has a livestream link. A YouTube/Vimeo *video* link plays in the page after the visitor presses Play (privacy-enhanced player, §10 #9); other addresses (e.g. a channel's live page, which can't be embedded by link) open as a plain link. The next service is shown below.
- **iCal `/api/ical?lang=am|en|sv`:** the past week and the coming year, one VEVENT per date (Ethiopian monthly/yearly rules can't be expressed as iCalendar RRULEs), times in UTC, all-day events as dates, cancelled dates as `STATUS:CANCELLED`, stable UIDs per date so calendar apps update instead of duplicating. Cached for 1 hour (server and `Cache-Control`), refreshed when events change. Linked from the calendar page.
- **For Biruk's review (Amharic):** ዘወትር {weekday}, በየወሩ በ{day}, በየዓመቱ {date}, ቀጣይ, የሚመጡ ለውጦች, ሳምንታዊ አገልግሎቶች, ወርኃዊ በዓላት, ዓመታዊ በዓላትና አጽዋማት, በዓላት, አጽዋማት, የቀን መቁጠሪያ, ወደ ቀን መቁጠሪያዎ ያክሉ, ቀጥታ ስርጭት, ቀጥታ ስርጭቱን ይክፈቱ, ያለፈው ወር, የሚቀጥለው ወር, ዛሬ, በዚህ ቀን የተያዘ ፕሮግራም የለም, ፕሮግራም/ፕሮግራሞች.

### D-018 — Our Faith, teachings and sacrament pages (2026-10-20, Phase 1 task 5b)
- **Where teachings appear (spec §4):** faith teachings (mysteries, sacraments, fasting, prayers, Q&A) each have a page at `/our-faith/<slug>` and are listed by category on `/our-faith`. Christening, marriage and fitihat teachings are guidance and are shown **in full** on `/sacraments/baptism`, `/sacraments/marriage` and `/sacraments/fitihat` (as spec Phase 2 task 3 describes for baptism; the request forms are added there in Phase 2), oldest first, with an "On this page" list when there are several. `/sacraments` links to the sacrament pages that have guidance.
- **Our Faith introduction:** an optional CMS page in section "Our Faith" with slug "index" is shown at the top of `/our-faith` (title, hero, blocks); without it the title is "Our Faith" from the message files.
- **Pages exist only with content:** `/our-faith`, its teachings, `/sacraments` and the three sacrament pages are in the middleware's list of available addresses (`/api/site/paths`, now pages + teachings) only when published, clergy-approved content exists; otherwise they get the real 404 (D-017). E.g. `/sacraments/marriage` 404s until a marriage teaching is published; a christening teaching is not reachable under `/our-faith`.
- **Links:** links inside rich text may point to teachings too (`/our-faith/<slug>` or `/sacraments/baptism#<slug>`).
- **For Biruk's review (Amharic):** እምነታችን; category names አምስቱ አዕማደ ምሥጢራት, ሰባቱ ምሥጢራተ ቤተ ክርስቲያን, አጽዋማት, ጸሎቶች, ጥያቄና መልስ; ምሥጢራት; ክርስትና (ጥምቀት), ጋብቻ, ፍትሐት; በዚህ ገጽ.

### D-017 — Serving CMS pages, and their 404 (2026-10-20, Phase 1 task 5a) — option 1 chosen by Biruk
- **Problem:** in Next.js 15.4.11 a page that calls `notFound()` sends an empty error page (no `lang`, no text) instead of a server-rendered 404. Reproduced in a bare Next 15.4.11 app; a `[locale]/not-found.tsx`, a nested route group with its own not-found, `force-dynamic`, and turning off streamed metadata (`htmlLimitedBots`) don't help. So a catch-all route can't 404 unknown CMS slugs properly.
- **Solution:** the middleware decides. It keeps the list of published page addresses (from `/api/site/paths`, server-cached and refreshed on save; kept in the middleware's memory for 30 s) and rewrites a published address (`/en/our-church/history`) to the internal route `/[locale]/cms/[section]/[slug]`. Any other address matches no route, so it gets the normal server-rendered 404 with status 404. `/…/cms/…` asked for directly is sent to a 404 too.
- **Consequences:** a newly published page can take up to 30 s to appear; a page unpublished in the last 30 s shows the "not found" text with status 200 until the list refreshes. If the list can't be loaded, every possible page address is tried (the site never breaks), never a built-in one. The middleware reaches the app at `127.0.0.1:$PORT` (override with `INTERNAL_SERVER_URL`).
- **Built-in addresses win** and can't be taken by a CMS page (checked on save): `/our-church/clergy`; everything below `/our-faith` and `/sunday-school` except their landing pages (teachings, departments); `/worship/{weekly, monthly-feasts, annual-feasts, calendar, livestream}`; `/support/volunteer`; top-level `/news`, `/media`, `/sacraments`, `/visit`, `/search`, `/cms` etc.
- **Rendering:** all 8 blocks; empty blocks are hidden (gallery without permitted images, clergy grid without published clergy, event list without upcoming dates). Rich text links to published pages only, in the visitor's language; only http(s)/mailto/tel links outside the site; images only with publication permission; an editor's "Heading 1" becomes h2 (the page title is the h1). The lightbox (native `<dialog>`) and click-to-load video are built in, no new dependencies.
- **Clergy page:** shows the published clergy with full bios; with none published it shows only its title (no placeholder text).
- **Fixed in passing:** `.gitignore` had `media/`, which also ignored `src/components/media` (and Tailwind skips ignored folders). Now `/media/` (the local upload folder in the project root only).

### D-016 — Home page sections (2026-10-19, Phase 1 task 4)
- **Urgent bar on every page, not just the home page:** spec §2.5 says urgent → "top bar", and a cancellation notice must be seen wherever people land. So the bar is part of the layout and is no longer one of the reorderable home sections (migration `homepage_without_announcement_bar` removes the option and any saved row for it). It hides itself after "Hide after", re-checked on every page render.
- **Next service:** the next weekly service, monthly or annual feast that has a start time (all-day entries are skipped), still to come or in progress, within 60 days. Cancelled dates are skipped; a moved date shows at its new time. Location falls back to Site settings' default location; the livestream link to the site's livestream URL.
- **Upcoming holy days (spec: 3–5):** up to 5, each event once at its next date within a year. If editors picked events on the Home page they are used; otherwise featured events plus annual feasts and fasts. Fewer than 3 are still shown (hiding real dates would be worse); none → section hidden. Cancelled dates stay listed, struck through.
- **Latest announcement:** the pinned, else newest, visible announcement that isn't urgent (urgent ones are already in the bar), shown in full.
- **Hidden when empty:** hero without heading or image, teasers without heading or text, gallery without a permitted image, Visit us without address/directions/contact. The page always has one h1: the hero heading, or the welcome line.
- **No links to pages that don't exist yet:** the calendar, announcement list, gallery page and Sunday School pages come in task 5; their "see all" links are added then.
- **Dates:** Gregorian dates use the browser-independent Intl data for each language; the Ethiopian date uses our calendar library with month names in the message files (Amharic: መስከረም … ጳጉሜን, "ቀን … ዓ.ም."). **For Biruk's review:** the new Amharic UI strings (section titles, "ተሰርዟል", "ተዛውሯል", month names).
- **Freshness:** home data is cached 5 minutes like other pages and refreshed at once when an editor saves an event, announcement, gallery, image or the Home page.

### D-015 — Expanding repeating events into dates (2026-10-19, Phase 1 task 3)
- **Local time is kept across summer/winter time:** every repeat starts and ends at the same Stockholm clock time as the first occurrence (Kidase 08:00–11:30 in July and in December), so its UTC time shifts by an hour at the clock changes. Works the same whatever time zone the server runs in.
- **Clock-change edge cases:** a time that doesn't exist (02:00–02:59 on the last Sunday of March) moves one hour later, as clocks do; a time that happens twice (02:00–02:59 on the last Sunday of October) uses the first one.
- **Cancelled dates are kept, marked cancelled**, not dropped, so the calendar can show them struck through with the note (spec §2.4). The "next service" helper and other consumers skip them. Cancelling the whole event marks every date cancelled.
- **Moved dates** appear on their new date (even outside the original week) with a link back to the series date; without a new end they keep the original length. **Notices** keep the date and attach the note.
- **All-day and multi-day events** (e.g. fasts) are returned by date; a fast that began before the requested range still appears in it.
- **Range limit:** at most 800 days per request, so a public URL (e.g. the iCal feed in task 5) can't ask for unlimited work.

### D-014 — Galleries, Videos, News and the Home page (2026-10-19, Phase 1 task 1f)
- **Gallery publish guard (spec §2.9):** a gallery can only be marked published when at least one of its images has "Permission to publish". Images without permission stay in the gallery but are never shown publicly (D-009). No drafts: the `published` checkbox controls visibility.
- **Videos (spec §2.10):** YouTube/Vimeo links only (https), checked on save. "Load only after the visitor clicks" is on by default, so no third-party player loads without consent. Uploading audio/video files is **deferred to Phase 3**: Media accepts images only today.
- **News posts (spec §2.11):** drafts like Pages (editors and super_admin publish; translators save drafts in their own languages). The **author** is the staff account that created the post and is internal only; the public sees an optional per-language **byline** instead, so staff names and emails are never exposed. The **publish date** is set automatically on first publish (Stockholm time) and can be changed by an editor.
- **Home page (spec §2.15):** one global with Hero, Sections and Teasers tabs. The sections list starts with all nine sections in the spec order; editors reorder by dragging and hide one by removing its row. Each section can appear only once (checked on save). Sections without content are hidden on the site (task 4).
- **Optional links:** `linkField` takes `{ required: false }` for links that may be left empty (the home "About" teaser and the footer diocese link); an empty optional link is simply not shown. Menu links stay required.

### D-013 — Clergy and Departments (2026-10-19, Phase 1 task 1e)
- **Clergy publish guard (spec §2.6):** a profile can only be published with a photo that has "Permission to publish" and a bio in Amharic (the default language). Enforced on the server; so the public page never shows placeholder photos or empty bios. No drafts: the `published` checkbox controls visibility.
- **Clergy titles** (ቀሲስ, መልአከ ሰላም, ዲያቆን …) are free per-language text written by the church, not a fixed list, so no ecclesiastical title is translated or invented by us.
- **Access (spec §3):** clergy and super_admin manage profiles including delete; editors create/edit but cannot delete; office reads; translators edit name/title/bio in their own languages but cannot publish or change the photo/order.
- **Departments (spec §2.7):** name, slug (`/sunday-school/<slug>`), summary, body, optional leader, image, order. Managed like Pages (editors/super_admin). `pnpm seed:base` now also creates the six departments if missing — names only, Amharic as on dev.medhanealem.se (ትምህርት, ህጻናት, መዝሙር, አይቲ, ንብረት, ግንኙነት ክፍል); English/Swedish names are drafts for review. A department page appears once it has a summary or text (task 5).

### D-012 — Events, Ethiopian calendar and per-date changes (2026-10-19, Phase 1 task 1d)
- **Ethiopian calendar (spec task 2, moved forward by Biruk):** `src/lib/ethiopian-calendar.ts` converts via Julian Day Numbers. Leap rule: Ethiopian year Y is leap when Y % 4 = 3 (Pagume has 6 days), so Enkutatash falls on 12 Sep before a Gregorian leap year. Fasika uses the Alexandrian (Julian) computus (+13 days, valid 1900–2099). Tested against Enkutatash, Meskel, Genna, Timket and Fasika 2026–2030 and a round trip over every day 1900–2099.
- **Genna note:** in years after Pagume 6, Tahsas 29 falls on 8 Jan and Genna is kept on Tahsas 28 (7 Jan). Enter Genna as a yearly event on the date the church keeps; the calendar doesn't decide liturgical practice.
- **Times:** every date field is entered in Europe/Stockholm (zone locked in the admin) and stored as UTC with its zone. Ethiopian dates are computed from the Stockholm calendar date (`ethiopianDate`, read-only, not stored).
- **Recurrence (spec §2.4):** none / weekly (same weekday) / monthly on an Ethiopian day (e.g. 27th, Medhanealem) / yearly on an Ethiopian month + day. The day/month default to the start date's and are saved explicitly. Pagume is included in monthly rules only when it has that day. Movable feasts (Fasika etc.) are separate events each year. Optional "repeat until".
- **Per-date changes (Biruk's addition):** a list of single dates on the event, each **cancel**, **move** (new start/end) or **notice** (note shown on that date). The series itself is untouched. Each date must be a real occurrence of the series, at most one change per date. `cancelled` still cancels the whole event/series. Expanding series into dates for the calendar, applying these changes, is task 3.
- **Announcements (spec §2.5):** public sees them only between "show from" and "hide after" (cached pages refresh within 5 minutes). Urgent → top bar; pinned → top of list. No drafts (per spec).
- **Access (spec §3):** editors and super_admin manage events/announcements; clergy and office read; translators edit text (title, description, location, notes) in their own languages but not times, rules or date changes; the public reads all events.

### D-011 — Teachings: clergy approval (2026-10-19, Phase 1 task 1c)
- **Rule (spec §2.3):** nothing in Teachings is published without an approver, who must be an active clergy_approver. Enforced on the server in a `beforeChange` hook (so it also covers the API, scripts and imports).
- **How approval happens:** a clergy member who publishes is recorded as the approver automatically (`approvedBy`, `approvedAt`). A clergy member can also approve a draft without publishing it, so a super_admin can publish later. Only clergy can set the approver; in the admin they can pick only themselves.
- **Edits withdraw approval:** if anyone other than clergy changes the title or text, that new draft loses its approval and must be re-approved; the live, approved version stays online meanwhile. Edits by clergy keep the existing approval.
- **Who publishes (spec §3):** super_admin and clergy_approver only. Editors create and edit (drafts), office reads, translators edit drafts in their own languages and can't change slug or category.
- **Publish button:** hidden in the admin for roles that can't publish (Teachings: editors/translators; Pages: translators). The server rule is the real enforcement.
- **Shared rules:** Pages and Teachings use one helper (`src/access/content.ts`) for read/create/update/delete, translator limits and publish rights, so future content types (News, Events) follow the same pattern.
- **Slug:** one per teaching for all languages (as D-010); the public path (`/our-faith/…`, and `/sacraments/…` for christening, marriage, fitihat) is decided in task 5.

### D-010 — Pages: addresses, drafts and translators (2026-10-19, Phase 1 task 1b) — approved by Biruk
- **One slug per page, not per language (deviation from spec §2.2 "slug unique per locale"):** a page has the same address in every language (`/am/our-church/history`, `/en/our-church/history`). This keeps the language switcher on the same page (it only swaps the language prefix) and keeps hreflang simple. Slugs are lowercase ASCII (`our-history`); titles and content stay fully localized.
- **Address = section + slug:** e.g. section "Our Church" + `history` → `/our-church/history`; slug `index` = the section's landing page (`/our-church`); section "Other" pages are top-level (`/privacy`, `/cookies`) and can't take a name an app route uses (`news`, `media`, `visit`, …). Unique per section (database index + friendly validation message).
- **Drafts:** versions with drafts (50 kept per page). The public only ever sees published versions. Payload skips field validation for drafts so editors can save unfinished work; slug/video rules apply on publish.
- **Translators** (spec §3 "U own locales", proposal §7 "cannot publish"): may edit only the languages in their `translatorLocales`, save drafts only, and can't change slug or section. The fuller translation workflow (missing-translations view, per-locale publish rules) is spec Phase 3 task 1.
- **Page links in menus:** the link field gained "CMS page" (alongside site path and external URL). It follows the page if its slug changes and is hidden while the page is unpublished.
- **Blocks** (spec §2.2): text, two columns, image gallery, call to action, FAQ, clergy grid, event list, video (YouTube/Vimeo only, validated). Clergy grid and event list store their settings now and render once Clergy/Events exist (tasks 1d/1e, rendering in task 5).
- **Not a bug (for future debugging):** in a hidden/minimized browser, Payload's admin leaves groups on edit screens empty because it renders fields only once they scroll into view. Checked in a visible browser: all groups render.

### D-009 — Media and the logo (2026-10-18, Phase 1 task 1a)
- **Publication gate:** the public (site pages, anonymous API, file URLs) only gets images with "Permission to publish" (`permissionObtained`) ticked. Files are served through Payload (`/api/media/file/…`), so the same rule protects direct file links (verified: 403). Staff with media access see everything.
- **Access (spec §3):** super_admin, clergy_approver, office_coordinator and editor can upload/edit/delete; translators read only; finance has no media access.
- **No SVG uploads:** an uploaded SVG would be served from our own domain and could carry scripts. JPEG, PNG, WebP and AVIF only; the logo should be a PNG/WebP.
- **Sizes:** thumbnail 400, card 800, hero 1600 (width; never upscaled) and og 1200×630 (cropped, focal point aware).
- **Logo:** `SiteSettings.logo` (Q-005 deferred item, now done) shows in the header beside the church name; it's decorative there (empty alt) because the name is the link text. Like any image it needs "Permission to publish".
- **CI:** a RustFS service now runs in CI so upload tests use real S3 storage.

### D-008 — Production packaging, migrations and backups (2026-10-18)
- **Image:** multi-stage `Dockerfile`; the `runner` target is Next.js `standalone` (342 MB, non-root user, health check on `/api/health`). A `tools` target (full source) runs one-off commands on the server (`seed:base`, `user:create-super-admin`, `user:reset-mfa`, `payload migrate:status`) because the standalone image has no Payload CLI. `output: "standalone"` is only set in the Docker build (`NEXT_OUTPUT`), so local Windows builds are unaffected.
- **Stack:** `docker-compose.prod.yml` = app + Postgres 16 (not published) + Caddy 2 (automatic HTTPS, HSTS, basic security headers). Media stays in external EU object storage. Hosting choice is still open (spec §10 #3: Hetzner default); the stack runs the same on any Docker host.
- **Migrations:** production never auto-syncs the schema. `src/migrations/` holds versioned migrations (initial one created now) and the app applies them on startup (`prodMigrations`). Every schema change needs `pnpm payload migrate:create`.
- **Backups:** `scripts/backup/backup-db.sh` (pg_dump → GPG AES-256 → SHA-256 → separate off-server bucket, 30-day local retention) and `restore-db.sh` (safe scratch-database drill by default; live restore needs `CONFIRM_LIVE_RESTORE=yes`). Run daily by cron on the server. Tested locally against both the dev and the production stack.
- **New secret:** `BACKUP_PASSPHRASE` (password manager; losing it makes old backups unreadable).

### D-007 — 404 pages and page caching in Next.js 15.4 (2026-10-18)
Found by the production-build check deferred from task 5.
- **Problem 1:** a page calling `notFound()` (our former `[locale]/[...rest]` catch-all) is only rendered in the browser in Next 15.4: the server sends an empty `<html id="__next_error__">` shell with no `lang` and no text.
- **Problem 2:** public pages were not cached at all (`Cache-Control: no-store`); a `[locale]` segment needs `generateStaticParams` (empty list = nothing built ahead) to get ISR.
- **Solution:**
  - `[locale]/layout.tsx` exports an empty `generateStaticParams` → pages are cached for 5 min on first visit (verified: `x-nextjs-cache: HIT`), no database needed at build time.
  - The catch-all and `[locale]/not-found.tsx` are removed. Unknown URLs fall through to the root `app/not-found.tsx`, which Next server-renders. It is a **client component** that takes the language from the URL; a server component there would read the request and make every cached page dynamic (Next renders it into every page's tree).
  - A pass-through `app/layout.tsx` exists only so the root not-found works; the real root layouts are still `[locale]/layout.tsx` and Payload's.
  - The locale middleware now also handles "file-like" paths (e.g. `/wp-login.php` → `/am/wp-login.php` → Amharic 404) instead of letting them 500. Skipped: admin, API, Next internals, and Next's own file routes (favicon, robots.txt, sitemap.xml, manifest, icons). Any file added to `public/` must be added to that skip list.
- **Trade-off:** the 404 page shows the translated message and a home link, but no CMS header/footer.
- **Phase 1 note:** a page that calls `notFound()` (e.g. an unknown CMS slug) will still get the client-rendered shell. CMS pages solve this in the middleware (D-017); re-check this behaviour when upgrading Next.js.

### Q-005 — Globals before layout; logo before Media (2026-10-18) — approved by Biruk
- The three globals (spec §2.15) were defined in task 7; task 8 is the `pnpm seed:base` script.
- `SiteSettings.logo` arrives with Media in Phase 1; until then the header shows the church name as a text wordmark.
- `SiteSettings.swedishPublic` (default off) controls whether Swedish appears in the language switcher.

### D-006 — Base seed content (2026-10-18) — values from Biruk
- **Church name:** am = the title of dev.medhanealem.se (በኢትዮጵያ ኦርቶዶክስ ተዋህዶ የደብረ ሰላም መንበረ ጵጵስና መድኃኔ ዓለም ቤተ ክርስቲያን, verified on the site 2026-10-18); en = spec title (Debre Selam Menbere Papasat Medhanealem Ethiopian Orthodox Tewahedo Church, Stockholm); sv = left empty (falls back to Amharic until the Phase 3 reviewer supplies it). Short name: Stockholm Medhanealem.
- **Address:** Pålsbodagränd 3, 124 75 Bandhagen (as on dev.medhanealem.se). Default event location is the same address.
- **Left empty until the church supplies them:** office email, phone, social links, map link, livestream URL, notification emails, transit notes.
- **Menu:** the nine top-level sections of spec §4 plus the two header buttons; footer has the diocese link (https://eotc-nordics.org/a/) and privacy/cookies links. Several targets are Phase 1/2 pages, so those links 404 until the pages are built.
- **Behaviour:** the seed fills a global only while it is still empty, so it never overwrites edits made in /admin. `SEED_FORCE=1` overwrites deliberately.

### D-005 — Fonts and design tokens (2026-10-18) — approved by Biruk
- **Latin heading font:** spec §5 offers "Fraunces or Source Serif"; we use **Source Serif 4** (calmer, closer to liturgical print). Fraunces can be swapped in by replacing one file.
- **Self-hosting:** woff2 files are copied from the Fontsource npm packages into `src/fonts/` with their OFL licences (see `src/fonts/README.md`). No npm dependency added and no font CDN.
- **Loading:** each font declares its `unicode-range` and nothing is preloaded, so English pages never download the ~200 KB Ethiopic files (verified in the browser). Revisit in the Phase 1 Lighthouse pass if needed.
- **Palette:** spec §5 values as Tailwind tokens (`primary`, `gold`, `cream`, `ink`, `muted`, `error`), still "confirm with committee" (spec §10 #2). Gold is for accents, borders and large text on green only, since it fails contrast as text on cream; a unit test enforces the allowed pairs.

### Q-004 — Language selection on "/" and UI string review (2026-10-18) — approved by Biruk
- **Detection:** off. `/` always redirects to `/am`; visitors switch language explicitly; no locale cookie. Can be turned on later (`localeDetection` in `src/i18n/routing.ts`).
- **Review:** Biruk reviews the Amharic UI strings (`src/messages/am.json`); Swedish (`sv.json`) waits for the Phase 3 reviewer. Tracked in docs/CONTENT-CHECKLIST.md.
- **Location:** UI strings live in `src/messages/{locale}.json` (spec §1.1); CLAUDE.md updated to match.

### Q-003 — Login email for the first super_admin (2026-10-18) — approved by Biruk
- **Decision:** `bukem2t2@gmail.com`. It can be changed in /admin → Users at any time; a church-domain address (e.g. `biruk@medhanealem.se`) may be preferable once mail is set up.

### D-003 — MFA design (2026-10-18) — requirements from Biruk
- **Who:** `super_admin`, `clergy_approver`, `office_coordinator` must pass TOTP every session. Other roles are not forced.
- **Flow:** password login (Payload) → `/admin/mfa`. First time: QR code + manual key, confirm one 6-digit code, then 8 one-time recovery codes are shown once. Later sessions: 6-digit code or a recovery code.
- **Enforcement (defence in depth):** (1) the admin catch-all page redirects every admin route except login/logout/reset/mfa to `/admin/mfa`; (2) every access helper (`src/access`) treats an un-verified privileged user as having no access, so REST, GraphQL and admin server functions return nothing.
- **Session binding:** an HMAC-signed `medhanealem-mfa` cookie (httpOnly, SameSite=Lax) bound to user id + Payload session id, expiring after an absolute 8 h. Logout or reset revokes the session, which invalidates the cookie.
- **Session length:** `tokenExpiration` is 8 h for the whole Users collection (all users are staff; simpler and stricter than per-role).
- **Storage:** TOTP secret AES-256-GCM encrypted; recovery codes stored as HMAC-SHA256 hashes; keys derived from `MFA_ENCRYPTION_KEY` (separate from `PAYLOAD_SECRET`, so rotating that secret at handover doesn't wipe MFA).
- **Abuse limits:** 5 wrong codes → 15 min lock; a TOTP code can't be reused (replay protection); password login also locks after 5 failures.
- **Lost phone:** super_admin uses the **Reset MFA** button on the user's page (signs them out everywhere). Break-glass for the last super_admin: `ADMIN_EMAIL=… pnpm user:reset-mfa` on the server.
- **Admin UI language:** MFA screens are English-only for now (Payload admin custom translations in `src/i18n/admin.ts`); Swedish can be added in Phase 3.

### D-004 — Users `locales` field renamed to `translatorLocales` (2026-10-18)
- Spec §2.1 names the translator field `locales`. With Payload localization enabled, Payload already owns a table called `users_locales`, so a multi-value select named `locales` collides (queries crash). Setting `dbName` didn't help (Payload then omits the table), so the field is `translatorLocales` in API and admin. Same meaning, different name.

### Q-001 — Sender email address (2026-10-18) — approved by Biruk
- **Question:** Which address do outgoing emails (form acknowledgements, office notifications) come from?
- **Decision:** `no-reply@medhanealem.se` (`EMAIL_FROM`). Production needs the domain verified in Resend (DNS records on medhanealem.se).
- **Follow-up when email is wired:** set **Reply-To** to the office address (`SiteSettings.officeEmail`) so replies reach the office, not the no-reply box.

### Q-002 — Local S3 server: RustFS instead of MinIO (2026-10-18) — approved by Biruk
- **Question:** Spec §1.1 names MinIO for local S3. MinIO no longer publishes community images: `minio/minio` and `minio/mc` return "not found" on Docker Hub.
- **Decision:** `rustfs/rustfs:1.0.3` for local dev only (ports 9000 API, 9001 console). Production uses EU object storage (Hetzner/R2). The bucket is created by a one-off `amazon/aws-cli` container.

### D-001 — Next.js pinned to 15.4.x (2026-10-18) — approved by Biruk
- **Question:** The spec says "Next.js 15". The latest 15.x is 15.5.28, but Payload 3.91.0 (`@payloadcms/next`) only supports `>=15.4.11 <15.5.0` or `>=16.3.3` on the Next 15/16 lines.
- **Decision:** Pin `next@15.4.11` (exact) with `react@19.1.0`. Revisit when Payload adds 15.5 support or when we choose to move to Next 16.

### D-002 — pnpm build-script allow-list (2026-10-18)
- pnpm blocks dependency install scripts by default. `pnpm-workspace.yaml` allows only `esbuild`, `sharp` and `unrs-resolver`, which download native binaries needed by Next, Payload and ESLint.
- Explicitly denied: `@parcel/watcher` and `@swc/core` (pulled in by next-intl for its optional message-extraction feature, which we don't use).

## Dependencies added beyond the stack

| Package | Why |
|---|---|
| `sharp` | Required by Payload for image resizing (Media sizes in §2.8). Pinned to 0.34.5 to match Next's copy. |
| `graphql` | Required peer dependency of `payload` and `@payloadcms/next`. |
| `vitest` | Unit/integration test runner named in spec §9; added now so `pnpm test` runs from task 1. |
| `@eslint/eslintrc`, `eslint-config-next` | ESLint flat-config bridge and Next rules from create-next-app. |
| `otplib` | TOTP generation/verification for MFA. Approved by Biruk 2026-10-18. |
| `qrcode`, `@types/qrcode` | Render the otpauth:// URI as a QR code (server-side PNG data URL) on the MFA enrolment screen. |
| `@payloadcms/ui`, `@payloadcms/translations` | Payload's own admin UI kit and translation types, needed for the custom MFA view and reset button. Same version as Payload. |
| `pg`, `@types/pg` (dev) | Integration tests create/drop the `<db>_test` database. Same `pg` version Payload already uses. |
| `@playwright/test` (dev) | E2E smoke tests named in spec §9 (Phase 0 task 9). |
| `zod` | Form validation named in spec (§1.2 `lib/validation (zod)`, Phase 1 task 6). Pinned to 4.6.5 (a month old; 4.6.7 was 8 days old). |
| `@payloadcms/email-resend` | Spec's email provider (Resend) as Payload's email adapter. Same version as Payload. |
| `lighthouse` (dev) | Performance/SEO checks named in spec Phase 1 task 10 ("Lighthouse CI on home, calendar, a teaching page"), run with `pnpm lighthouse`. 13.5.0 (over a month old). |
| `@axe-core/playwright` (dev) | Accessibility checks in the e2e tests, named in spec Phase 1 task 9 ("Run axe in Playwright"). 4.13.0 (two months old). |
| `@payloadcms/email-nodemailer` | SMTP adapter for local development and CI (Mailpit), used only when no Resend key is set. Same version as Payload. |
