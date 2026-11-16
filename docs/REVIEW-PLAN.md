# Review plan: completeness of the public site (2026-11-16)

Written by the planner role (Role 1) of the completeness review. Findings: REVIEW-FINDINGS.md. Verdicts: REVIEW-DECISIONS.md.

**Sources:** spec §4 and §6, `docs/content/church-content-2026-11-13{,.en}.md`, CONTENT-CHECKLIST.md, Phase 1–3 exit reports, DECISIONS D-040 to D-046, and the route code under `src/app/(frontend)/[locale]`, `src/lib/{pages,content-paths,cms-routing,teachings}.ts`.

**How it was checked:**
- **Site:** dev site `http://192.168.10.187:3000`, checked on 2026-11-16 with `curl` (status codes), `/api/site/paths` (the addresses the middleware treats as available) and the public REST API, which returns published items only.
- **English content:** 6 English pages were checked for Ethiopic text inside `<main>`. All 6 had 0 Ethiopic characters and 0 `lang="am"` fallbacks.
- **Git:** working tree clean apart from `.claude/`. Last commit was `1da7812` (D-046).

**Status legend:**
- **built**: works with the data it needs.
- **built but empty (404)**: code exists, but there is no content, so the middleware sends the visitor to the 404.
- **missing**: no code.
- **old-site text**: from the D-040 WordPress import.
- **church text**: from the D-045 Word-document import.
- **+ EN draft**: has the D-046 English draft translation.

## (a) Public routes

