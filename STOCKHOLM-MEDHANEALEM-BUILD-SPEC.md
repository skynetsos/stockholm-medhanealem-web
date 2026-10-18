# Stockholm Medhanealem Church Website — Claude Code Build Specification

**Project:** Debre Selam Menbere Papasat Medhanealem Ethiopian Orthodox Tewahedo Church, Stockholm
**Domain:** medhanealem.se (existing WordPress dev site stays live until cut-over)
**Reference model:** denvermedhanealem.org (structure + baptism journey). Never copy its text, images, times, clergy or contacts.
**Companion document:** Website Research & Build Proposal v2.0 (docx)
**Version:** 1.0 — 18 Oct 2026

This file is written to be dropped into the repo root and read by Claude Code. Work **one phase at a time**. Do not start a phase until the previous phase's exit checklist is fully green and the church has reviewed the result.

---

## 0. How to use this spec with Claude Code

1. Create the repo: `stockholm-medhanealem-web`. Put this file at the root and copy the `CLAUDE.md` block below into `CLAUDE.md`.
2. Open Claude Code in the repo. For each phase, paste the **"Prompt for Claude Code"** block of that phase, then work through the task list. Ask Claude Code to finish each task with a commit and to run the phase exit checklist.
3. Keep `docs/DECISIONS.md` — every open question Claude Code hits goes there with a proposed default, so the church committee can answer in batches.

### CLAUDE.md (copy into repo root)

```markdown
# Stockholm Medhanealem Website

Read STOCKHOLM-MEDHANEALEM-BUILD-SPEC.md before any work. Follow the current phase only.

## Stack
- Next.js 15 (App Router, TypeScript, strict), Tailwind CSS, next-intl
- Payload CMS 3 embedded in this app at /admin (Postgres adapter, Lexical rich text)
- PostgreSQL 16, pnpm, Docker Compose for local dev
- Email: Resend. Storage: S3-compatible (EU). Error tracking: Sentry.

## Rules
- Locales: am (default), en, sv. All CMS text fields are localized. UI strings live in /messages/{locale}.json.
- Never hardcode Ethiopic or English copy in components; use next-intl keys or CMS content.
- Timezone everywhere: Europe/Stockholm. Store UTC, display local.
- Request records (baptism, inquiries) are PRIVATE: enforced in Payload access control, never exposed via REST/GraphQL to the public, never server-rendered into public pages.
- No placeholder content on public pages. If content is missing, hide the section.
- Accessibility: WCAG 2.2 AA. Every image has alt. Every form field has a label.
- Commit after each task. Run `pnpm lint && pnpm typecheck && pnpm test` before committing.
- Do NOT add dependencies beyond the stack without writing the reason in docs/DECISIONS.md.
- Ethiopic fonts: Noto Sans Ethiopic (self-hosted), fallback Abyssinica SIL, sans-serif.
```

---

## 1. Architecture summary

```
┌─────────────────────────────────────────────────────────┐
│ Next.js 15 app (single repo, single deployment)          │
│                                                          │
│  /[locale]/...          Public site (RSC, ISR/SSG)       │
│  /admin                 Payload CMS admin UI             │
│  /api/...               Payload REST (public read only   │
│                         for public collections)          │
│  /api/requests/*        Custom server actions for forms  │
│                                                          │
│  Payload collections ─── PostgreSQL 16 (EU)              │
│  Media uploads      ─── S3-compatible bucket (EU)        │
│  Email              ─── Resend                           │
└─────────────────────────────────────────────────────────┘
          │ Cloudflare (DNS, TLS, WAF, rate limit)
```

**Why embedded Payload:** one codebase, built-in auth/roles, localized fields, drafts/versions, access control and admin UI, so the baptism case workflow needs no plugin and no second service.

### 1.1 Repo layout

