# Phase 2 — Exit checklist report

**Date:** 2026-11-13 · **Scope:** local-first, as in Phases 0 and 1. Items that say "staging" were
verified on a local production build (`pnpm build`, `next start`), using the e2e database with fixture
data and Mailpit for email. Spec: STOCKHOLM-MEDHANEALEM-BUILD-SPEC.md §6 Phase 2. Decisions:
docs/DECISIONS.md D-026 to D-039.

**Checks run for this report (2026-11-13):** Node 22.23.5, Payload 3.93, Next.js 16.4.5.

- Lint and typecheck are clean.
- 51 test files with 315 unit and integration tests pass on Postgres 16.
- The production build succeeds.
- Playwright e2e passes, including axe, CSP and the new full journey (107 tests).
- `pnpm audit --prod --audit-level=high` is clean.
- CI was green on every Phase 2 commit.

## Tasks

| # | Task (spec) | Done in |
|---|---|---|
| 1 | Collections, private access, `reference` with yearly sequence | `6fd390f`; atomic under concurrency `f2451c4` (D-034) |
| 2 | Status machine, role check, audit log | `37b1e6b` (`src/lib/baptism/state.ts`, `transition.ts`); status only via `POST /api/baptism-requests/:id/status` |
| 3 | `/sacraments/baptism` guidance, checklist, notice, CTA | `0981fa3` |
| 4 | Three-step request form, zod per step, Turnstile, 3/hour limit, privacy text, reference | `717b905` |
| 5 | Emails am/en: acknowledgement, office notification, confirmed, declined; logged | `3abb3d0` (D-030) |
| 6 | Admin: case list (status filter, assignee, age), case page (timeline, role-filtered buttons, notes, Stockholm schedule picker + Ethiopian date), dashboard counts | `6f0365d`, `e7eec8d` (D-031–D-033) |
| 7 | Sunday School, marriage, fitihat (and volunteer) inquiry forms | `4888acc` |
| 8 | Retention job `/api/cron/retention` (+ inquiries after 12 months) | `55da262`, `9854be3` (D-035) |
| 9 | Export case as JSON / erase case (super admin, logged) | `4eca1a9` (D-036) |
| 10 | CSRF, CSP, headers, CI audit, admin sign-in limit, 8 h sessions | `21265be` (D-037), then Next.js 16 / Payload 3.93 (D-038, D-039) |
| 11 | Tests: unit, integration (access per role), e2e full journey | this report's commit: `tests/e2e/journey.spec.ts` |

## Exit checklist

| # | Checklist item (spec) | Result | Evidence |
|---|---|---|---|
| 1 | End-to-end on staging with dummy data: submit → acknowledgement email → office sets `clergy_review` → clergy sets `scheduling` → office `confirmed` → applicant email → `completed` | **PASS** (locally) · staging **WAITING** | `tests/e2e/journey.spec.ts`, run in a real browser on the production build. An applicant submits the three-step form, and the acknowledgement arrives in Mailpit. An office coordinator and a clergy approver then **sign in through `/admin/login` and enrol MFA in the admin's own screens** (TOTP code, recovery codes). The office sends the case to clergy review and sees no clergy buttons. The clergy approver approves it for scheduling. The office sets the date (the confirm dialog shows it in Stockholm time, "20 Dec 2026, 10:00", with the Ethiopian date) and confirms, which emails the applicant ("Baptism confirmed"). Finally the office marks the case completed, and the timeline lists every step. The same journey runs at API level in `tests/integration/baptism-workflow.test.ts`. One shortcut: the scheduled date is set through the admin REST API as the signed-in office user, because Payload's date-time picker isn't scriptable reliably; the dialog then shows the date as staff see it. Staging needs hosting. |
| 2 | Editor and translator accounts cannot see any request record by any path (test evidence attached) | **PASS** | `tests/integration/baptism-requests.test.ts` covers the public, editor, translator and finance accounts. They get nothing through the local API, REST (list, by id, count) or GraphQL. Nobody can create a request through the API, staff included. Case events and inquiries have the same tests. `tests/unit/private-collections.test.ts` fails the build if any code behind the public pages reads a private collection, which covers the server-component path. In the admin, these roles see neither collection in the menu nor on the dashboard. |
| 3 | Every status change appears in the audit timeline with actor and time | **PASS** | Integration: "runs the exit-checklist journey and logs every change with actor and time"; "logs status changes and assignments with the staff member"; "logs a change made by server code as the system". e2e: the timeline on the case page lists every status. Status can only change through the status action, so no change escapes the log. |
| 4 | Rate limiting and Turnstile verified; honeypot caught | **PASS** | `tests/integration/baptism-form.test.ts`: the honeypot submission stores and sends nothing, a failed Turnstile check is refused, and the 4th request in an hour is refused. `inquiry-forms.test.ts`: one shared limit of 5 per 10 minutes. `login-limit.test.ts`: admin sign-in is limited to 10 per 15 minutes. In e2e, Turnstile runs in the browser with Cloudflare's test key under the strict CSP (`csp.spec.ts`). **Production Turnstile keys are needed for staging.** |
| 5 | Privacy notice (am/en) approved by committee; legal review ticket closed or explicitly deferred by committee | **WAITING** (committee) | The form links to the privacy notice Page (`privacy-baptism`), and the page must exist before the form opens. The text is church content: CONTENT-CHECKLIST.md → "Privacy notice". |
| 6 | Retention job dry-run output reviewed | **PASS** (output below) · numbers **WAITING** (legal review) | `pnpm retention:dry-run` on the dev database, 2026-11-13: `baptism-requests: would archive 0 closed before 2024-11-13 (24 months)`; `inquiries: would archive 0 closed before 2025-11-13 (12 months)`; `Dry run: nothing was changed.` The integration test `retention.test.ts` archives cases past the limit and keeps newer ones. The periods (24 and 12 months) are Site settings defaults, pending legal review (D-035). |
| 7 | Office Coordinator and Clergy Approver each completed a 30-minute walkthrough and signed off | **WAITING** (church) | The people aren't named yet (spec §10 #6). RUNBOOK → "Baptism requests" is the walkthrough script. |

**Result:** code complete. Items 1 (staging), 5 and 7 need the church and hosting. All open items are
listed in CONTENT-CHECKLIST.md.
