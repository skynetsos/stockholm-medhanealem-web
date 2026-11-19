# Gap table: denvermedhanealem.org vs. our site

Compares Denver's navigation and page layouts ([STRUCTURE.md](STRUCTURE.md)) with ours as of commit
82f2003 (2026-11-19). **Nothing has been changed yet.** This is the mapping for Biruk to approve.

What we take from Denver: **menu structure, order and page layouts.**
What stays ours: content, colours (deep green / gold / cream), logo, fonts (Noto Sans Ethiopic), and the
standing rules: no placeholder content, so a menu item whose page has no content stays hidden;
private requests; WCAG 2.2 AA; three languages.

Status key:
- **exists**: we have the page; at most the menu label changes.
- **rename**: we have it under a different name or address.
- **create**: a new route is needed. With no content yet, it stays hidden (404) until the church
  writes it.
- **N/A**: not for Stockholm, or outside the approved phases. Needs a decision before anything is built.

---

## 1. Menu mapping (Denver order)

Proposed labels are English; the Amharic and Swedish labels come from the CMS (Navigation global), as now.

### 1. Home
| Denver | Ours | Status | Notes |
|---|---|---|---|
| Home `/` | `/` | exists | |

### 2. Our Church ▾ (dropdown only; Denver has no landing page)
| Denver item | Our route | Status | Notes |
|---|---|---|---|
| — | `/our-church` (About Our Church, the church's text) | **extra** | Denver has no "about" page. Proposal: keep it as the **first child, "About Us"**. Decision D1. |
| Our Story | `/our-church/history` | **rename** | Label "Our Story". It holds the church's own history (Stockholm). |
| Tewahedo History | — | **create** `/our-church/tewahedo-history` | General history of the EOTC. No text from the church yet → hidden. |
| Theology | — | **create** `/our-church/theology` | No text → hidden. |
| Our Priests (Kesis) | `/our-church/clergy` | exists (hidden) | Appears when a clergy profile is published. |
| Projects | — | **create** `/our-church/building-project` | The church's own building project (the history page mentions the permit and fund). No text or images yet → hidden. |
| Leadership Team | `/leadership` | **rename** → `/our-church/leadership` (with a redirect) | Exists, hidden until the parish council is entered. |
| — | `/diocese` | **extra** | Not in Denver's menu; keep it in the footer only. |

### 3. Our Faith ▾
| Denver item | Our route | Status | Notes |
|---|---|---|---|
| (landing, not in menu) | `/our-faith` | exists | Denver's landing has 4 icon cards; ours lists the teachings. Layout change only. |
| Holy Scriptures | — | **create** (as a teaching, `/our-faith/holy-scriptures`) | Needs a clergy-approved teaching → hidden until then. |
| Mystery | — | **create** (`/our-faith/mysteries`) | Same. |
| The 7 Sacraments | — | **create** (`/our-faith/seven-sacraments`) | Our `/sacraments` is **not** this: it lists the church's rites (christening, marriage, offerings, fitihat). A real 7-sacraments teaching needs clergy text → hidden. |
| Sermons | `/media/videos` | **rename** | Label "Sermons"; one video so far. |
| — | "What does 'Church' mean?" (the church's teaching on `/our-faith`) | **extra** | Stays as the landing's intro. |

### 4. Ministries ▾
| Denver item | Our route | Status | Notes |
|---|---|---|---|
| Sunday School | `/sunday-school` | exists | |
| — | `/sunday-school/<department>` | **extra** | Department pages; each appears when published. |
| — | `/sunday-school/join` | **extra** | Registration form. Denver has a "register your child" bar on the page instead of a menu item → proposal: same, **not in the menu**. |

### 5. Services ▾
| Denver item | Our route | Status | Notes |
|---|---|---|---|
| Service Schedule | `/worship` (+ `/worship/weekly`) | **rename** | Label "Service Schedule". Rebuild `/worship` in Denver's layout (section 2). Our extra pages (weekly, monthly and annual feasts, and the church's three explanation pages) stay reachable from it, not from the menu. |
| Baptism | `/sacraments/baptism` | exists | Request form `/sacraments/baptism/request` stays closed until the committee opens it. |
| Holy Matrimony | `/sacraments/marriage` | exists | Denver has a request form here; we have none. Decision D4. |
| — | `/our-faith/offerings` (መባዕ) | **extra** | It is in the church's list of rites, between marriage and fitihat → proposal: here, in that order. |
| Memorial & Funeral | `/sacraments/fitihat` | **rename** | Label "Memorial (Fitihat)". Denver has a form; we don't (D4). |
| Hall Rental | — | **N/A** | Spec Phase 4, only if approved; we don't know of a hall to rent. |
| Prayer Request | — | **N/A for now** | A new private form with religious (Art. 9) data, and a "pick a priest" step. Not in the approved phases. Interim: the counselling hours (Mon–Fri) and the contact page. Decision D5. |
| — | `/sacraments` (rites landing) | **extra** | Denver has no landing for this dropdown. Keep it reachable from the baptism/marriage pages; not in the menu (D2). |

### 6. Events ▾
| Denver item | Our route | Status | Notes |
|---|---|---|---|
| Calendar | `/worship/calendar` | **rename** (label only) | Ours is a native calendar with iCal; Denver embeds Google Calendar (asks visitors to sign in). Keep ours. |
| Announcements | `/news` | **rename** | Label "Announcements"; hidden until the first post. |
| Livestream | `/worship/livestream` | exists (hidden) | Appears when the stream link is set. |
| — | `/media` (photo galleries) | **extra** | Denver shows photos only as the home carousel. Proposal: "Photos" here, hidden until a gallery has permission (D6). |

### 7. Connect ▾
| Denver item | Our route | Status | Notes |
|---|---|---|---|
| Contact Us | `/visit` | **rename** | Label "Contact Us"; Denver's two-column layout (section 2). |
| Newsletter Signup | — | **N/A** | Spec Phase 3 task 7: optional, needs committee approval and double opt-in; not built. |
| — | `/support/volunteer` | **extra** | Volunteer form → proposal: here. |

### 8. Donate (pill button) and 9. Join
| Denver item | Our route | Status | Notes |
|---|---|---|---|
| Donate | `/support` | **rename** (D3) | Ours has the church's offerings text and the volunteer card, but no payment details (Swish/Bankgiro is Phase 4; the Postgiro numbers are a pending church decision). |
| Join (membership sign-up) | — | **N/A** | Spec Phase 4: members collection, separate legal review. |
| Account icon / member login | — | **N/A** | No member accounts. Our only sign-in is the staff admin, deliberately not linked from the public site. |

### Header extras
| Denver | Ours | Status |
|---|---|---|
| Search icon | `/search` (icon + word) | exists; becomes icon-only with an accessible name |
| Language pill "EN \| አማ" (switches in place) | Locale switcher (changes the URL `/am` ↔ `/en`, `/sv` later) | exists; restyle as a pill, keep the URL switch (search engines and shared links need it) |
| — | "Service Times" header button | **remove**: Denver has only the Donate pill. Service times move into the Services menu. |

### Proposed menu, all together
`Home · Our Church ▾ · Our Faith ▾ · Ministries ▾ · Services ▾ · Events ▾ · Connect ▾ · [Donate]` + language pill + search icon.
Today it is 9 flat links (Home, Our Church, Our Faith, Worship & Calendar, Sunday School, Sacraments &
Requests, News & Media, Support, Visit & Contact) and a "Service Times" button.

**What visitors would actually see today**, after hiding items with no content:
- Our Church ▾: About Us, Our Story.
- Our Faith ▾: Sermons, plus the landing.
- Ministries ▾: Sunday School.
- Services ▾: Service Schedule, Baptism, Holy Matrimony, Offerings, Memorial.
- Events ▾: Calendar.
- Connect ▾: Contact Us, Volunteer.
- Donate.

A dropdown with no visible children is hidden. A dropdown with one child (Ministries) stays a dropdown,
as on Denver.

---

## 2. Layout differences

| Part | Denver | Ours now | Change needed |
|---|---|---|---|
| **Header (desktop)** | One sticky dark bar: logo + two-line name left; menu, Donate pill, Join, language pill, search icon, account icon right. | White, not sticky; two rows (name, search, language, "Service Times" button; then a row of 9 links). | One sticky bar in **our green** with cream text. Name on two lines (Amharic name; English type line). Menu right. Donate as a gold-outlined pill. |
| **Dropdowns (desktop)** | Click-to-open panel under the button, one link per row, shadow. | Hover/focus panel exists, but no item has children yet. | Buttons that open on click **and** hover, with `aria-expanded` and Escape to close; light panel with a shadow. Parent items become buttons (no page), as on Denver. |
| **Mobile header and drawer** | Logo + name, search, account and hamburger; full-width drawer in the brand colour; language pill first; accordion sections with an indented, left-ruled child list; chevrons. | Hamburger with all links in one flat list; children (if any) as an indented list. | Full-width green drawer, language pill at the top, **accordion** per dropdown (one button per section, `aria-expanded`), children indented with a gold left rule. |
| **Footer** | Brand band, four columns (identity with address, phone and email; "Church" links; "Services" links; "Find Us"), then a bottom bar with copyright left and social icons right. | Green band with the diocese link and copyright only. | Four columns from the Footer global (it already supports link columns): identity (name, address; phone and email **only once entered**), two link columns, "Find us" (address + "open in a map" link, no embedded map). Bottom bar: copyright, privacy and cookies (when published), diocese, social icons (only those set). |
| **Inner-page banner** | Every inner page: a 320 px photo banner with tint, a centred title and a one-line subtitle. | Plain title on cream, left-aligned. | A banner block on every inner page: title + optional subtitle (CMS field). **Photo only when an approved church photo exists**; until then a plain green band. Pages already have a hero field with an image. |
| **Home** | Photo hero with emblem and big name → welcome letter with priest portrait signature + CTA → service-time cards → feast band (two columns) → upcoming events → photo carousel → footer. | Photo hero with name → next service → upcoming holy days → visit us. | Rebuild in Denver's order with our sections: hero (emblem + name) → welcome (the church's About text excerpt; signature block only with an approved clergy profile) → service-time cards (from events) → **feast band** (the coming church year's feasts from our calendar data) → upcoming events → photo carousel (hidden until galleries have permission). |
| **Text pages** (history, theology, mystery, scriptures, sacraments) | Banner + one narrow centred column with h2 sections. | Title + narrow column; "In this section" cards below. | Add the banner; keep the column. The "In this section" cards stay (they replace Denver's landing pages). |
| **Our Story** | Banner + a **stats strip** (six big numbers) + prose. | History text only. | Optional stats strip from a CMS field, **hidden until the church gives current figures** (the 2021 numbers are on the checklist). |
| **Our Priests** | Intro + four portrait cards + one group card. | Clergy page (hidden), list of profiles. | Portrait-card grid (4 per row) + optional group card; only with approved photos. |
| **Leadership** | Intro + three-column person cards. | Leadership page (hidden). | Same grid as Our Priests. |
| **Our Faith landing** | Intro + four icon cards. | List of teachings. | Intro + icon cards, one per published teaching or category. |
| **Sermons** | "Watch live" strip with two platform buttons → archive card → featured series list → more button. | Video list (`/media/videos`). | A "watch live" strip (only with a livestream link set) above our video list. |
| **Sunday School** | Two schedule cards → wide photo → age-group accordion → choir card → registration bar. | Intro + department list + join link. | Schedule cards (from events) → photo (if approved) → **departments as an accordion** → registration bar (only while forms are open). |
| **Service Schedule** | Two weekly cards (big times) → location card → feast band. | `/worship` landing with links; weekly list on its own page. | Rebuild `/worship`: weekly service cards (from events, 24-hour times) → location card → feast band → links to the church's explanation pages. |
| **Baptism** | Intro card → one form in two grouped cards (child and sacrament; contact person) → full-width submit → required-documents card. One step. | Teaching page; separate request form page (closed). | When requests open: Denver's **grouped-card** form layout (our fields unchanged: consent, privacy link and Turnstile stay; we don't add fields such as the priest's name without the committee). **Required-documents card** only if the church gives the list. |
| **Holy Matrimony / Memorial** | Request forms (2-step for wedding; single for memorial) + requirements card. | Teaching pages only. | Layout: teaching + **requirements card** (when the church lists them). Forms: D4. |
| **Calendar** | Embedded Google Calendar. | Native calendar. | Keep ours: no third-party embed (spec §8: no third-party scripts without consent). |
| **Announcements** | Filter chips + list. | News list (hidden). | Filter chips by category when there are posts. |
| **Livestream** | Intro → schedule card → two platform cards. | Consent-gated embed (hidden). | Add the schedule card and platform cards around our embed. |
| **Contact** | Two columns: details + embedded map + service-times card; message form. | Address + map link + form, stacked. | Two columns at desktop; **map as a link** (an embedded Google map loads third-party scripts: only behind consent, so no). |
| **Donate** | How-to-give (3 ways) → stat cards + categories → pledge form. | Offerings text + volunteer card. | A **how-to-give** card (Swish/Bankgiro/Postgiro, only once the church decides; D3). No pledge form (Phase 4). |
| **Join / Login** | Six-step membership wizard; member login. | — | N/A (Phase 4). |

---

## 3. Decisions needed before the rebuild

| # | Question | My proposal |
|---|---|---|
| D1 | Keep our "About Us" (`/our-church`) as the first item under Our Church? | Yes: it's the church's own text and Denver has no equivalent. |
| D2 | `/sacraments` (the rites landing) out of the menu? Its page stays. | Yes: Denver's Services dropdown has no landing. |
| D3 | "Donate" pill → `/support`? Label "Donate" (ስጦታ) or "Support" (ድጋፍ)? Payment details? | Pill to `/support`, label **"Give"** (መባዕ/ስጦታ, the church to choose); payment details only after the church decides on the Postgiro numbers. |
| D4 | Request forms for Holy Matrimony and Memorial like Denver's? | Not now: new private data (a collection, access, retention, privacy notice), outside the approved phases. Later, reusing the baptism case workflow, if the committee wants it. |
| D5 | Prayer Request with priest selection? | Not now (Art. 9 data, new workflow). Interim: the menu item is left out; the counselling hours are on the Service Schedule page. |
| D6 | Photos under Events, and the home carousel? | Yes, both hidden until a gallery has publish permission. |
| D7 | Hall Rental, Newsletter, Join, member login | Leave out (Phase 4 / not approved). |
| D8 | Header colour: one sticky **green** bar (our colour in Denver's layout) instead of today's white two-row header? | Yes. Contrast checked for AA. |
| D9 | Parent items become buttons (no landing link), as on Denver. Our landings (`/our-church`, `/our-faith`, `/worship`, `/sacraments`) stay reachable as children or in-page links. | Yes, with About Us, Our Faith and Service Schedule as the first child of their section. |

## 4. What the rebuild touches (after approval)

- **Navigation global:** the seed data and the dev database; dropdown children; a "pill" style for Donate.
- **SiteHeader:** one sticky bar; click-and-hover dropdowns.
- **MobileMenu:** an accordion.
- **SiteFooter:** four columns, then the bottom bar.
- **A shared page banner,** used on every inner page.
- **New templates or sections:**
  - home order and feast band;
  - Service Schedule;
  - Our Faith icon cards;
  - person-card grid;
  - Sunday School accordion;
  - contact in two columns;
  - requirements card;
  - how-to-give card;
  - stats strip.
- **New hidden routes:** `/our-church/tewahedo-history`, `/our-church/theology` and `/our-church/building-project`, plus three teaching slugs.
- **Moved route:** `/leadership` → `/our-church/leadership`, with a redirect.
- **Tests:**
  - e2e for dropdowns: keyboard, hover and click, and the mobile accordion;
  - axe on every template;
  - updated nav and footer tests.