```
/
├── CLAUDE.md
├── STOCKHOLM-MEDHANEALEM-BUILD-SPEC.md
├── docs/ (DECISIONS.md, RUNBOOK.md, CONTENT-CHECKLIST.md)
├── docker-compose.yml           # postgres, minio (local S3), mailpit (local email)
├── Dockerfile
├── .github/workflows/ci.yml
├── src/
│   ├── app/
│   │   ├── (frontend)/[locale]/            # public routes
│   │   │   ├── layout.tsx, page.tsx
│   │   │   ├── our-church/… our-faith/… worship/… sunday-school/…
│   │   │   ├── sacraments/baptism/ (page + request)
│   │   │   ├── news/… media/… visit/… support/…
│   │   │   └── [slug]/                     # generic CMS page
│   │   ├── (payload)/admin/[[...segments]] # Payload admin
│   │   ├── (payload)/api/[...slug]
│   │   ├── sitemap.ts, robots.ts
│   │   └── api/ical/route.ts
│   ├── collections/   # Payload collections (see §2)
│   ├── globals/       # SiteSettings, Navigation, Footer
│   ├── access/        # role helpers
│   ├── components/    # ui/, blocks/, forms/, layout/
│   ├── lib/           # i18n, ethiopian-calendar, email, rate-limit, validation (zod)
│   ├── messages/      # am.json en.json sv.json
│   ├── styles/
│   └── payload.config.ts
├── scripts/migrate-wordpress.ts
└── tests/ (unit: vitest, e2e: playwright)
```

---

## 2. Data model (Payload collections & globals)

All `text`/`richText` fields are `localized: true` unless marked otherwise. Every collection has `createdAt/updatedAt` (automatic).

### 2.1 Users (auth-enabled)
| Field | Type | Notes |
|---|---|---|
| email, password | auth | MFA via TOTP (Phase 0, see §3) |
| name | text | not localized |
| roles | select[] | `super_admin`, `clergy_approver`, `office_coordinator`, `editor`, `translator`, `finance` |
| locales | select[] | for translators: which locales they may edit |
| active | checkbox | |

### 2.2 Pages
`title`, `slug` (unique per locale), `hero` (image, heading, subheading, CTAs[]), `layout` (blocks: RichText, TwoColumn, ImageGallery, CallToAction, FAQ, ClergyGrid, EventList, VideoEmbed), `seo` (title, description, ogImage), `section` (select: our-church, our-faith, sunday-school, worship, support, visit, other), `_status` (draft/published, versions on).

### 2.3 Teachings (ትምህርቶች)
`title`, `slug`, `category` (select: christening, marriage, fitihat, mysteries, sacraments, fasting, prayers, faq), `body` (richText), `approvedBy` (relation Users, clergy only), `approvedAt`. Publish blocked unless `approvedBy` set (hook).

### 2.4 Events (calendar)
| Field | Type | Notes |
|---|---|---|
| title, description | localized | |
| type | select | `weekly_service`, `monthly_feast`, `annual_feast`, `fast`, `special`, `notice` |
| start, end | date (UTC) | input in Europe/Stockholm |
| allDay | checkbox | |
| recurrence | group | `none` / `weekly` (weekday) / `monthly` (Ethiopian calendar day 1–30) / `yearly` (Ethiopian month+day) |
| ethiopianDate | computed text | shown alongside Gregorian |
| location | text | default from SiteSettings |
| livestreamUrl | text | optional |
| cancelled | checkbox | shows strike-through + notice |
| featured | checkbox | homepage |

### 2.5 Announcements
`title`, `body`, `publishAt`, `expiresAt`, `urgent` (checkbox → top bar), `pinned`.

### 2.6 Clergy
`name`, `title` (Abune/Melake/Kesis/Deacon…), `bio`, `photo` (required for publish), `order`, `published` (checkbox). Hook: cannot publish without photo + bio in default locale.

### 2.7 Departments (Sunday School)
`name`, `slug`, `summary`, `body`, `leaderName` (optional), `image`, `order`. Seed: education, children, mezmur, it, property, communications.

### 2.8 Media (upload)
`alt` (localized, required), `caption`, `credit`, `permissionObtained` (checkbox, required true for images shown publicly), `containsMinors` (checkbox → requires `permissionObtained`), sizes: thumbnail 400, card 800, hero 1600, og 1200×630. Storage: S3 plugin.

### 2.9 Galleries
`title`, `date`, `images` (relation Media[]), `published`.

### 2.10 Videos / Audio
`title`, `kind` (video/audio), `provider` (youtube/vimeo/file), `url` or `file`, `date`, `category` (sermon/liturgy/event/sunday-school), `consentRequired` (default true → click-to-load embed).

### 2.11 Posts (news/articles)
`title`, `slug`, `excerpt`, `body`, `coverImage`, `author` (relation), `publishedAt`, `_status`.

