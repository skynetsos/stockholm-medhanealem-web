# Decisions Log

## Open questions

## Deferred work (by phase)

### Phase 1 — task 10 (performance)
- **Long cache for media files:** files served through Payload (`/api/media/file/…`) must send `Cache-Control: public, max-age=31536000, immutable` (filenames are unique) so Cloudflare caches them; verify in the Lighthouse run. Requested by Biruk 2026-10-19. Note: only images with publication permission are publicly readable, so caching them publicly is safe; if permission is later withdrawn, the file must also be renamed/re-uploaded or purged from Cloudflare.

### Phase 3 — polish
- **`containsMinors` enforcement** (spec Phase 3 task 3): e.g. require a guardian-permission note before an image showing children can be marked publishable. Phase 1 already keeps every image without "Permission to publish" off the public site (D-009).
- **404 page with the CMS header and footer.** Today the 404 shows only the translated message and a home link (D-007). Requested by Biruk 2026-10-18.
- **Amharic text for the admin MFA screens** (enrol, verify, recovery codes, reset). Today they are English-only (`src/i18n/admin.ts`). Payload admin has no built-in Amharic, so this means adding `am` custom translations and enabling the language for the admin UI; text needs native review. Requested by Biruk 2026-10-18.

## Resolved decisions

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
