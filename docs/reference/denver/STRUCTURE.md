# denvermedhanealem.org: navigation and page structure

Captured 2026-11-19 with Playwright (desktop 1440 px, mobile 390 px) as a **structural reference only**.
This file records what each part of the site *is* (its layout and building blocks), never its wording.
Nothing here is to be copied: Denver's text, images, clergy, times and contacts stay theirs.
Menu labels are quoted only because the mapping in [GAP.md](GAP.md) needs them.

Screenshots: `docs/reference/denver/<slug>-desktop.png` and `<slug>-mobile.png` for every page below,
plus `header-desktop.png`, `header-dropdown-desktop.png`, `header-mobile.png`, `drawer-mobile.png`,
`drawer-open-section-mobile.png` and `footer-desktop.png`. They are **kept out of git** (`.gitignore`)
because they contain Denver's photos and text; they exist only on this machine.

The site is a single-page React app (built with Lovable). Every page shares one template: header,
photo banner, content, footer. The language toggle switches the page content between English and
Amharic, but the menu labels stay in English.

---

## 1. Navigation tree

Top level, left to right. A **▾** item is a button that opens a dropdown; it has no page of its own.

| # | Top-level item | Type | Children (label → URL), in order |
|---|---|---|---|
| 1 | Home | link → `/` | — |
| 2 | Our Church ▾ | dropdown | Our Story → `/our-story` · Tewahedo History → `/tewahido-history` · Theology → `/theology` · Our Priests (Kesis) → `/our-priests` · Projects → `/our-projects` · Leadership Team → `/leadership-team` |
| 3 | Our Faith ▾ | dropdown | Holy Scriptures → `/holy-scriptures` · Mystery → `/mystery` · The 7 Sacraments → `/sacraments` · Sermons → `/sermons` |
| 4 | Ministries ▾ | dropdown | Sunday School → `/ministries` |
| 5 | Services ▾ | dropdown | Service Schedule → `/services` · Baptism → `/baptism` · Holy Matrimony → `/wedding` · Memorial & Funeral → `/memorial` · Hall Rental → `/hall-rental` · Prayer Request → `/prayer-request` |
| 6 | Events ▾ | dropdown | Calendar → `/calendar` · Announcements → `/announcements` · Livestream → `/livestream` |
| 7 | Connect ▾ | dropdown | Contact Us → `/contact` · Newsletter Signup → `/newsletter` |
| 8 | Donate | link → `/donate`, drawn as a light **pill button** | — |
| 9 | Join | link → `/become-member` | — |
| — | Language toggle | pill button "EN \| አማ" | switches content language in place (no URL change) |
| — | Search | icon button | opens a search overlay |
| — | Account | icon link → `/member-login` | member sign-in / sign-up |

Pages that exist but are **not in the menu**: `/our-faith` (Our Faith landing, linked from the home
page and the footer) and `/member-login`.

## 2. Site-wide parts

### Header (desktop)
- One **sticky bar**, 72 px high, filled with the brand's dark colour, shadow below.
- **Left:** round logo emblem + two-line name (Amharic name, then the church type in English).
- **Right**, one row: Home, the six dropdown buttons (label + small chevron), the Donate pill, Join, a
  thin vertical divider, the language pill, the search icon and the account icon.
- The current section's item is highlighted with a lighter rounded background.
- **Dropdowns open on click** (not on hover): a light rounded panel with a shadow directly under the
  button, one link per row, about 200 px wide. Clicking elsewhere closes it.

### Header and drawer (mobile, 390 px)
- Bar: logo + two-line name on the left; search icon, account icon and a menu (hamburger) button on
  the right. The hamburger becomes an × when the drawer is open.
- **Drawer:** full-width panel in the brand colour, pushing down from under the bar.
  1. The language pill at the top.
  2. Home (highlighted in the accent colour when current).
  3. Each dropdown is an **accordion row** (label + chevron) with a divider line. Opening it shows its
     children indented, with a vertical line on their left; the chevron flips.
  4. Donate and Join as plain rows at the end.
- Only one section is open at a time in the capture; opening another was not tested.

