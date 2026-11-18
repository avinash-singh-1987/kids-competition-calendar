# Notes for Claude (working with the owner of this project)

## About the owner
- The owner is **not technical** and has never coded. Explain things in simple Hindi
  (Devanagari), keeping GitHub button names in English as they appear on screen.
- **Make all technical decisions yourself.** Do not ask the owner to choose between
  technical options; pick the sensible default and briefly say what you chose.
- The owner's only job is to press **Merge** on GitHub. Keep their effort minimal.

## Workflow (always)
1. Make the change on the designated `claude/...` branch (restart it from `main`
   if the previous pull request was already merged).
2. Test the site in a browser (phone width) before committing.
2b. Whenever competitions.json or admissions.json changes, run `node tools/build-pages.js`
   (one page per competition/school + sitemap.xml) and commit the result;
   `node tools/build-pages.js --check` must pass before committing. The same script builds the
   guides: /olympiad-guide/ (text in tools/guide-content.html), /lkg-admission-guide/ and the
   printable /admission-calendar/ (both from admissions.json; the calendar's QR is qr-admissions.svg,
   pointing to admissions.html?ref=print-calendar). Facts in guides only from official sites.
3. Commit, push, and **always create the pull request yourself** — do not ask first.
3b. After the owner merges, check that the GitHub Pages deployment's commit (sha) equals the new
   `main` commit. GitHub sometimes redeploys the previous commit right after a merge; if so, the
   new files are not live and another commit to `main` (a small PR) is needed to rebuild.
4. Give the owner the pull request link and tell them: open it → "Merge pull request"
   → "Confirm merge".

## About the site
- The site is called **Kochi Kids Calendar** (renamed Nov 2026). Do NOT rename the repository:
  the GitHub Pages address depends on it and shared links would break.