| Route (`/{am,en}…`) | Spec ref | /am | /en | Status | Notes |
|---|---|---|---|---|---|
| `/` | §4, P1 t4 | 200 | 200 | built; hero image from the old site | Homepage global has **no hero heading, subheading or CTAs, and no about or Sunday School teaser text**. The hero falls back to "Welcome". Sections hide when empty. `/am/` with a trailing slash gives 308 → `/am`. |
| `/our-church` | §4 | 200 | 200 | church text + EN draft | Page `our-church/index`, `church:about` (about + about-closing). |
| `/our-church/history` | §4 | 200 | 200 | church text + EN draft | `church:history` |
| `/our-church/clergy` | §4 | 200 | 200 | **built, but shows only a heading** | There are 0 published clergy, yet the page answers 200 with only an H1. It is not content-gated, unlike the other sections (D-016 to D-020 hide empty pages). This is a code question; see (d). |
| `/our-church/leadership` | §4 | 404 | 404 | built but empty (404) | CMS page slot (section our-church, slug `leadership`). No content. |
| `/our-church/diocese` | §4 | 404 | 404 | built but empty (404) | CMS page slot. No content. The footer already links eotc-nordics.org. |
| `/our-faith` | §4 | 200 | 200 | church text + EN draft | Landing with intro `church:our-faith` ("What does 'Church' mean?"), plus a list of teachings. |
| `/our-faith/offerings` | §4 (`[slug]`) | 200 | 200 | church text + EN draft | Teaching `church:offerings` (new category "offerings"). |
| `/our-faith/<mysteries, sacraments, fasting, prayers, faq>` | §4 (`[slug]`), §2.3 | 404 | 404 | built but empty (404) | No teachings in these categories (`/our-faith/mysteries` was tested). |
| `/worship` | §4 | 200 | 200 | church text + EN draft | `church:worship` (item ሠ), plus "In this section" links. |
| `/worship/weekly` | §4 | 200 | 200 | built (events) | Events: Sunday Kidase (old site), Wed/Fri prayer and Saturday school (church text, `church:event:*`). All have EN titles. |
| `/worship/monthly-feasts` | §4 | 200 | 200 | built (events) | 3 monthly feasts from the old site, all-day. |
| `/worship/annual-feasts` | §4 | 200 | 200 | built (events) | 10 annual feasts and the Filseta fast from the old site, all-day. No Genna and no movable feasts. |
| `/worship/calendar` | §4 | 200 | 200 | built | Also shows the 5 counselling "notice" events (Mon–Fri, church text). |
| `/worship/livestream` | §4, P3 t4 | 404 | 404 | built but empty (404) | No livestream link in Site settings. |
| `/worship/weekly-service` | added (D-040) | 200 | 200 | church text + EN draft | CMS page `church:weekly-service`. |
| `/worship/monthly-feast-days` | added (D-040) | 200 | 200 | church text + EN draft | `church:monthly-feasts` |
| `/worship/annual-feast-days` | added (D-040) | 200 | 200 | church text + EN draft | `church:annual-feasts` |
| `/sunday-school` | §4 | 200 | 200 | old-site text + EN draft | Intro page has no content key (D-040). The structure chart is hidden until it has publishing permission. |
| `/sunday-school/education` | §4 (`[department]`) | 404 | 404 | built but empty (404) | The department has a name only (no summary or body). |
| `/sunday-school/children` | §4 | 404 | 404 | built but empty (404) | Same |
| `/sunday-school/mezmur` | §4 | 404 | 404 | built but empty (404) | Same |
| `/sunday-school/it` | §4 | 404 | 404 | built but empty (404) | Same |
| `/sunday-school/property` | §4 | 404 | 404 | built but empty (404) | Same |
| `/sunday-school/communications` | §4 | 404 | 404 | built but empty (404) | Same |
| `/sunday-school/join` | added (P2 t7) | 200 | 200 | built (form) | Exists while `/sunday-school` exists. |
| `/sacraments` | §4 | 200 | 200 | church text + EN draft | Site-built landing with intro `church:sacraments` and the sacrament cards (D-045). |
| `/sacraments/baptism` | §4, P2 t3 | 200 | 200 | church text + EN draft | Teaching `church:christening`. The Baptism page settings (intro and "What to prepare") are **not verified** (admin only). |
| `/sacraments/baptism/request` | §4, P2 t4 | 404 | 404 | built but empty (404) | Requests open is off (D-029). The privacy notice `privacy-baptism` is also missing. |
| `/sacraments/marriage` | §4 | 200 | 200 | church text + EN draft | `church:marriage`, plus the marriage inquiry form. |
| `/sacraments/fitihat` | §4 | 200 | 200 | church text + EN draft | `church:fitihat`, plus the fitihat contact form. |
| `/news` | §4 | 404 | 404 | built but empty (404) | 0 posts. **The "News & Media" link in the main menu points here and gives a 404.** |
| `/news/[slug]` | §4 | — | — | built but empty | There are no posts. |
| `/media` | §4 | 200 | 200 | built | Exists because of the video. All galleries are unpublished. |
| `/media/videos` | §4, P3 t3 | 200 | 200 | old-site item + EN draft title | 1 liturgy video. No audio recordings. |
| `/media/galleries/megabit-medhanealem-2016` | §4 | 404 | 404 | built but empty (404) | Unpublished gallery (8 photos, no permission). |
| `/media/galleries/sunday-school-photos` | §4 | 404 | 404 | built but empty (404) | Unpublished gallery (5 photos, shows children). |
| `/media/galleries/diaconate-school-2016` | §4 | 404 | 404 | built but empty (404) | Unpublished gallery (4 photos, shows children). |
| `/media/galleries/old-website-photos` | §4 | 404 | 404 | built but empty (404) | Unpublished gallery (5 photos). |
| `/support` | §4 | 200 | 200 | church text + EN draft | Site-built landing: the offerings teaching and the volunteer form. No CMS intro; the old መባዕ page was unpublished (D-045). |
| `/support/volunteer` | §4, P3 t5 | 200 | 200 | built (form, interface text) | |
| `/visit` | §4 | 200 | 200 | built; settings incomplete | Address is seeded. **Map pin, transit directions, office email and phone, and office notification emails are not set** (per the checklist; not verified in admin). |
| `/privacy` | §4 | 404 | 404 | built but empty (404) | **Linked from the footer.** No CMS page yet. |
| `/cookies` | §4 | 404 | 404 | built but empty (404) | **Linked from the footer.** No CMS page yet. |
| `/privacy-baptism` | added (D-029) | 404 | 404 | built but empty (404) | Needed before the baptism form can open. |
| `/[slug]` (generic) | §4 | — | — | built | No generic pages exist apart from those above. |
| `/search`, `/search?q=` | added (P3 t6) | 200 | 200 | built | EN queries now return results (see (d)). |
| `/api/ical` | §4 | 200 | — | built | |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | P1 t8, P3 t8 | 200 | — | built | The sitemap has 44 `<loc>` entries. |
| `/sv/…` | P3 t2 | 200 | — | built, not in the switcher | Swedish coverage is 0 %. Pages show the Amharic text as fallback (D-041). |

**Summary:** no route from spec §4 is missing code. Every 404 is a content gap.

**Three visible broken links:**
- "News & Media" in the main menu → `/news`
- "Privacy policy" in the footer → `/privacy`
- "Cookies" in the footer → `/cookies`