### 2.12 BaptismRequests  — PRIVATE
| Field | Type | Notes |
|---|---|---|
| reference | text, unique | `BAP-YYYY-NNNN`, generated on create |
| status | select | `new`, `info_needed`, `clergy_review`, `scheduling`, `confirmed`, `completed`, `declined` |
| applicant | group | name, email, phone, preferredLocale, parishRelationship (member/regular/new) |
| candidate | group | fullName, dateOfBirth, category (infant/child/adult) |
| guardian | group | name, relationship, consentConfirmed (bool) — required when category ≠ adult |
| preferredPeriod | text | e.g. "December 2026" |
| notes | textarea | applicant notes |
| internal | group | assignedTo (Users), scheduledDate, officeNotes (richText), clergyDecision (approve/decline/needs_prep), clergyNotes |
| privacyAccepted | checkbox | required |
| source | group | ip hash, userAgent, submittedAt |
| archivedAt | date | set by retention job |

Access: `read/update` → `super_admin`, `office_coordinator`, `clergy_approver`. `create` → public **only via server action** (REST create disabled). `delete` → super_admin.

### 2.13 CaseEvents (audit log) — PRIVATE
`request` (relation BaptismRequests | Inquiries), `actor` (Users or "system"), `action` (created/status_changed/note_added/email_sent/assigned), `from`, `to`, `note`, `at`. Immutable (no update/delete except super_admin).

### 2.14 Inquiries — PRIVATE
`type` (contact/pastoral/marriage/sunday_school/volunteer/funeral), `reference` (`INQ-YYYY-NNNN`), `status` (new/in_progress/closed), `name`, `email`, `phone`, `message`, `childName`/`childAge` (sunday_school only), `interests[]`/`availability` (volunteer only), `assignedTo`, `privacyAccepted`.

### 2.15 Globals
- **SiteSettings:** churchName (localized), shortName, logo, address, mapUrl, transitNotes, officeEmail, phone (office only), socialLinks[], livestreamUrl, defaultLocation, retentionMonthsBaptism (default 24), officeNotificationEmails[].
- **Navigation:** header items (label localized, link to page/external, children[]), header CTAs.
- **Footer:** columns, diocese link (eotc-nordics.org), legal links (privacy, cookies).
- **Homepage:** hero, featuredEventIds, sections order toggles.

---

## 3. Roles & access matrix

| Collection | super_admin | clergy_approver | office_coordinator | editor | translator | finance | public |
|---|---|---|---|---|---|---|---|
| Pages, Posts, Events, Announcements, Galleries, Videos, Departments | CRUD | R + approve Teachings | R | CRUD | U (own locales) | – | R (published) |
| Teachings | CRUD | CRUD + approve | R | CRU (no publish) | U (own locales) | – | R (published) |
| Clergy | CRUD | CRUD | R | CRU | U | – | R (published) |
| Media | CRUD | CRUD | CRUD | CRUD | R | – | R |
| BaptismRequests | CRUD | RU | RU | – | – | – | create via action only |
| Inquiries | CRUD | R | RU | – | – | – | create via action only |
| CaseEvents | R | R | R | – | – | – | – |
| Users | CRUD | – | – | – | – | – | – |
| Globals | CRUD | R | R | U (Navigation, Footer, Homepage) | – | – | R |

MFA (TOTP) required for `super_admin`, `clergy_approver`, `office_coordinator`.

---

## 4. Public routes

| Route (`/{locale}/…`) | Source | Render |
|---|---|---|
| `/` | Homepage global + Events + Announcements + Galleries | ISR 5 min |
| `/our-church`, `/our-church/history`, `/our-church/clergy`, `/our-church/leadership`, `/our-church/diocese` | Pages, Clergy | ISR |
| `/our-faith`, `/our-faith/[slug]` | Teachings (mysteries, sacraments, fasting, prayers, faq) | ISR |
| `/worship`, `/worship/weekly`, `/worship/monthly-feasts`, `/worship/annual-feasts`, `/worship/calendar`, `/worship/livestream` | Events | ISR 5 min / calendar client-side month view |
| `/sunday-school`, `/sunday-school/[department]` | Departments | ISR |
| `/sacraments`, `/sacraments/baptism`, `/sacraments/baptism/request`, `/sacraments/marriage`, `/sacraments/fitihat` | Teachings + forms | dynamic for forms |
| `/news`, `/news/[slug]`, `/media`, `/media/galleries/[slug]`, `/media/videos` | Posts, Galleries, Videos | ISR |
| `/support`, `/support/volunteer` | Pages + form | |
| `/visit` (contact form, map, transit) | SiteSettings + Inquiries action | dynamic |
| `/privacy`, `/cookies` | Pages | SSG |
| `/[slug]` | generic Page | ISR |
| `/api/ical` | Events → .ics | cached 1 h |