- Plain HTML/CSS/JS, hosted on GitHub Pages from `main`, at **https://kochikidscalendar.com**
  (domain bought on Hostinger; `CNAME` file holds the domain — don't delete it).
- All competition data is in `competitions.json`; see README.md for the fields.
- Never add competition dates as confirmed unless they come from an official source
  or the owner's school; otherwise set `"unverified": true` and add a `note`.
- Every new entry gets `source` (URL where it was found), `sourceType`
  (official/news/blog) and `addedOn` (today's date); set `updatedOn` when dates change.
- Set `individual` ("yes"/"no"/"ask") only from what the source says; use "ask" if unclear.
- Yearly competitions carry `repeatsYearly: true` (+ `seasonDates`, `schoolLeadDays`); once closed they
  move to "Closed for this year — don't miss next year" with a "Remind me next year" calendar link.
  The "next year" estimate is shown only when an official rule/deadline exists (SOF 30 days,
  SilverZone 15 days). When next year's dates appear, UPDATE the existing entry (dates, seasonDates,
  updatedOn) — don't add a duplicate.
- Link-preview pictures (WhatsApp etc.): `og-image.jpg` (home/competitions),
  `og-admissions.jpg` (admissions page) and `og-no-school.jpg` (share link below), 1200x630 JPEG,
  keep each under 300 KB and keep the key words inside the middle 630x630 (WhatsApp may crop to a square).
- Share link for WhatsApp: **https://kochikidscalendar.com/no-school/** — `no-school/index.html` only
  holds its own preview tags (noindex) and forwards to `/#direct`, which opens the competitions page at
  the top (announcement bar visible) with the "Register directly" filter on. `#no-school` does the same
  but scrolls down to the list.
- Visitor counter: GoatCounter, site code `kochikidscalendar`
  (dashboard https://kochikidscalendar.goatcounter.com). Since Nov 2026 button clicks are counted
  PER ENTRY as `<event>/<slug>` (slug = same as the card id / page name), so we can later show a
  playschool or organiser how many parents acted on their card: playschools `ps-maps/…`, `ps-site/…`; schools `school-maps/…`, `school-site/…`, `school-directions/…`,
  `school-reminder/…`, `school-whatsapp/…`; competitions `official-link/…`, `calendar/…`,
  `whatsapp/…`, `coming-up/…`, `remind-next-year/…`, `my-child-item/…`. Older totals used the
  names `click-whatsapp`, `click-calendar`, `click-official-link` etc.
- School admissions page: `admissions.html` + `admissions.js`, data in `admissions.json`
  (see README). Keep schools in popularity order (Rajagiri Kalamassery first). Never rate or
  rank schools ourselves; status/age rules only from the school's own notice when possible.
- "Schools near you" (admissions page): each school has `locations` [{name, lat, lng}] (one per campus);
  `areas.json` holds ~30 Kochi areas for the dropdown. Points come from OpenStreetMap Nominatim
  (nominatim.openstreetmap.org is in Allowed domains; max 1 request/second, send a User-Agent) or the
  school's own map embed — check each point lands in the right locality. A new school must get `locations`.
  The parent's GPS position is never stored or sent; only the chosen area name is saved on the phone.
- Playschools page: `playschools.html` + `playschools.js`, data in `playschools.json` (name, area, kinds,
  chain/partOf, ages, locations[{lat,lng,approx}], link, source, sourceType "official"|"listing", checkedOn).
  Owner's rule (Nov 2026): include playschools with their own/chain website, kindergartens of our schools,
  and well-known local ones that appear in at least two public directories or that a parent suggested.
  Listing-only entries show "From public listings — confirm with the playschool". Never show ratings, fees
  or directory phone numbers; the card's Google Maps button gives reviews/phone/route. Never rank:
  without a location the list is by area, then name. `approx` points show "In the X area" / "(area)".
- School websites reachable from the cloud environment (owner added them to Allowed domains):
  rajagiri.ac.in, christujayanthi.ac.in, bhavanskochikendra.com, choiceschool.com,
  tochschool.com, assisi.ac.in, ncskochi.nesnavy.in, sanskaraschool.com, vidyodayaschool.ac.in,
  gemsmodernacademy-kochi.in, globalpublicschool.org, chinmayavidyalaya.edu.in (Tripunithura),
  shpublicschool.com, chinmayavaduthala.edu.in (Chinmaya Vaduthala),
  marthomapublicschool.edu.in, dpskochi.com, campioncochin.edu.in, kochi.tipsglobeducate.com +
  kochicbse.tipsglobeducate.com (TIPS), gregorianpublicschool.org, gps.ac.in (Greets) — added Nov 2026.
  KV and EducationWorld sites block cloud servers — use news/search for those.
- Playschool websites in Allowed domains (Nov 2026): eurokidsindia.com (centre pages listed in its
  preschool-pages-sitemap.xml), timekidspreschools.in, kidzee.com (blocks us: 406), bachpanglobal.com
  (unreachable), footprintseducation.in, thebackyardacademy.com, balamandir.bhavanskakkanad.ac.in,
  littlebritain.in (site carries injected spam links — don't link it), caterpillarz.in (4 Kochi campuses).
- Script/CSS links carry a version (`?v=YYYYMMDD`) to beat browser caches: when you change
  script.js, admissions.js or style.css, bump the `?v=` date in index.html / admissions.html.
- Announcement bar: edit `announcement.json` — `active`, `title`, `points`
  (list of {text, detailsLink, showUntil}; a dated point should have showUntil so it disappears
  when it's out of date), `linkText`, `link`, `onlyWithHash`. Since Nov 2026 the owner wants it
  shown ONLY to visitors from the WhatsApp share link (`onlyWithHash: ["direct"]`): a permanent
  bar for everyone looked unprofessional and like promotion of one organiser. Normal visitors
  instead see a neutral hero pill "N without school registration ↓" (opens the filtered list).
  Keep `closable` false. Wording must stay mild: "school registration not required" /
  "parents can register directly", not "no school needed". Don't put class-specific dates in it.

