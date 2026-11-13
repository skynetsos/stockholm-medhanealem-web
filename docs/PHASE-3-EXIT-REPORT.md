# Phase 3 — Exit checklist report

**Date:** 2026-11-13 · **Scope:** local-first, like earlier phases. Spec:
STOCKHOLM-MEDHANEALEM-BUILD-SPEC.md §6 Phase 3. Decisions: docs/DECISIONS.md D-040 (content import) to
D-044.

**Checks run for this report (2026-11-13):** Node 22.23.5, Payload 3.93, Next.js 16.4.5.

- Lint and typecheck are clean.
- 58 test files with 352 unit and integration tests pass on Postgres 16.
- The production build succeeds.
- Playwright e2e passes, including axe on every template and form, the CSP checks and the full baptism journey (115 tests).
- CI was green on every Phase 3 commit.

## Tasks

| # | Task (spec) | Result | Where |
|---|---|---|---|
| 1 | Translation workflow: "Missing translations" view, translators scoped to their languages, publishing a page in a language needs that language's title and body | **Done** | `/admin/translations` (D-041); the publish rule is on Pages |
| 2 | Swedish in the public switcher once ≥ 80 % of core pages are translated (flag in Site settings) | **Done** | The flag can only be turned on at 80 % or more (D-041). Swedish coverage today: 0 % |
| 3 | Media: `/media/videos` with filters, audio player for sermons, galleries by year, bulk upload with alt/caption required, `containsMinors` enforced | **Done**, caption optional | Filters by type and year, an "Audio recordings" upload collection with the browser's player, galleries grouped by year. Bulk upload requires alt text. Photos of children need the guardians' permission recorded before they can be published (D-042). Caption stays optional: judgement call, logged |
| 4 | `/worship/livestream`: consent-gated YouTube/Facebook embed, next service when offline | **Done** | YouTube, Vimeo and Facebook video links play behind the Play button. The next service is always shown. A live-status check would need platform APIs (D-042) |
| 5 | Volunteer form → Inquiries (volunteer) | **Done in Phase 2** (task 7) | `/support/volunteer` |
| 6 | Search: Postgres full-text over Pages, Teachings, Posts, Events per language; `/search?q=`; Ethiopic sanity test | **Done** | D-043; `tests/integration/search.test.ts` |
| 7 | Announcement email digest (optional) | **Skipped** (Biruk's ruling) | |
| 8 | Polish: 404/500 localized, calendar print styles, PWA manifest + icons, privacy-friendly analytics | **Done**; analytics **off** | D-044. Also done: the deferred items (404 with the CMS header and footer, Amharic MFA screens, `lang` on fallback text) |

Also in this phase:
- **The WordPress import** (Phase 1 task 7, D-040), from the public pages of dev.medhanealem.se.
- **"In this section"** lists on section landing pages.

## Exit checklist

| # | Checklist item (spec) | Result | Evidence |
|---|---|---|---|
| 1 | Swedish reviewer sign-off on core pages | **WAITING** (church) | No Swedish content yet: core Swedish coverage is 0 % in "Missing translations". The reviewer isn't named. The Swedish interface strings (`src/messages/sv.json`) are drafts that need the same review. |
| 2 | Livestream page tested live on a Sunday | **WAITING** (church) | The page appears once Site settings has a livestream link; none is set. Tested with a fixture YouTube video (CSP e2e, zero violations) and Facebook link parsing (unit). Needs a real stream on a Sunday. |
| 3 | Search returns relevant results in am and en for 10 sample queries | **PASS for Amharic** (dev database, imported content) · English **WAITING** (no English content) | 10 Amharic queries on 2026-11-13, each with the expected page or teaching first. ቅዳሴ → Sunday Kidase event, then the weekly-service page. ክርስትና → christening teaching. ጋብቻ → marriage teaching. ፍትሐት → fitihat teaching. መባዕ → offering page. ጥምቀት → Timket event, then the annual feasts page. መስቀል → Meskel event. ሰንበት → Sunday School page, then Kidase. ታሪክ → the history page. ሚካኤል → the two St Michael events. English queries (Kidase, baptism, liturgy) return nothing because no English text exists yet. An Amharic query on an English page finds the Amharic content, marked `lang="am"`. English search with English content (stemming, "service" finds "services") is proven in the integration tests and e2e. Re-run the 10 queries in English once translations exist. |
| 4 | All forms audited again for accessibility | **PASS** (automated) · manual check **recommended** | axe (WCAG 2.2 A/AA) on every form at desktop and phone size, including error states: contact, baptism request (all 3 steps), Sunday School registration, volunteer, marriage/fitihat inquiry and the new search form; **0 issues of any severity** (`tests/e2e/a11y.spec.ts`). Every field has a label; errors are linked from a focused summary. A screen-reader pass (NVDA/VoiceOver) in Amharic is still worth doing with a native speaker. |

**Result:** code complete. Items 1, 2 and English search (item 3) need the church. Everything the church
must supply or decide is listed in CONTENT-CHECKLIST.md.

## Not done / known limits

- **Phase 4** (giving, membership, hall booking): out of scope (Biruk).
- **Lighthouse** 86–90 on mobile (accepted for now, D-039). The performance pass is planned with real content.
- **No staging yet.** Staging-related items from Phases 0–2 are still open: backups, Sentry, uptime, and production keys for Resend and Turnstile (RUNBOOK).
- **Search has no stored index.** Fine at the current size; the path for growth is in D-043.
