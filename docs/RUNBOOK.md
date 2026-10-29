# Runbook

Operating guide for the Stockholm Medhanealem website. Decisions behind these procedures are in
[DECISIONS.md](DECISIONS.md); the build plan is [STOCKHOLM-MEDHANEALEM-BUILD-SPEC.md](../STOCKHOLM-MEDHANEALEM-BUILD-SPEC.md).

Commands are shown for bash. On Windows PowerShell, set variables first instead of prefixing them,
e.g. `$env:ADMIN_EMAIL="x@y.se"; pnpm user:reset-mfa`.

## Prerequisites

| Tool | Version | Used for |
|---|---|---|
| Node.js | 22 LTS | app, scripts |
| pnpm | 12 (`packageManager` in package.json) | dependencies, scripts |
| Docker + Docker Compose | Docker Desktop (Windows/macOS) or Docker Engine (Linux) | Postgres, S3 storage, Mailpit, production stack |
| Git (+ Git Bash on Windows) | any recent | source control; Git Bash runs the backup scripts locally |
| GnuPG (`gpg`) | 2.x | backup encryption (included with Git for Windows and most Linux servers) |

## Local setup

```bash
git clone https://github.com/skynetsos/stockholm-medhanealem-web.git
cd stockholm-medhanealem-web
pnpm install
cp .env.example .env              # then generate PAYLOAD_SECRET, MFA_ENCRYPTION_KEY, IP_HASH_SALT, CRON_SECRET
pnpm services:up                  # Postgres 16, RustFS (S3), Mailpit
pnpm seed:base                    # church name, address, menu, footer (safe to re-run)
ADMIN_EMAIL=you@example.org ADMIN_NAME="Your Name" pnpm user:create-super-admin
pnpm dev                          # http://localhost:3000  (admin: /admin)
```

The create-admin script prints a one-time link to set your password (valid 1 hour). At first sign-in
you set up two-factor authentication (MFA) and save your 8 recovery codes.

Local service UIs: Mailpit (all outgoing email) http://localhost:8025 · RustFS console http://localhost:9001.

### Testing on a phone (same Wi-Fi)

```bash
DEV_ALLOWED_ORIGINS=<your PC's LAN IP> pnpm dev -H 0.0.0.0
```