### Footer (every page)
- Full-width band in the brand colour.
- **Four columns:**
  1. Identity: church name, church type, street address, phone, email.
  2. "Church" links (6: story, faith, priests, leadership, history, sermons).
  3. "Services" links (8: calendar, announcements, Sunday school, prayer request, donate, hall rental,
     contact, livestream).
  4. "Find Us": a heading only (empty; probably a map that didn't load).
- **Bottom bar:** a thin rule, then the copyright line on the left and three social icons on the right
  (Facebook, Instagram, YouTube).
- There are no legal links (privacy, cookies) and no newsletter form in the footer.

### Inner-page banner (every page except home, Join and Login)
- Full-width **photo banner**, about 320 px high: one interior church photo, the same on every page,
  with a warm dark tint over it.
- Centred **page title** (large serif) and a **one-line subtitle** under it.
- No breadcrumbs.

## 3. Page outlines

"Card" = a light rounded box with a thin border on the cream page background.
"Brand band" = a full-width section in the dark brand colour with light text.

### Home `/`
1. **Full-screen photo hero** (about 630 px): a tinted church interior photo, a large round emblem in
   the centre, the church name very large in Amharic, and an English name line under it. No buttons.
2. **Welcome message:** a centred heading with a scripture greeting, a long justified Amharic letter, a
   **round portrait of the head priest with his name and title** (signature block), and one CTA button
   to the Our Faith page.
3. **Service times:** a tinted band with a heading and **two cards side by side** (service name, time
   range, "every <day>").
4. **Feast days:** a brand band with a spaced-out heading, a one-line note, a short divider, then a
   **two-column list of the year's feasts**. Each entry: small upper-case date and time line, feast name
   (large), Amharic name in the accent colour, a divider under it.
5. **Upcoming events:** a tinted band with a heading, an empty-state line and a "full calendar" link.
6. **Community photos:** a heading and a **wide rounded photo carousel** with left/right arrows and dots.
7. Footer.

### Our Story `/our-story` (Our Church)
1. Banner.
2. **Stats strip:** a tinted band with **six large numbers** in a row, each with a small label (year
   founded, members, priests, deacons, children, age profile).
3. **Prose:** one narrow centred column of paragraphs.

### Tewahedo History `/tewahido-history`, Theology `/theology`, Holy Scriptures `/holy-scriptures`, Mystery `/mystery`, The 7 Sacraments `/sacraments`
These are all one **article template**:
1. Banner.
2. One narrow centred column (about 720 px): optional intro paragraph, then **h2 sections**
   (numbered on the sacraments page, one per mystery on the mystery page), with paragraphs and simple
   bullet lists.

### Our Priests `/our-priests`
1. Banner.
2. A centred intro paragraph.
3. Small upper-case section label, then a **row of four portrait cards** (photo area on top, then name
   and title). The photos are placeholders on Denver's site.
4. A second label, then **one wide card** with a group-photo area, a heading and a short paragraph
   (the deacons as a group).

### Projects `/our-projects`
1. Banner.
2. Left-aligned prose (two paragraphs).
3. A "video" heading and an **embedded video player** (a Google Drive embed, which failed to load).
4. A "renderings" heading and **two images side by side** (architect's drawings of the new building).

### Leadership Team `/leadership-team`
1. Banner.
2. A centred intro paragraph.
3. A **three-column grid of six person cards** (photo area, name, role). All placeholders ("to be filled").

### Our Faith `/our-faith` (landing, not in the menu)
1. Banner.
2. A centred intro paragraph.
3. **Four icon cards in a row:** a round icon, a title and a short summary each, linking to scriptures,
   mystery, sacraments and sermons.

### Sermons `/sermons`
1. Banner.
2. **"Watch live" strip:** a tinted band with a heading, one line and **two platform buttons**
   (Facebook in blue, YouTube in red).
3. **Series archive card:** an image area, a title, a line and a link to Facebook.
4. **Featured series:** a heading and a list of three cards (title, line, a small badge on the right).
5. A centred button to more sermons on Facebook.

### Sunday School `/ministries` (Ministries)
1. Banner.
2. A centred intro line.
3. **Two schedule cards** (day, time, what happens).
4. A **wide photo**.
5. **Curriculum by age group:** an **accordion** of four rows (level name, Amharic name, age badge,
   chevron).
6. **Choir card:** an icon heading, a photo, a paragraph and a phone line.
7. **Registration CTA bar:** a brand-coloured rounded bar with a title, a line and a button on the right.

### Service Schedule `/services` (Services)
1. Banner.
2. "Weekly services": **two large cards** (service name, big time range in the accent colour, "every
   <day>").
3. **Location card:** address and phone.
4. The same **feast-days brand band** as on the home page (two-column feast list).

### Baptism `/baptism` (Services)
1. Banner, with a scripture line as the subtitle.
2. **Intro card:** a small icon, the form's title and a line on how to use it.
3. **Form card 1, the child and the sacrament:** a group heading with an accent bar; one field per row:
   child's name\*, date of birth\*, planned baptism date, baptismal name, gender\* (select), place of
   birth\*, father's name\*, mother's name\*, godparent's name, priest's name.
4. **Form card 2, the contact person:** a group heading; your name\*, then phone\* and email side by side.
5. A **full-width submit button** with a check icon.
6. **Required documents card:** a heading and a bullet list of the papers to bring.
- **One step.** No consent checkbox, no privacy link, no captcha visible. Dates are free text, not date
  pickers.

### Holy Matrimony `/wedding` (Services)
1. Banner.
2. A **two-step progress indicator** (couple details → wedding details).
3. Step 1 card: a group heading; groom's name, bride's name, groom's phone, bride's phone (2×2 grid),
   then a "Next" button.
4. **Requirements card:** a heading and a bullet list of pre-marriage requirements.
- Step 2 was not opened: that needs typing data into their form, which we don't do on someone
  else's site.

### Memorial & Funeral `/memorial` (Services)
1. Banner.
2. **One form card:** your name, phone (side by side), email, name of the deceased, date of passing and
   requested service date (date pickers, side by side), notes, then a full-width submit.

### Hall Rental `/hall-rental` (Services)
1. Banner.
2. **Two columns.**
   - Left: form cards for the responsible person (name, surname, email, phone), the event (type select,
     date, start and end time, number of guests), an agreement checkbox card, and a full-width submit.
   - Right: two info cards (capacity and facilities; rules and guidelines as bullets).

### Prayer Request `/prayer-request` (Services)
1. Banner.
2. A **two-tab switch** (prayer request | book an appointment).
3. "1. Select a priest (optional)": **four selectable priest cards** (person icon, name, title).
4. "2. Your information" form card: name and phone side by side, email (optional), request type
   (select of eight pastoral needs), details (optional textarea), a full-width send button, then a
   rule and an urgent-call line with the phone number.

### Calendar `/calendar` (Events)
1. Banner.
2. A card with an **embedded Google Calendar** (it asks for a Google sign-in, so it shows nothing to
   visitors) and an "open in Google Calendar" link.
3. An empty-state line and a link to announcements.

### Announcements `/announcements` (Events)
1. Banner.
2. **Filter chips** (all, urgent, general, events).
3. A list area; it currently shows an empty state (bell icon and a line).

### Livestream `/livestream` (Events)
1. Banner.
2. A centred intro paragraph.
3. A **schedule card** (live times, a note).
4. **Two platform cards side by side** (YouTube, Facebook: icon, name, "watch on…").

### Contact Us `/contact` (Connect)
1. Banner.
2. **Two columns.**
   - Left, "get in touch": address, phone and email lines, an **embedded Google map** with an
     "open in maps" link, and a service-times card.
   - Right, "send us a message": name, email, message, send button.

### Newsletter Signup `/newsletter` (Connect)
1. Banner.
2. **One centred card:** an icon, a title, a line, then name, email and a subscribe button.

### Donate `/donate` (top-level button)
1. Banner (bilingual title).
2. **"How to give" card:** three ways side by side (online, in person, by phone), each with an icon.
3. **Two columns.**
   - Left: three **stat cards** (members, new location, street) and a donation-categories list card.
   - Right: a **pledge form card**: preset amount buttons, custom amount, category select, name, email,
     phone, address, an "include family member" checkbox, a submit button and a contact line.

### Join `/become-member` (top-level link)
- **No banner and no site header:** a centred logo, title and subtitle.
- A **six-step progress bar** with icons (account, personal, family, contact, membership, review).
- Step 1 card "create your account": email, password, confirm password (show/hide icons), back and
  continue buttons, a "step 1 of 6" counter and an "already a member? sign in" link.
- A thin bar at the bottom of the page instead of the footer.

### Member Login `/member-login` (account icon)
- **No banner:** a centred card with the logo, a title, a notice line, email, password, a sign-in
  button, and register and forgot-password links.
