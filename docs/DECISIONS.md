# Decisions Log

## Open questions

### Q-004 — Language selection on "/" and UI string review (2026-10-18)
- **Question 1:** Should the site guess the visitor's language from their browser?
- **Default applied:** No. `/` always redirects to `/am`; visitors switch language explicitly. Reasons: Amharic is the primary audience, Swedish isn't public until Phase 3, and it means no locale cookie (no consent banner needed). Can be turned on later (`localeDetection` in `src/i18n/routing.ts`).
- **Question 2:** Who reviews the Amharic and Swedish UI strings (`src/messages/am.json`, `sv.json`)?
- **Default applied:** Amharic navigation labels reuse the names on dev.medhanealem.se where they exist (መነሻ ገጽ, ትምህርቶች, ሰንበት ት/ቤት, ያግኙን); everything else is a draft for a native speaker to correct before launch. Tracked in docs/CONTENT-CHECKLIST.md.
- **Note:** CLAUDE.md says UI strings live in `/messages/{locale}.json`; spec §1.1 places them under `src/messages/`. We follow the spec layout (`src/messages/`).

## Deferred work (by phase)

### Phase 3 — polish
- **Amharic text for the admin MFA screens** (enrol, verify, recovery codes, reset). Today they are English-only (`src/i18n/admin.ts`). Payload admin has no built-in Amharic, so this means adding `am` custom translations and enabling the language for the admin UI; text needs native review. Requested by Biruk 2026-10-18.

## Resolved decisions

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
