# Review decisions (2026-11-16)

Written by the decider role (Role 3) of the completeness review. One verdict per finding in REVIEW-FINDINGS.md, from the plan in REVIEW-PLAN.md.

**Verdicts:**
- **Fix now:** the builder (Role 4) does it in this pass, in the order below.
- **Defer:** valid, but belongs to a later step; the reason is given.
- **Reject:** not a defect, or not ours to change; the reason is given.

Anything that needs a church decision goes to CONTENT-CHECKLIST.md ("For the church" below), not into code.

**Church content import** (the request's first build step): **already done** on 2026-11-14 (D-045, Amharic word for word) and D-046 (English draft). The reviewer confirmed all 13 content blocks verbatim on their pages, in both languages (REVIEW-FINDINGS, "Checked and found OK"). In this pass it is only re-run after the importer fixes below.

## Order of work

| # | Finding | Verdict | What is done |
|---|---|---|---|
| 1 | F-04 12-hour clock | **Fix now** | Times on a 24-hour clock in every language (`hourCycle: "h23"`): 08:00–11:30, 18:00. The church writes "18:00, Swedish time" to avoid confusion with the Ethiopian clock. |
| 2 | F-02 menu and footer links to 404s | **Fix now** | The header and footer hide an internal link whose page has no content (the same "available addresses" list the 404s use), so `/news`, `/privacy` and `/cookies` vanish until published. The menu item comes back once there is a news post. Pointing "News & Media" at `/media` instead is a menu-text change for the church (CONTENT-CHECKLIST). |
| 3 | F-01 "Request Baptism" with no way to request | **Fix now** | While requests are closed, header buttons pointing at the baptism request are hidden. On the baptism page, the closed state says so and links to the office contact (`/visit`). Wording is new interface text, flagged for review. |
| 4 | F-03 forms without a privacy notice | **Fix now (gate)** + church | **In production** the inquiry forms are not shown until `/privacy` is published; in development they stay, so the committee can try them. The Sunday School consent now covers the child's name and age (new text, flagged for review). The privacy notices themselves are church and legal work (CONTENT-CHECKLIST item 7). |
| 5 | F-15 clergy page with only a heading | **Fix now** | `/our-church/clergy` exists only when a clergy profile is published, like every other content page. |
| 6 | F-17 Swedish in hreflang; `/support` missing from the sitemap | **Fix now** | hreflang lists only the publicly enabled languages. The sitemap includes `/support` and `/support/volunteer`. |
| 7 | F-20 heading skip on `/sacraments` | **Fix now** | The sacrament cards' titles become h2. |
| 8 | F-08 split text: orphan list items | **Fix now (links)** + church | `/sacraments` shows a card for መባዕ (offerings) too, since its list names it. `/our-church` links to `/our-faith` ("What is a church?") in "In this section". Whether the split itself is right is for the church (CONTENT-CHECKLIST). |
| 9 | F-14 near-identical worship titles | **Fix now** | The site's own list pages get distinct titles: "Weekly service times", "Monthly feast dates", "Annual feast and fast dates" (am/en/sv). The church's explanation pages keep their titles. New interface text, flagged for review. |
| 10 | F-16 homepage H1 "Welcome" | **Fix now (fallback)** + church | Without a hero heading, the H1 is the church's name from Site settings, not "Welcome". The real heading, subheading and meta descriptions are church text (checklist item 25). |
| 11 | F-06 Sunday School lists lost their headings | **Fix now** | The converter keeps accordion titles (`<button>`) as H2 and turns line breaks inside list items into spaces. Re-imported; the English mirrors the structure (2 aims, then the 3-point plan). Whether the April 2024 two-year plan is current goes to the church. |
| 12 | F-05 Genna, Easter and fasts missing | **Fix now** | Genna and the movable feasts and fasts of the coming church year are entered as all-day, one-time events, computed from the site's tested Ethiopian calendar and Fasika functions: Tsome Nebiyat, Genna, Abiy Tsom, Hosanna, Siklet, Fasika, Erget. They are flagged "office to confirm and add times", and from then on entered per year by the office. |
| 13 | F-19 iCal noise and the fast's length | **Fix now** | "Notice" events (the counselling hours) stay in the site calendar but are left out of the iCal feed. Filseta becomes a 16-day fast (Nehase 1–16). The Wed/Fri end time is a church fact. |
| 14 | F-18 Turnstile language and cleanup | **Fix now** | Amharic pages ask Turnstile for its automatic language (it has no Amharic). The widget is removed when the form unmounts. |
| 15 | F-22 an Amharic word searched on English pages | **Fix now** | A query written in Ethiopic letters is searched in the Amharic text, whatever the page language. Ranking is unchanged (the teaching is found; it has no "ጥምቀት" in its title). |
| 16 | F-21 English draft points | **Fix now (two)** + church | "Sabbath" for Sunday becomes "Sunday" / "Sundays" (the Amharic means the Christian Sunday). "Rågsved" becomes "Rågsved centrum". The ambiguous sentence about Melake Hiwot Kesis Getu and the impossible dates in the history (also in the Amharic) go to the church. |
| 17 | F-24 placeholder approver active | **Fix now** | After publishing for review, the placeholder approver account is deactivated, so it can never approve anything else. The production refusal stays. Fixture users exist only in the `_e2e` database (guarded); the risk is accepted. |
| 18 | F-25 GraphQL introspection, admin title | **Fix now** | Introspection is off in production, and the admin pages get a title suffix. `/api/access` and `/api/users/init` are standard Payload endpoints that show no private data; accepted. |
| 19 | F-12 no login alerts | **Fix now** | A privileged account (super admin, clergy approver, office coordinator) gets an email on each sign-in: time (Stockholm) and browser, with "if this wasn't you, contact the administrator". Spec §8. |
| 20 | F-10 rate limits trust client headers | **Fix now** | The app reads the visitor's address only from `X-Real-IP`, which Caddy sets itself from the real connection, taking Cloudflare's header only from Cloudflare's own addresses (`trusted_proxies`). A forged `CF-Connecting-IP` from the open internet no longer gives a new limit. RUNBOOK updated. |
| 21 | F-09 messages reach nobody | **Fix now (warning)** + church | The admin dashboard shows a warning while no office notification email is set. The address itself is the church's (checklist item 12). |
| 22 | F-23 personal data in the public repository | **Fix now (two)**, Biruk decides one | The Word document's author metadata is replaced with "Stockholm Medhanealem". The text is unchanged and the conversion test still passes. The old site's Google Maps key is removed from the snapshot. **Not changed:** the email in DECISIONS (Q-003) is Biruk's own, recorded with his approval; it and the old metadata remain in git history. **Whether to make the repository private until launch is Biruk's decision** (an outward-facing change). |
| 23 | F-26 stale checklist | **Fix now** | CONTENT-CHECKLIST.md updated to the D-045 and D-046 state and this review. |
| — | F-26 301 redirect map | **Defer** | A cut-over task (spec §7, step 3): written when the domain moves, against the final old-site URL list. Noted in the RUNBOOK cut-over list. |
| — | F-26 Sentry | **Defer** | Part of the staging and production setup (Phase 0 item, already open). |
| — | F-07 "ምሥጢራት / Sacraments" title | **For the church** | The section title is theological wording: CONTENT-CHECKLIST asks the clergy for it. |
| — | F-11 the document is from 2021 | **For the church** | Every time-sensitive statement is listed in CONTENT-CHECKLIST for confirmation. |
| — | F-13 church and diocese names inconsistent | **For the church** | Canonical names (spec §10 #1) and the diocese name: CONTENT-CHECKLIST. |

## For the church (added to CONTENT-CHECKLIST.md)
- Section title for the rites (F-07).
- Confirmation of the page split (F-08).
- Time-sensitive statements in the 2021 document (F-11).
- Canonical church and diocese names (F-13).
- Whether the 2024 Sunday School plan is current (F-06).
- Times and confirmation of the computed feasts and fasts (F-05).
- Wed/Fri end time (F-19).
- English draft points (F-21).
- Office notification email (F-09).
- Homepage heading and descriptions (F-16).
- Menu text "News & Media" (F-02).
