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
3. Commit, push, and **always create the pull request yourself** — do not ask first.
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
- Link-preview pictures (WhatsApp etc.): `og-image.jpg` (home/competitions) and
  `og-admissions.jpg` (admissions page), 1200x630 JPEG, keep each under 300 KB.
- Visitor counter: GoatCounter, site code `kochikidscalendar`
  (dashboard https://kochikidscalendar.goatcounter.com). Button clicks are counted as
  events `click-whatsapp`, `click-calendar`, `click-official-link`.
- School admissions page: `admissions.html` + `admissions.js`, data in `admissions.json`
  (see README). Keep schools in popularity order (Rajagiri Kalamassery first). Never rate or
  rank schools ourselves; status/age rules only from the school's own notice when possible.
- School websites reachable from the cloud environment (owner added them to Allowed domains):
  rajagiri.ac.in, christujayanthi.ac.in, bhavanskochikendra.com, choiceschool.com,
  tochschool.com, assisi.ac.in, ncskochi.nesnavy.in, sanskaraschool.com, vidyodayaschool.ac.in,
  gemsmodernacademy-kochi.in, globalpublicschool.org, chinmayavidyalaya.edu.in (Tripunithura),
  shpublicschool.com, chinmayavaduthala.edu.in (Chinmaya Vaduthala).
  KV and EducationWorld sites block cloud servers — use news/search for those.
- Script/CSS links carry a version (`?v=YYYYMMDD`) to beat browser caches: when you change
  script.js, admissions.js or style.css, bump the `?v=` date in index.html / admissions.html.
- Announcement bar (top of both pages): edit `announcement.json` — `active`, `text`, `linkText`,
  `link`, `detailsLink` (`./#no-school` shows the "no school needed" list). Owner wants it
  ALWAYS visible: keep `closable` false and no `showUntil`. Current message: Unified Council
  lets parents register directly (no school) — the site's key differentiator. Don't put
  class-specific dates in it.