## (b) Church-content import (mapping table, D-045 and D-046)

| Content key | Target | Amharic imported | EN draft | Verified by |
|---|---|---|---|---|
| `about` + `about-closing` | Page `our-church/index` | DONE | DONE | API (`church:about`, published); `/en` shows "About Our Church" |
| `our-faith` | Page `our-faith/index` | DONE | DONE | API, `/our-faith` 200 |
| `history` | Page `our-church/history` | DONE | DONE | API |
| `sacraments` | Page `sacraments/index` | DONE | DONE | API |
| `worship` | Page `worship/index` | DONE | DONE | API |
| `christening` | Teaching → `/sacraments/baptism` | DONE | DONE | API; EN H1 "Baptism (Christening)" |
| `marriage` | Teaching → `/sacraments/marriage` | DONE | DONE | API |
| `offerings` | Teaching (new category) → `/our-faith/offerings`, `/support` | DONE | DONE | API; EN H1 "Offerings (Mebae)" |
| `fitihat` | Teaching → `/sacraments/fitihat` | DONE | DONE | API |
| `annual-feasts` | Page `worship/annual-feast-days` | DONE | DONE | API |
| `monthly-feasts` | Page `worship/monthly-feast-days` | DONE | DONE | API |
| `weekly-service` | Page `worship/weekly-service` | DONE | DONE | API; EN H1 "Weekly Services" |
| Events from the text | Wed/Fri prayer, Saturday school, Mon–Fri counselling ×5 | DONE (8 events with `church:event:*`) | DONE | API |

**Other import facts:**
- Both Markdown files have 13 `<!-- content: -->` blocks.
- The steps (`content:convert` → `content:import` (drafts) → `content:publish` (development review)) are DONE per D-045. All 12 items are published on the dev site.

**Not verified (admin only):**
- That the 4 teachings carry the placeholder approver "NOT APPROVED – development review".
- That the draft versions match.

**Open items from the mapping:**
- The church has not confirmed the page split or the weekly-service headings.
- The event times are open: Wed/Fri end time, Saturday time, and whether counselling "8–12" is European or Ethiopian clock time.
- The Saturday afternoon home and hospital visits and confession by appointment were not added as events.
- **Production procedure:** in production, import as drafts and have real clergy approve the teachings. `content:publish` refuses to run with `SITE_ENV=production`.

**Content still from the old site:**
- The Sunday School intro (EN draft from the importer).
- The Sunday Kidase, 3 monthly feasts, 10 annual feasts and Filseta.
- The video.
- 22 photos and the chart (unpublished).

**Stale documentation:** CONTENT-CHECKLIST.md still describes the state before D-045 and D-046 in several places:
- The "Start here" table says `/our-faith` needs a teaching, and that `/support` is the old መባዕ page.
- The per-section tables show Am as "Imported (old …)" and En as "Not started".
- "Our Faith intro: Not started" is out of date.
- Item 14, "English translations of all imported content", is largely superseded; it is now a review task.
- `/our-church/leadership` and `/our-church/diocese` are missing from the "Start here" table.

## (c) What the church must still supply or decide