---

## 5. Design system

- **Palette (confirm with committee):** deep green `#0B3D2E`, gold `#C8A24A`, cream `#F8F4EA`, ink `#1A1A1A`, muted `#6B6B6B`, error `#B42318`. Dark-mode not required at launch.
- **Type:** Headings — Noto Serif Ethiopic for Amharic / Fraunces or Source Serif for Latin; body — Noto Sans Ethiopic / Inter. Self-host via `next/font/local`. Line-height 1.7 for Amharic body.
- **Components:** Header (logo, nav, locale switch, 2 CTAs), AnnouncementBar, Hero, NextServiceBar, EventCard, EventCalendar (month grid), TeachingCard, ClergyCard, DepartmentCard, GalleryGrid (lightbox), VideoEmbed (consent click-to-load), Form primitives (Input, Select, Checkbox, Fieldset, ErrorSummary), StatusBadge, Footer.
- **Layout:** max-width 1200px, 12-col grid, mobile-first, 360px minimum. Touch targets ≥ 44px.
- Keep imagery real (church photos). No stock images of other churches.

---

## 6. Phases

Each phase: **Goal → Prompt for Claude Code → Tasks → Exit checklist**.

---

### PHASE 0 — Foundation (≈1 week)

**Goal:** a deployable skeleton with CMS, auth, roles, i18n and CI, running on staging.

**Prompt for Claude Code**
> Read CLAUDE.md and STOCKHOLM-MEDHANEALEM-BUILD-SPEC.md. We are in Phase 0. Scaffold the project exactly as §1.1, implement the Users collection with roles and MFA, i18n routing for am/en/sv with next-intl, Docker Compose for local dev, CI, and a placeholder localized home page. Work through the Phase 0 task list in order, committing after each task, and finish by running the Phase 0 exit checklist and reporting results.

**Tasks**
1. `pnpm create next-app` (TS, App Router, Tailwind, ESLint) → add Payload 3 via `pnpm create payload-app` merge or manual install (`payload`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `@payloadcms/storage-s3`).
2. `docker-compose.yml`: postgres:16, minio, mailpit. `.env.example` with all keys documented.
3. `payload.config.ts`: localization `{ locales: ['am','en','sv'], defaultLocale: 'am', fallback: true }`, Postgres adapter, S3 adapter, Lexical editor, `serverURL` from env.
4. Users collection per §2.1 + `src/access/*.ts` helpers (`isSuperAdmin`, `hasRole`, `isSelf`). Add TOTP MFA (e.g. `otplib`, custom admin login step) for privileged roles.
5. next-intl: `src/i18n/routing.ts` (`localePrefix: 'always'`), middleware, `messages/{am,en,sv}.json` with header/footer/common strings.
6. Fonts: self-host Noto Sans Ethiopic + Noto Serif Ethiopic + Inter; Tailwind tokens for palette and type scale.
7. Base layout: Header (logo placeholder from SiteSettings, locale switcher, nav from Navigation global), Footer. Placeholder home page showing `t('welcome')` in all three locales.
8. Globals: SiteSettings, Navigation, Footer (fields per §2.15), seed script `pnpm seed:base`.
9. CI (`.github/workflows/ci.yml`): install, lint, typecheck, vitest, build. Playwright smoke test: home renders in am/en/sv, `/admin` loads.
10. `Dockerfile` (multi-stage, standalone output), `docs/RUNBOOK.md` with local setup, env vars, deploy steps.
11. Deploy to staging (Hetzner VPS with Docker + Caddy/Traefik **or** Vercel EU + Neon/Supabase EU) → `staging.medhanealem.se` behind Cloudflare; create first super_admin.
12. Sentry + uptime check.

**Exit checklist**
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass in CI
- [ ] Staging URL serves `/am`, `/en`, `/sv` with correct `<html lang>` and `hreflang`
- [ ] Admin login works; MFA enforced for super_admin
- [ ] Ethiopic text renders correctly on Android Chrome and iOS Safari (screenshot in PR)
- [ ] Postgres backup job configured (daily, encrypted, off-server) and one restore tested
- [ ] `docs/RUNBOOK.md` complete; `.env.example` complete

