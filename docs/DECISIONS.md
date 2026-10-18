# Decisions Log

## Open questions

## Deferred work (by phase)

### Phase 1
- **Add `SiteSettings.logo`** (upload, Media collection) and show it in the header instead of the text wordmark (Q-005).

### Phase 3 — polish
- **404 page with the CMS header and footer.** Today the 404 shows only the translated message and a home link (D-007). Requested by Biruk 2026-10-18.
- **Amharic text for the admin MFA screens** (enrol, verify, recovery codes, reset). Today they are English-only (`src/i18n/admin.ts`). Payload admin has no built-in Amharic, so this means adding `am` custom translations and enabling the language for the admin UI; text needs native review. Requested by Biruk 2026-10-18.

## Resolved decisions

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
- **Phase 1 note:** a page that calls `notFound()` (e.g. an unknown CMS slug) will still get the client-rendered shell. Prefer making such pages unmatched routes (generateStaticParams + `dynamicParams = false` where the slugs are known), and re-check this behaviour when upgrading Next.js.

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
