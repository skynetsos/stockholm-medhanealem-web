# Phase 1 — Exit checklist report

**Date:** 2026-10-27 · **Scope:** local-first, as in Phase 0: items that say "staging" are verified on
a local production build (`pnpm build`, `next start`, e2e database with fixture content). Spec:
STOCKHOLM-MEDHANEALEM-BUILD-SPEC.md §6 Phase 1. Decisions: docs/DECISIONS.md D-008–D-025.

**Run for this report (2026-10-27):** lint and typecheck clean · 31 test files / 225 unit + integration
tests pass (Postgres 16) · production build OK · Playwright e2e incl. axe **85/85** · Lighthouse as
below. CI green on every Phase 1 commit (last: `5aae937`).

| # | Checklist item (spec) | Result | Evidence |
|---|---|---|---|
| 1 | All routes in §4 (except sacrament forms) render on staging with real migrated content | **WAITING** (task 7, staging) | Every §4 route exists and renders with fixture content in the production build: home, CMS pages, Our Church + Clergy, Our Faith + teachings, Sacraments + baptism/marriage/fitihat guidance, Worship (weekly, monthly, annual, calendar, livestream), `/api/ical`, Sunday School + departments, News + posts, Media + galleries + videos, Visit, Support, privacy/cookies (CMS), 404 (`tests/e2e/pages.spec.ts`, `smoke.spec.ts`). Real content needs the WordPress import (task 7, waiting for the WXR export) and the committee's content (CONTENT-CHECKLIST.md); staging needs hosting. |
| 2 | Calendar shows Sunday Kidase 08:00–11:30 weekly and at least one annual feast with Ethiopian date; correct across DST | **PASS** (locally) | e2e: weekly Kidase listed as "Every Sunday · 8:00 – 11:30" and in the calendar and iCal feed at 08:00 Stockholm. Unit tests: Kidase stays 08:00–11:30 on both clock-change Sundays (last Sunday of March/October) and for a full year; yearly feast (Timket, Tir 11) moves correctly between Gregorian years; every calendar day shows its Ethiopian date (`tests/unit/expand-events.test.ts`, `stockholm-time.test.ts`, `ethiopian-calendar.test.ts`). With real events: after task 7 / office entry. |
| 3 | Contact form delivers to office mailbox; spam test blocked; rate limit works | **PASS** (locally) · real mailbox **WAITING** (staging) | e2e: form sent in a browser, success page with reference, office email arrives in Mailpit (CI too). Integration: honeypot submission stored nothing and sent nothing; failed Turnstile refused; 6th message in 10 minutes refused; email contains no personal data (`tests/integration/inquiries.test.ts`). The real office mailbox needs Resend (verified domain), Turnstile production keys and the office notification emails (RUNBOOK → Contact form). |
| 4 | Lighthouse ≥ 90 (performance, accessibility, SEO) on home, calendar, baptism guidance page, mobile | **PASS** (locally) | `pnpm lighthouse`, mobile profile, production build with `SITE_ENV=production`: home (am) 92/100/92, home (en) 93/100/92, calendar 90/100/92, **baptism guidance 92/100/100**, teaching 91/100/100 (performance/accessibility/SEO); best practices 96. Re-run on staging with real content before launch (D-025). |
| 5 | axe: 0 serious/critical issues on all templates | **PASS** | `tests/e2e/a11y.spec.ts`: WCAG 2.2 A/AA on every template at desktop and phone size, plus lightbox, form errors and phone menu: 0 issues of any severity; serious/critical fail CI (D-024). |
| 6 | Locale switch keeps the user on the equivalent page; fallback to am when en missing is visible to editors, not broken for users | **PASS** | e2e: the switcher links to the same page in the other language (home and CMS pages; one slug for all languages, D-010). Missing translations fall back to Amharic on the site (pages, teachings, events, alt text — D-024); in the admin a missing translation shows as empty, so editors see what is untranslated. Known gap for Phase 3: fallback text isn't marked `lang="am"` (WCAG 3.1.2). |
| 7 | No placeholder or "lorem" content anywhere; hidden sections verified | **PASS** | Code search: no lorem/placeholder/TODO text in `src`; dev database: no sample or test content left (2026-10-27). Empty sections hide themselves and pages without content answer a real 404 (D-016–D-021); e2e covers the hidden/404 cases. |
| 8 | Church committee has reviewed every page (sign-off recorded in CONTENT-CHECKLIST.md) | **WAITING** (committee) | CONTENT-CHECKLIST.md lists every page and setting with owner and status, starting with the 11 menu links that 404 until their content exists; sign-off table at the end. |

**Phase 1 accepted conditionally by Biruk on 2026-10-27: code-complete.** Carried forward (top of
CONTENT-CHECKLIST.md): task 7 (WordPress import, needs the WXR export) and the committee content
review.

## Also carried forward

- Staging deployment and the Phase 0 server items (daily backup cron, off-server bucket, Sentry/uptime).
- Before launch: re-run `pnpm lighthouse` and the exit items above on staging with real content.
- Content to supply (CONTENT-CHECKLIST.md): map pin, office emails, a sharper default share/hero photo,
  privacy policy (legal review), Facebook photos for review.
- Phase 3 list in DECISIONS.md (fallback language marking, 404 with header/footer, Amharic MFA screens,
  `containsMinors` enforcement).
