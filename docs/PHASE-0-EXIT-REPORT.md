# Phase 0 — Exit checklist report

**Date:** 2026-10-18 · **Scope agreed with Biruk:** local-first. Tasks 11 (staging deployment) and 12
(Sentry/uptime) are skipped for now; every checklist item that says "staging" is verified on localhost.
Spec: STOCKHOLM-MEDHANEALEM-BUILD-SPEC.md §6 Phase 0.

| # | Checklist item (spec) | Result | Evidence |
|---|---|---|---|
| 1 | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass in CI | **PASS** | GitHub Actions run [39137091931](https://github.com/skynetsos/stockholm-medhanealem-web/actions/runs/39137091931) on `main`: every step green — lint, typecheck, unit + integration tests against Postgres 16 (9 files / 60 tests), production build, e2e database prepared via migrations, Playwright 11/11. (A run for the commit adding this report is listed below.) |
| 2 | Staging serves `/am`, `/en`, `/sv` with correct `<html lang>` and `hreflang` (**localhost**) | **PASS** | Dev server, 2026-10-18: `/am → lang=am`, `/en → lang=en`, `/sv → lang=sv`; each with canonical and `hreflang` for am, en, sv, x-default. Production build: Playwright tests "home renders in am/en/sv" assert `lang`, welcome text, seeded church name and all four `hreflang` links (CI run above; locally 11/11). Production Docker stack over HTTPS (`https://localhost:8443`): `/am`, `/en` 200 with correct `lang` (Phase 0 task 10). |
| 3 | Admin login works; MFA enforced for super_admin | **PASS** | Biruk signed in as the first super_admin, enrolled TOTP, and was asked for a code at the next sign-in (confirmed 2026-10-18). Integration tests `tests/integration/mfa.test.ts` (9 tests, green in CI): every privileged role without MFA is redirected to `/admin/mfa` from every admin route and gets 403 from REST/GraphQL; enrolment, per-session verification, replay rejection, one-time recovery codes, 5-try lockout and super_admin-only reset. Live probe (task 4): un-enrolled office_coordinator → `/admin`, `/admin/collections/users`, `/admin/account` all `307 → /admin/mfa`; `/api/users` 403. |
| 4 | Ethiopic text renders correctly on Android Chrome and iOS Safari (screenshot) | **PASS (emulated) · real-device screenshot pending** | Emulated, against the dev server: iPhone 13 profile in WebKit (Safari's engine) and Pixel 7 in Chromium, both with the self-hosted Noto Sans/Serif Ethiopic loaded — `docs/evidence/phase-0/iphone-13-webkit-am.png`, `iphone-13-webkit-am-menu.png`, `pixel-7-chromium-am.png`, `pixel-7-chromium-am-menu.png`. **Outstanding:** Biruk's screenshot of `http://192.168.10.187:3000/am` from a real phone (add as `docs/evidence/phase-0/<device>-am-real.png`). An iPhone check is still needed if only an Android phone is used, or vice versa. |
| 5 | Postgres backup job configured (daily, encrypted, off-server) and one restore tested | **PARTIAL** | **Done:** `scripts/backup/backup-db.sh` — GPG AES-256 encryption (verified: no readable data in the file), SHA-256 checksum, copy to a separate backup bucket; `restore-db.sh` restored from the bucket copy into a scratch DB on both the dev stack and the production Docker stack (29 tables, users, migration and church name intact; drill logged in RUNBOOK). Live-overwrite guard verified. **Not yet:** the *daily schedule* and the *real off-server bucket* need the server, which doesn't exist yet (tasks 11/12 skipped). The cron line and bucket setup are in RUNBOOK → First deployment step 9; tick this item when that is done. |
| 6 | `docs/RUNBOOK.md` complete; `.env.example` complete | **PASS** | RUNBOOK covers prerequisites, local setup, phone testing, all env vars and the secrets to back up (`PAYLOAD_SECRET`, `MFA_ENCRYPTION_KEY`, `BACKUP_PASSPHRASE` at lines 49–51), commands, migrations, backup/restore + drill log, first deployment, updates, rollback, accounts/MFA, troubleshooting. Automated check: all 34 env vars read by code/config are documented — 19 settings in `.env.example` / `.env.production.example`, 15 script/tooling flags in RUNBOOK or script headers; none undocumented. |

## Skipped by agreement (to do when hosting is chosen)

| Task | Status | What is ready |
|---|---|---|
| 11 — Deploy to staging | Skipped | `Dockerfile`, `docker-compose.prod.yml`, `Caddyfile`, `.env.production.example`, RUNBOOK → First deployment. The full stack was run locally over HTTPS. |
| 12 — Sentry + uptime | Skipped | `/api/health` endpoint (200 when the database is reachable, 503 otherwise) ready for an uptime monitor; `SENTRY_DSN` documented. |

## Open items carried into Phase 1

- Ethiopic screenshot from a real phone (item 4).
- Daily backup cron + real off-server bucket on the server (item 5).
- Native Amharic review of `src/messages/am.json` (Biruk; CONTENT-CHECKLIST.md).
- Palette confirmation by the committee (spec §10 #2).
- `SiteSettings.logo` with the Media collection (DECISIONS.md → Deferred → Phase 1).
- Pages that call `notFound()` are client-rendered in Next 15.4 (DECISIONS.md D-007, Phase 1 note).