Then open `http://<LAN IP>:3000/am` on the phone. Find the IP with `ipconfig` (Windows: the Wi-Fi
adapter's IPv4 address). Windows must allow Node.js through the firewall on that network; it asks the
first time Node listens, or an administrator can add a rule for TCP port 3000.

## Environment variables

Every variable is documented in [`.env.example`](../.env.example) (local) and
[`.env.production.example`](../.env.production.example) (server), including which phase first uses it.
`NEXT_PUBLIC_SERVER_URL` is compiled into the app: rebuild after changing it.

### Secrets that must be backed up

Keep these in the church's password manager. Back them up together, and hand them over together at handover:

| Variable | If lost or changed |
|---|---|
| `PAYLOAD_SECRET` | Everyone is signed out (sessions and reset links become invalid). Users can sign in again. |
| `MFA_ENCRYPTION_KEY` | **Every user's two-factor authentication stops working.** Stored authenticator secrets and recovery codes can no longer be checked, so nobody can complete MFA. A super_admin must reset MFA for each user and everyone re-enrols. If no super_admin can get in, a server operator must run the break-glass reset (see below) first. |
| `BACKUP_PASSPHRASE` | **Every existing database backup becomes unreadable.** New backups work again after setting a new passphrase. |
| `POSTGRES_PASSWORD`, S3 keys, `RESEND_API_KEY`, `CRON_SECRET`, `IP_HASH_SALT` | Can be rotated with the provider; update the env file and restart. |

**Rotating secrets at handover:** `PAYLOAD_SECRET` can be rotated freely. Only rotate `MFA_ENCRYPTION_KEY` if it may have leaked, and plan the re-enrolment of all privileged users when you do. If you rotate `BACKUP_PASSPHRASE`, keep the old one as long as backups made with it are retained (30 days).

### Recovering from a lost `MFA_ENCRYPTION_KEY`

1. Put a new 64-hex-char key in `MFA_ENCRYPTION_KEY` and restart the app.
2. On the server, reset the first super_admin (see [Accounts and MFA](#accounts-and-mfa)).
3. That super_admin signs in, re-enrols, then uses **Reset MFA** on each other user's page in /admin → Users.
4. Each user re-enrols at their next sign-in and stores their new recovery codes.

## Common commands

| Command | What it does |
|---|---|
| `pnpm dev` | Development server with hot reload (http://localhost:3000) |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | ESLint / TypeScript / unit + integration tests (need the local Postgres) |
| `pnpm build && pnpm test:e2e:prepare && pnpm test:e2e` | Production build, fresh migrated `<db>_e2e` database, Playwright smoke tests (stop `pnpm dev` first: same port) |
| `pnpm services:up` / `services:down` / `services:logs` | Local Docker services |
| `pnpm seed:base` | Fill Site settings, Navigation and Footer if empty, and create any missing Sunday School departments. `SEED_FORCE=1` overwrites |
| `pnpm user:create-super-admin` | Create a super_admin (or re-issue a set-password link). Needs `ADMIN_EMAIL`, `ADMIN_NAME` |
| `pnpm user:reset-mfa` | Break-glass MFA reset. Needs `ADMIN_EMAIL` |
| `pnpm generate:types` / `generate:importmap` | Regenerate Payload types / admin import map after config changes |
| `pnpm payload migrate:create <name>` | Create a database migration after changing collections, globals or fields |

Every change follows the project rule: `pnpm lint && pnpm typecheck && pnpm test` before committing.
CI (`.github/workflows/ci.yml`) also builds and runs the Playwright smoke tests on every push to `main` and every pull request.

## Database migrations

- **Development** syncs the schema automatically ("push"): change a collection, restart `pnpm dev`.
- **Production never pushes.** It applies the versioned migrations in `src/migrations/` when the app starts.
- **After any schema change** (new collection, field, global, `localized` flag, …):
  ```bash
  pnpm payload migrate:create describe-the-change
  ```
  Review the generated SQL, commit it with the change, and deploy as usual; the app migrates on startup.
- Check status on the server: `docker compose -f docker-compose.prod.yml run --rm tools payload migrate:status`.
- **Never run `pnpm start` (production mode) against the dev database.** The dev database was built by
  push; the production server then stops at an interactive "you've run Payload in dev mode" prompt and
  hangs. E2E tests use their own database (`pnpm test:e2e:prepare`) for exactly this reason.

## Database backup and restore

Scripts: [`scripts/backup/backup-db.sh`](../scripts/backup/backup-db.sh) and
[`scripts/backup/restore-db.sh`](../scripts/backup/restore-db.sh). They run on the server (or locally
with Git Bash) and need Docker and `gpg`.

**What a backup is:** `pg_dump` (custom format) → encrypted with GPG AES-256 using `BACKUP_PASSPHRASE`
→ saved in `./backups/` with a SHA-256 checksum → copied to the off-server bucket `BACKUP_S3_BUCKET`.
Local copies older than 30 days are pruned; give the bucket a 30-day lifecycle rule and versioning.

### Daily backup (server)

```bash
# from the repository folder on the server
scripts/backup/backup-db.sh
```

Schedule it daily at 02:30 with cron (`crontab -e` as the deploy user):

```cron
30 2 * * * cd /opt/medhanealem && scripts/backup/backup-db.sh >> /var/log/medhanealem-backup.log 2>&1
```

Check the log weekly (or let uptime monitoring alert on it, Phase 0 task 12).

### Restore drill (quarterly) — safe, does not touch the live site

```bash
scripts/backup/restore-db.sh s3://medhanealem-backups/db/<file>.dump.gpg
```

It downloads the backup, verifies the checksum, restores into a scratch database
`<POSTGRES_DB>_restore_check`, prints the number of tables, users, applied migrations and the church
name, then drops the scratch database. Record the date and output in this runbook's drill log below.

### Disaster recovery — restore over the live database

```bash
docker compose -f docker-compose.prod.yml stop app
TARGET_DB=medhanealem CONFIRM_LIVE_RESTORE=yes scripts/backup/restore-db.sh s3://medhanealem-backups/db/<file>.dump.gpg
docker compose -f docker-compose.prod.yml start app
```

On a **new server**: install as in [First deployment](#first-deployment), start only Postgres
(`docker compose -f docker-compose.prod.yml up -d postgres`), run the restore above, then `up -d`.
You need `BACKUP_PASSPHRASE` and the backup bucket keys from the password manager.

### Restore drill log

| Date | Backup restored | Result | By |
|---|---|---|---|
| 2026-10-18 | local dev DB → local backup bucket (`s3://medhanealem-backups/db/…`) | OK: checksum, 29 tables, 1 user, 1 migration, church name intact | Claude Code (Phase 0 task 10) |

## Production build and deployment

Files: [`Dockerfile`](../Dockerfile) (multi-stage, Next.js standalone server),
[`docker-compose.prod.yml`](../docker-compose.prod.yml) (app + Postgres 16 + Caddy with automatic HTTPS),
[`Caddyfile`](../Caddyfile), [`.env.production.example`](../.env.production.example).
Media goes to external EU object storage; Postgres runs on the server and is not exposed to the internet.

### First deployment

On a fresh Ubuntu 24.04 server in the EU (e.g. Hetzner Falkenstein/Helsinki, 2 vCPU / 4 GB RAM):

1. **Server basics:** create a non-root deploy user with SSH key login, disable password login,
   enable the firewall for ports 22, 80, 443 only (`ufw allow OpenSSH; ufw allow 80,443/tcp; ufw allow 443/udp; ufw enable`),
   turn on unattended security upgrades.
2. **Install Docker Engine + Compose plugin** (docs.docker.com/engine/install/ubuntu) and `gpg`, `git`.
3. **Get the code:**
   ```bash
   sudo mkdir -p /opt/medhanealem && sudo chown $USER /opt/medhanealem
   git clone https://github.com/skynetsos/stockholm-medhanealem-web.git /opt/medhanealem
   cd /opt/medhanealem
   ```
4. **Configure:** `cp .env.production.example .env.production && chmod 600 .env.production`, then fill in
   every value (generate secrets with `openssl rand -hex 32`). Store the secrets in the password manager now.
5. **Storage:** create two buckets in EU object storage: `medhanealem-media` (site uploads) and
   `medhanealem-backups` (versioning on, 30-day lifecycle; ideally a different provider or region).
6. **DNS (Cloudflare):** point `medhanealem.se` (A/AAAA) to the server. For the first certificate set the
   record to "DNS only" (grey cloud); after Caddy has issued the certificate, switch to "Proxied" and set
   Cloudflare SSL/TLS to **Full (strict)**.
7. **Start:**
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   docker compose -f docker-compose.prod.yml logs -f app      # wait for "Ready"; migrations run first
   curl -fsS https://medhanealem.se/api/health                 # {"status":"ok"}
   ```
8. **Seed and first admin** (do this before announcing the URL, so nobody else can register first):
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production run --rm tools seed:base
   docker compose -f docker-compose.prod.yml --env-file .env.production run --rm \
     -e ADMIN_EMAIL=you@example.org -e ADMIN_NAME="Your Name" tools user:create-super-admin
   ```
   Open the printed link, set the password, enrol MFA.
9. **Backups:** add the cron line from [Daily backup](#daily-backup-server), run it once by hand, then run a
   restore drill and log it.

### Updating the site

```bash
cd /opt/medhanealem
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

The new container applies any new migrations before serving. Take a backup first when the release
contains migrations (`scripts/backup/backup-db.sh`).

### Rolling back

```bash
git checkout <previous-tag-or-commit>
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

If the release ran a migration that the old code can't handle, restore the backup taken before the update.

### Testing the production stack locally

The same files run on a developer machine with Docker. Make `.env.production.localtest` from the example
(gitignored), with `SITE_DOMAIN=localhost`, `NEXT_PUBLIC_SERVER_URL=https://localhost:8443`,
`HTTP_PORT=8080`, `HTTPS_PORT=8443`, `APP_ENV_FILE=.env.production.localtest` and the local RustFS as S3
(`S3_ENDPOINT=http://host.docker.internal:9000`). Then:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production.localtest up -d --build
curl -k https://localhost:8443/api/health
docker compose -f docker-compose.prod.yml --env-file .env.production.localtest down -v   # remove when done
```

Caddy uses its own local certificate for `localhost`, so browsers show a warning; that is expected.

## Accounts and MFA

- **New staff account:** a super_admin creates the user in /admin → Users with the right roles and a
  temporary password, gives it to them in person (never by email), and they change it under Account
  after signing in. Once email is configured (Phase 1), "Forgot password" on the login page also works.
- **New super_admin:** use `user:create-super-admin` (prints a one-time set-password link).
- **Lost phone:** a super_admin opens the user in /admin → Users → **Reset MFA** (sidebar). The user is
  signed out everywhere and enrols again at next sign-in.
- **Break-glass (the only super_admin is locked out):** on the server
  ```bash
  docker compose -f docker-compose.prod.yml --env-file .env.production run --rm \
    -e ADMIN_EMAIL=you@example.org tools user:reset-mfa
  ```
  Locally: `ADMIN_EMAIL=you@example.org pnpm user:reset-mfa`.
- Privileged roles (super_admin, clergy_approver, office_coordinator) must complete MFA every session;
  sessions last 8 hours. Five wrong MFA codes lock MFA for 15 minutes.

## Contact form and inquiries

- Messages from the Visit page's contact form appear in the admin under **Requests → Inquiries** (office coordinators, clergy and super admins only). Set **Status** and **Assigned to** as you handle them; what the visitor sent can't be edited.
- The office is emailed a reference and a link for each message. Set who receives it in **Site settings → Requests & privacy → Office notification emails** (if empty, the public office email is used; if both are empty, nothing is emailed — the message is still in the admin).
- Locally, all mail goes to Mailpit: <http://localhost:8025>.
- Production needs `RESEND_API_KEY` (domain verified in Resend), `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (Cloudflare dashboard → Turnstile) and `IP_HASH_SALT`. Without the Turnstile secret, production refuses every message.

## Baptism requests

- Turn requests on in **Settings → Baptism page → Requests open** (the button on /sacraments/baptism and the form appear; the form needs published christening guidance). Turn it off to pause new requests.
- Requests appear under **Requests → Baptism requests** (filters by status and "Assigned to me" above the list; open cases on the admin home page). Every change (status, assignment, notes, emails) is in the case's **Timeline** and in **Requests → Case events**.
- Change the status with the buttons under **Next step** on the case page; you only see the steps your role may take. Save other edits first. **Confirm** needs the scheduled date saved; **Decline** needs an internal note. Both email the applicant.
- Emails (D-030), all with the reference only — never the applicant's or child's details:
  - on sending: an acknowledgement to the applicant (Amharic or English, Reply-To the public office email) and a notification to the office notification addresses;
  - on **Confirmed**: the date, time and place to the applicant (set the scheduled date first); on **Declined**: a short neutral notice. Place = Site settings → Default event location, else the address.
- If an email to the applicant fails, the case events show "could not be sent: contact them directly". Set the public office email in Site settings so applicants can reply.

## Retention of baptism requests

Completed and declined baptism cases are **archived** a set number of months after they closed
(spec Phase 2 task 8, D-035): names, contact details, date of birth, notes, IP hash and browser are
removed; the reference, status, dates and the audit trail (without free-text notes) stay.

- **How long:** Site settings → Requests & privacy → **Retention months (baptism)**, default 24.
  The number is for the **legal review** to decide (CONTENT-CHECKLIST.md, Legal).
- **Daily on the server** (`crontab -e` as the deploy user), after the backup:

  ```cron
  15 3 * * * curl -fsS -X POST -H "Authorization: Bearer $(grep ^CRON_SECRET= /opt/medhanealem/.env | cut -d= -f2-)" https://medhanealem.se/api/cron/retention >> /var/log/medhanealem-retention.log 2>&1
  ```

  The response lists the archived references (never personal data). Without a real `CRON_SECRET`
  on the server the endpoint answers 503 and archives nothing.
- **Check first / by hand:**

  ```bash
  pnpm retention:dry-run   # lists what would be archived, changes nothing
  pnpm retention           # archives now
  ```

  or `POST /api/cron/retention?dryRun=1` with the secret.
- Archiving can't be undone (the personal data is gone); restoring it would need a database backup
  from before, which also expires (backups are kept 30 days).

## Importing photos

- **Church images from the old site** (`src/seed/assets/`): `pnpm payload run scripts/import-site-assets.ts` imports the church photo and logo (publication permission ticked) and sets the Site settings logo, the Default share image and the Home page hero image. Safe to run again: images already in Media (same file name) are reused.
- **Photos from Facebook or a phone:** save them into one folder with descriptive file names (e.g. `timket-2026-procession.jpg`; the name becomes the alt text), then
  `$env:PHOTO_DIR="C:\Users\yonas\Pictures\medhanealem-photos\facebook"; pnpm payload run scripts/import-photos.ts`.
  Each photo is converted to JPEG, turned upright and stripped of all metadata (EXIF/GPS); photos under 800 px wide are skipped and listed. They arrive with **Permission to publish** and **Shows children** unticked and are collected in the unpublished gallery "ፎቶዎች / Photos" for review. Safe to run again. HEIC (iPhone) files can't be read here: save them as JPG.

## Performance check (Lighthouse)

`pnpm lighthouse` runs Lighthouse (mobile profile) on the home, calendar and a teaching page and fails
below 90 for performance, accessibility or SEO. Against a local production build:
`pnpm build && pnpm test:e2e:prepare`, start the server with `SITE_ENV=production` on port 3100,
then `pnpm lighthouse` (reports in `lighthouse-reports/`). Against staging:
`LH_BASE_URL=https://staging.example LH_PAGES=/am,/am/worship/calendar,/am/our-faith/<slug> pnpm lighthouse`.
In Git Bash on Windows, prefix with `MSYS_NO_PATHCONV=1` so `/am` isn't turned into a Windows path.

## Editor guide

For editors and office staff (spec Phase 1 task 12). The admin is at `/admin`; everything is entered
in **Stockholm time**. What still needs writing is listed in `docs/CONTENT-CHECKLIST.md`.

### Things that apply everywhere

- **Languages.** Amharic is the main language. Write it first, then switch the **Locale** menu at the
  top of the edit screen to English (and later Swedish) and translate the same item. A missing
  translation shows the Amharic text instead; nothing is left blank on the site.
- **Saving shows it.** Events, announcements and galleries appear on the site as soon as they are
  saved (and published, where there is a checkbox). A brand-new *page* can take up to 30 seconds.
- **Photos.** Every image needs alt text (a short description for people who can't see it) and only
  appears on the site with **Permission to publish** ticked. Tick it only when the church has
  permission — from parents or guardians too if children are recognisable (**Shows children**).
  Never upload photos of other churches. If permission is withdrawn later: delete the image and ask
  the administrator to clear it from the Cloudflare cache.
- **Drafts and approval.** Pages, news posts and teachings have **Save draft** and **Publish**.
  Translators can only save drafts. Teachings are published by a clergy member (approval is
  recorded automatically); a change by anyone else needs approving again.

### Add an event (Collections → Events)

1. **Create new.** Enter the **Title** (Amharic), choose the **Type**: weekly service, monthly feast,
   annual feast, fast, special event or notice. The type decides where it is listed: weekly services
   on *Service times*, monthly feasts on *Monthly feasts*, annual feasts and fasts on *Annual feasts*,
   and everything on the calendar.
2. **Start** and **End** (date and time, Stockholm). For a feast day or a fast without times, tick
   **All day**; a fast that lasts weeks has its last day as **End**.
3. **Repeats:**
   - *Does not repeat* — one date (Fasika and other movable feasts: one event per year).
   - *Every week (same weekday)* — e.g. Sunday Kidase: start on the first Sunday at 08:00, end
     11:30. The time stays 08:00 in summer and winter.
   - *Every Ethiopian month (same day)* — e.g. Medhanealem on the 27th. The Ethiopian day is taken
     from the start date; check it in the field that appears.
   - *Every Ethiopian year (same month and day)* — fixed feasts such as Timket (Tir 11) or Meskel.
   - **Repeat until** (optional) ends a series.
4. **Location** only if it isn't the usual place (the default comes from Site settings);
   **Livestream link** if this event is streamed; **Description** for a short note.
5. **Featured** (right-hand side) puts it among the holy days on the home page.
6. **Save.** Then switch **Locale** to English and translate the title and description.

**One Sunday is different** (no Kidase, a different time, a guest preacher): open the series, go to
**Changes to single dates → Add**, pick the **date**, and choose *Cancel this date*, *Move this
date* (enter the **New start** and, if needed, **New end**) or *Add a notice for this date*. Add a
**note** explaining it (translate it too). The rest of the series is untouched. A cancelled date
stays on the calendar, struck through, with the note.

**The whole series stops:** tick **Cancelled** (right-hand side) — every date shows as cancelled —
or set **Repeat until**. Delete an event only if it was entered by mistake.

### Add an announcement (Collections → Announcements)

1. **Create new.** **Title** and **Body** in Amharic (then English via **Locale**).
2. **Show from** — when it appears (now by default). **Hide after** — when it disappears by itself;
   leave empty to keep it until you remove it.
3. **Urgent** puts it in the gold bar at the top of **every page** while it is shown — for
   cancellations and changes people must not miss. Remove the tick (or let it expire) afterwards.
4. **Pinned** keeps it as the announcement on the home page even when newer ones arrive.
5. **Save.**

### Add a photo gallery (Media, then Collections → Galleries)

1. **Upload the photos** in **Media → Create new** (or several at once with bulk upload): for each
   one, **alt** text (Amharic, then English), optional **caption** and **credit**, and **Permission
   to publish** only when the church has permission. JPEG, PNG, WebP or AVIF; no SVG.
2. **Galleries → Create new:** **Title**, **Slug** (the address: `timket-2027` →
   `/media/galleries/timket-2027`; lower-case letters, digits and hyphens), **Date**, optional
   **Description**, then add the photos under **Images**.
3. Tick **Published** (right-hand side) and **Save**. A gallery can only be published when at least
   one of its photos has permission; photos without it stay hidden. The newest gallery also appears
   on the home page.
4. Translate the title and description via **Locale**.

Photos from Facebook or a phone can be imported in one go by the administrator (see *Importing
photos* above); they arrive unticked in the gallery "ፎቶዎች / Photos" for review.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| App container restarts, logs say `Missing required environment variable X` | Add `X` to the env file (see `.env.production.example`) and `up -d` again. |
| Contact form always says the spam check hasn't finished | `TURNSTILE_SECRET_KEY` missing or wrong in production, or the site key's domain list in Cloudflare doesn't include the site. |
| No email about new contact messages | Check Site settings → Office notification emails, `RESEND_API_KEY`, and the app log (`Contact form: office email failed`). The message itself is in Requests → Inquiries. |
| `/api/health` returns 503 | The app can't reach Postgres: `docker compose -f docker-compose.prod.yml ps`, check `postgres` is healthy and `POSTGRES_*` match. |
| Caddy can't get a certificate | DNS doesn't point at the server yet, port 80/443 is blocked, or Cloudflare proxy is on before the first certificate (set "DNS only" first). |
| Header/footer changes don't show | Pages are cached for 5 minutes; saving in /admin refreshes them immediately. Changes made by scripts (`seed:base`) appear within 5 minutes, or restart the app. |
| Unknown file paths like `/robots.txt` redirect to `/am/...` | A file was added to `public/` or a new file route without adding it to the middleware skip list in `src/middleware.ts`. |
| `pnpm test` fails with connection errors | Local Postgres isn't running: `pnpm services:up`. |
| Dev server shows stale header data after a script changed globals | Restart `pnpm dev` (the 5-minute cache only clears on admin saves). |
| Backup script: `gpg: command not found` | Install GnuPG (`sudo apt install gnupg`). On Windows run the script from Git Bash. |