**People**
1. Office Coordinator and Clergy Approver: admin accounts, MFA enrolment, the 30-minute walkthrough and sign-off (P2 exit item 7, spec §10 #6).
2. Swedish reviewer (P3 exit item 1).
3. Native Amharic reviewer for the interface text, error pages and `mfa-am.ts`.
4. Someone to review the English draft translation.

**Approvals**
5. Clergy approval of the 4 teachings (ክርስትና, ጋብቻ, ፍትሐት, መባዕ), Amharic and EN draft together.
6. Committee sign-off on every page:
   - `/our-church`, `/our-church/history`, `/our-faith`, `/sacraments`, `/worship`, the 3 worship explanation pages, `/sunday-school`, `/support`.
   - The page split and the weekly-service headings.
   - Current facts: the building-fund appeal, the Rågsved class, pastoral hours, the diaconate class.
7. Privacy policy (`/privacy`), cookies page (`/cookies`) and baptism privacy notice (`privacy-baptism`), am/en, with legal review closed or explicitly deferred (P2 exit item 5).
8. Retention periods: 24 months for baptism requests and 12 months for inquiries are defaults that need legal confirmation.
9. Committee sign-off table: names and identity, palette (spec §10 #2), Amharic interface, privacy, launch readiness.

**Facts**
10. Service times:
    - Kidase 08:00–11:30.
    - Wed/Fri from 18:00 (end time?).
    - Saturday school time.
    - Counselling clock (European or Ethiopian?).
    - Kidase times for the monthly and annual feasts (now all-day).
11. Genna, the movable feasts (Hosanna, Siklet, Fasika, Erget) and the fasts (Tsome Nebiyat, Abiy Tsom …), entered per year.
12. Site settings: office email and phone (the old phone and Gmail address: which are the office's?), office notification emails, map pin, transit directions, default event location.
13. Livestream link, then a live test on a Sunday (P3 exit item 2).
14. Social links (is YouTube @Dekikebetu27 the church's channel?).
15. Postgiro numbers (4980549-2, 6195429-3): show them on `/support` or not.
16. Whether "Requests open" goes on for baptism, and when.

**Photos**
17. Permission to publish for the 22 photos and the Sunday School chart. For the Sunday School and diaconate galleries, which show children, the guardians' written permission is needed. Real alt texts are also needed. Then publish the 4 galleries.
18. A sharper hero and default share image (≥ 1600 px; the current one is 727 px).
19. Clergy photos with permission (for `/our-church/clergy`).
20. The Facebook photos for review (still waiting).

**Text**
21. Clergy profiles: names, Amharic bios, photos.
22. Leadership and Diocese pages (`/our-church/leadership`, `/diocese`).
23. Our Faith teachings: mysteries, sacraments, fasting, prayers, FAQ.
24. Summaries for the 6 Sunday School departments.
25. Homepage: hero heading and subheading, CTAs, about teaser, Sunday School teaser.
26. Baptism page intro and the "What to prepare" checklist (Settings → Baptism page; not verified whether these are empty).
27. At least one news post, or a decision to point the menu item at `/media`.
28. Optional Visit intro, and the volunteer-form wording.
29. Swedish translation of the core pages (0 % now; the switcher needs 80 %).
30. Sermon audio, if wanted.

**Decisions**
31. Analytics: turn on cookieless Plausible or not (off now).
32. Phase 4 (giving, membership, hall booking): out of scope unless approved.
33. Hosting and staging choice: needed for every open "staging" exit item.

## (d) Proposed order of work

**Code and repository work (can start now, no church input needed):**
1. **Update CONTENT-CHECKLIST.md** to the D-045 and D-046 state: the stale rows listed in (b), the English rows changed from "Not started" to "EN draft, review", and leadership and diocese added to "Start here".
2. **Fix the 3 visible broken links (settings, not code):**
   - Point the "News & Media" menu item at `/media`, or remove it until there is a news post.
   - Hide the footer privacy and cookies links until those pages are published, or draft the factual `/cookies` text (no tracking cookies; embeds load on click) for the committee to approve.
3. **Decide on `/our-church/clergy`:** gate it like the other sections (404 or hidden while there are no published clergy) or accept the heading-only page. A small change to `content-paths.ts` and `/api/site/paths` with a test; log it in DECISIONS.
4. **Re-run P3 exit item 3 in English** (10 queries) now that English text exists, and update the exit report. 5 sample queries (baptism, Kidase, offerings, history, Timket) already return the expected page first or near the top.
5. **Staging deployment** and the Phase 0 server items: backups and a restore test, Sentry and uptime monitoring, Resend domain, production Turnstile keys. Then re-run the §6 exit checklists and Lighthouse on staging with real content, including the planned performance pass (D-039).
6. **Production content load:** `content:import` (drafts) and the WordPress import as drafts, then publishing by real clergy and editors.

**Church work, in parallel, by priority:**
1. Name the Office Coordinator and Clergy Approver. This unblocks teaching approval and the P2 walkthrough.
2. Clergy approval of the 4 teachings and committee review of the imported pages and the EN draft.
3. Privacy policy, cookies page and baptism privacy notice, plus the legal review decision. This unblocks the footer links and opening baptism requests.
4. Office facts and Site settings (contact details, map, notification emails, service times) and the per-year feasts.
5. Photo permissions. This unblocks the galleries, the Sunday School chart and a better hero image.
6. New text: homepage, clergy, departments, the Our Faith teachings, leadership and diocese, news.
7. Livestream link and the Sunday test. Then the Swedish translation and review, then turning on the Swedish switcher.

**Not verified:**
- Admin-only state: teaching approver, Baptism page global, Site settings fields, unpublished drafts.
- Whether the English draft matches the Amharic in meaning (needs a native reviewer).
- Rendering on mobile devices.