---

### PHASE 1 — Public site & content migration (≈3–4 weeks)

**Goal:** every public page live on staging in Amharic and English, calendar working, Stockholm WordPress content migrated, contact form delivering.

**Prompt for Claude Code**
> We are in Phase 1. Implement all public collections (§2.2–2.11), globals, the public routes in §4 except the Sacraments forms, the design system in §5, the calendar with Ethiopian date support, the WordPress migration script, SEO and accessibility. Commit per task. Finish with the Phase 1 exit checklist.

**Tasks**
1. Collections: Pages (with blocks), Teachings (with clergy-approval hook), Events, Announcements, Clergy (publish guard), Departments (seed six), Media (permission flags + sizes), Galleries, Videos, Posts. Versions/drafts on Pages, Teachings, Posts.
2. `src/lib/ethiopian-calendar.ts`: Gregorian ⇄ Ethiopian conversion (Julian Day based; handle leap year rule, Pagume 5/6). Unit tests with known dates (Enkutatash 11/12 Sep, Genna 7 Jan, Timket 19/20 Jan, Fasika from Alexandrian computus for 2026–2030).
3. Events recurrence expansion service: given a date range, expand weekly/monthly(Ethiopian day)/yearly(Ethiopian month+day) rules into occurrences in Europe/Stockholm, respecting `cancelled` overrides. Tests across DST transitions (last Sunday March/October).
4. Homepage: AnnouncementBar (urgent, unexpired), Hero, NextServiceBar (next occurrence from Events), UpcomingHolyDays (3–5), LatestNotice, AboutTeaser, SundaySchoolTeaser, GalleryTeaser, VisitUs. Each section hidden if no content.
5. Our Church pages, Clergy grid, Our Faith index + Teaching pages, Worship pages + month-view calendar (client component, keyboard navigable) + `/api/ical`, Sunday School index + department pages, News list/detail, Media galleries (lightbox) and videos (consent-gated embed), Visit page with map (static image or consent-loaded embed), transit notes, contact form.
6. Contact form: server action + zod validation, honeypot + Cloudflare Turnstile, rate limit (IP-hash, 5/10min), stores Inquiry(type=contact), emails office via Resend, success/error states, no sensitive echo in email.
7. `scripts/migrate-wordpress.ts`: read WordPress WXR export of dev.medhanealem.se → map Teachings (ክርስትና→christening, ጋብቻ→marriage, ፍትሃት→fitihat, feasts→Events, ሣምንታዊ አገልግሎት→weekly Events), Sunday School departments → Departments, Videos → Videos, About → Pages. Import media to S3 with `permissionObtained=false` (editors review). Idempotent (match on `wpId`).
8. SEO: metadata per page, `generateMetadata` with locale alternates, sitemap.ts (all locales), robots.ts (staging = noindex), OG images, JSON-LD `Church` + `Event`.
9. Accessibility pass: skip link, focus styles, landmark roles, form labels/errors (`aria-describedby`), color contrast ≥ 4.5:1, reduced-motion respected. Run axe in Playwright on key pages.
10. Performance: `next/image`, font preload, ISR; Lighthouse CI on home, calendar, a teaching page.
11. `docs/CONTENT-CHECKLIST.md`: list of pages with am/en status and owner for the church to fill.
12. Editor training notes in RUNBOOK (how to add event, announcement, gallery).

**Exit checklist**
- [ ] All routes in §4 (except sacrament forms) render on staging with real migrated content
- [ ] Calendar shows Sunday Kidase 08:00–11:30 weekly and at least one annual feast with Ethiopian date; correct across DST
- [ ] Contact form delivers to office mailbox; spam test blocked; rate limit works
- [ ] Lighthouse ≥ 90 (performance, accessibility, SEO) on home, calendar, baptism guidance page, mobile
- [ ] axe: 0 serious/critical issues on all templates
- [ ] Locale switch keeps the user on the equivalent page; fallback to am when en missing is visible to editors, not broken for users
- [ ] No placeholder or "lorem" content anywhere; hidden sections verified
- [ ] Church committee has reviewed every page (sign-off recorded in CONTENT-CHECKLIST.md)

---

### PHASE 2 — Baptism request & case workflow (≈3–4 weeks)

**Goal:** the priority feature — public baptism guidance + request form, private case management with roles, statuses, audit log and notifications; Sunday School and marriage inquiries.

**Prompt for Claude Code**
> We are in Phase 2. Implement BaptismRequests, CaseEvents and Inquiries exactly as §2.12–2.14 and §3, the public baptism guidance page and multi-step request form, the staff case dashboard inside the Payload admin, status workflow with audit log, email notifications, retention job and GDPR notices. Public creation must go through a server action only. Commit per task. Finish with the Phase 2 exit checklist.

**Tasks**
1. Collections BaptismRequests, CaseEvents, Inquiries with access control; disable REST/GraphQL `create` for public; `reference` generator with yearly sequence (Postgres sequence or transaction).
2. Status machine (`src/lib/baptism/state.ts`): allowed transitions
   - `new → info_needed | clergy_review | declined`
   - `info_needed → clergy_review | declined`
   - `clergy_review → scheduling | info_needed | declined` (clergy_approver only)
   - `scheduling → confirmed | info_needed`
   - `confirmed → completed | scheduling`
   - terminal: `completed`, `declined`
   Hook on update validates transition and role, writes CaseEvent.
3. Public `/sacraments/baptism`: guidance from Teachings(category=christening) + requirements checklist block + "A request does not confirm a date" notice + CTA.
4. Public `/sacraments/baptism/request`: 3-step form (Applicant → Candidate & guardian → Review & consent), zod schemas per step, client validation + server re-validation, Turnstile, rate limit (3/hour/IP-hash), privacy notice text from a Page, success page with reference number. No file uploads. Guardian step shown when candidate category ≠ adult.
5. Emails (Resend, templates in am/en by `preferredLocale`): applicant acknowledgement (reference, what happens next, office contact; no personal data echoed beyond reference), office notification (link to admin), applicant notification on `confirmed` (date/time/location) and `declined` (neutral text + contact). Log each as CaseEvent `email_sent`.
6. Admin UX: custom Payload admin views — Case list with status filter, assignee, age; Case detail with timeline (CaseEvents), status action buttons (only valid transitions for the user's role), internal notes, schedule picker (Europe/Stockholm). Dashboard widget: counts by status.
7. Inquiries: Sunday School interest form (`/sunday-school/join`), marriage inquiry (`/sacraments/marriage`), fitihat contact (`/sacraments/fitihat`) — same pattern (action, validation, rate limit, office email, admin list).
8. Retention job (`/api/cron/retention`, protected by secret, scheduled daily): archive `completed/declined` cases older than `retentionMonthsBaptism`; archived = personal fields nulled, reference + status + dates kept. Document in RUNBOOK; ensure legal review decides the number.
9. Data subject requests: admin action "Export case as JSON" and "Erase case" (super_admin, writes CaseEvent).
10. Security: CSRF on actions, strict CSP, security headers (helmet-equivalent in next.config), dependency audit in CI, admin route rate limiting, session timeout 8h for privileged roles.
11. Tests: unit (state machine, zod schemas, reference generator), integration (access control per role — editor cannot read a case via REST, GraphQL, or server component), e2e (full journey with dummy data).

**Exit checklist**
- [ ] End-to-end on staging with dummy data: submit → acknowledgement email → office sets `clergy_review` → clergy sets `scheduling` → office `confirmed` → applicant email → `completed`
- [ ] Editor and translator accounts cannot see any request record by any path (test evidence attached)
- [ ] Every status change appears in the audit timeline with actor and time
- [ ] Rate limiting and Turnstile verified; honeypot caught
- [ ] Privacy notice (am/en) approved by committee; legal review ticket closed or explicitly deferred by committee
- [ ] Retention job dry-run output reviewed
- [ ] Office Coordinator and Clergy Approver each completed a 30-minute walkthrough and signed off

---

### PHASE 3 — Swedish locale, media & polish (≈2–3 weeks)

**Goal:** Swedish public content, richer media, livestream, volunteer form, search.

**Prompt for Claude Code**
> We are in Phase 3. Enable the sv locale for public rendering, add translator workflow aids, build the media library pages, livestream page, volunteer form, site search and the remaining polish items. Commit per task; finish with the Phase 3 exit checklist.

**Tasks**
1. Translation workflow: admin "Missing translations" view per collection; translator role scoped to `locales`; publishing a Page in a locale requires that locale's title+body present.
2. Enable `sv` in public locale switcher once ≥ 80% of core pages are translated (flag in SiteSettings).
3. Media: `/media/videos` with filters, audio player for sermons, galleries by year; bulk upload with alt/caption required; "containsMinors" enforcement.
4. `/worship/livestream`: consent-gated YouTube/Facebook embed from SiteSettings; shows next service time when offline.
5. Volunteer form → Inquiries(type=volunteer).
6. Search: Postgres full-text (`tsvector`) over Pages, Teachings, Posts, Events per locale; `/search?q=`; Ethiopic tokenisation sanity-tested.
7. Announcement email digest (optional): weekly summary to subscribed members — only if committee approves; double opt-in.
8. Polish: 404/500 pages localized, print styles for calendar, PWA manifest + icons, analytics via privacy-friendly Plausible/Umami (no cookies) if desired.

**Exit checklist**
- [ ] Swedish reviewer sign-off on core pages
- [ ] Livestream page tested live on a Sunday
- [ ] Search returns relevant results in am and en for 10 sample queries
- [ ] All forms audited again for accessibility

---

### PHASE 4 — Optional: giving, membership, hall booking (≈2–4 weeks, only if approved)

**Tasks (outline)**
1. Donations page: Swish number/QR and Bankgiro from SiteSettings (no card handling); optional Stripe/PSP hosted checkout with webhook → `Donations` collection (finance role).
2. Membership: `Members` collection (private), annual pledge, renewal reminders; strict data minimisation; separate legal review.
3. Hall booking: `BookingRequests` with calendar conflict check, rules page, status workflow reusing the case pattern.
4. Reports: CSV export for finance; monthly summary.

**Exit:** treasurer and committee approval; reconciliation tested.

---

## 7. Cut-over & launch runbook (end of Phase 2 or 3)

1. Freeze WordPress content; final migration run; church verifies.
2. Set `robots` to index; submit sitemap to Google Search Console (all locales).
3. 301 map from old WordPress URLs (Amharic slugs) to new routes (`src/lib/redirects.ts`), tested.
4. DNS: point medhanealem.se to production via Cloudflare; keep `dev.` as archive for 90 days then retire.
5. Post-launch: monitor Sentry/uptime 7 days; backup restore drill; hand over credentials (password manager), runbook, training recording.

---

## 8. Security & privacy baseline (applies to every phase)

- TLS everywhere; HSTS; CSP with nonces; no third-party scripts without consent.
- Secrets in env/secret manager only; rotate on handover.
- Privileged roles: MFA, 8h sessions, login alerts.
- Public forms: server-side validation, Turnstile, honeypot, per-IP rate limits, size limits, no uploads in Phases 1–3.
- Private collections never queried in public server components; verified by integration tests.
- GDPR: privacy notice, lawful basis documented (explicit consent for Art. 9 religious data + children), processor list (hosting, email, storage — all EU/EEA or SCC), retention, DSAR process.
- Backups: daily encrypted, 30-day retention, quarterly restore drill.
- Dependency updates monthly; `pnpm audit` in CI.

---

## 9. Testing strategy

| Layer | Tool | Coverage |
|---|---|---|
| Unit | Vitest | Ethiopian calendar, recurrence expansion, state machine, zod schemas, reference generator |
| Integration | Vitest + Payload local API | Access control per role on every private collection |
| E2E | Playwright | Locale switching, calendar, contact form, full baptism journey, admin status transitions |
| Accessibility | axe-playwright | All templates |
| Performance | Lighthouse CI | Home, calendar, baptism, teaching page (mobile) |

---

## 10. Open decisions (default applied until the committee answers)

| # | Question | Default used |
|---|---|---|
| 1 | Canonical names in am/en/sv | Use names on dev.medhanealem.se; en per proposal title |
| 2 | Palette | Deep green / gold / cream |
| 3 | Hosting | Hetzner EU VPS + Docker + Cloudflare |
| 4 | Email provider | Resend |
| 5 | Retention for baptism cases | 24 months after completion |
| 6 | Who is Office Coordinator / Clergy Approver | To be named before Phase 2 ends |
| 7 | Swedish reviewer | To be named before Phase 3 |
| 8 | Donations / hall booking | Not built unless approved (Phase 4) |
| 9 | Livestream platform | YouTube, consent-gated |
| 10 | Analytics | None until approved; if yes, cookieless Plausible |
