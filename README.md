# Kids Competition Calendar – Kochi

A simple website for parents in Kochi, Kerala, listing upcoming competitions for
Class 1–5 students: Olympiads, scholarship tests, and local drawing, GK and quiz contests.

## The files

| File | What it is | Do you edit it? |
|---|---|---|
| `competitions.json` | The list of competitions | **Yes — this is the only file you edit** |
| `index.html` | The page structure | No |
| `style.css` | Colours and layout | Only to change colours |
| `script.js` | Sorting, filtering, deadlines | No |

## How to add a competition

1. On GitHub, open `competitions.json` and click the pencil icon (Edit).
2. Copy one whole entry — everything from `{` to `}` — and paste it after the last entry.
3. Put a **comma** between the entries: `},` then `{`.
4. Change the details. Remove the line `"sample": true` for real competitions.
5. Click **Commit changes**. The website updates within a minute or two.

An entry looks like this:

```json
{
  "name": "International Maths Olympiad (IMO)",
  "organiser": "Science Olympiad Foundation",
  "classes": [1, 2, 3, 4, 5],
  "type": "Olympiad",
  "registrationLastDate": "2026-12-15",
  "examDate": "2027-01-20",
  "fee": "₹150",
  "mode": "School-based",
  "link": "https://example.com/official-page"
}
```

### Optional extra fields

- `"examDates": ["2026-11-19", "2026-12-03"]` — use this **instead of** `examDate` when the
  school picks one of several dates (SOF, SilverZone). Past dates are hidden automatically.
- `"note": "..."` — a short message shown on the card (e.g. "Register through your school").
- `"linkLabel": "Read news article"` — changes the button text (default: "Official website").
- `"source": "https://..."` — the page where the information was found (shown as "Source" on the card).
- `"sourceType": "official"` / `"news"` / `"blog"` — what kind of source it is.
- `"addedOn": "2026-11-11"` — the date the entry was added. Optional `"updatedOn"` when dates change.
  The newest of these dates (or the site's publish time) appears as "Last updated" at the top.
- `"individual": "yes"` / `"no"` / `"ask"` — can parents register directly without the school?
  Shown on the card as "Apply without school".
- `"unverified": true` — shows a yellow "Not yet confirmed" label (without it, the card shows a green "Confirmed ✓"). Remove this line
  once you have checked the dates with the school or official website.

If `registrationLastDate` is `""`, the card shows "Ask your school" (for School-based
competitions) or "Check official link" (for others).

### Rules that matter

- **Dates** are written year-month-day: `"2026-12-15"`. If a date is not announced yet, write `""`.
- **Classes** is a list of numbers in square brackets: `[3, 4, 5]`.
- **Type** should be one of: `Olympiad`, `Scholarship`, `Drawing`, `GK`, `Quiz`.
  A new type (e.g. `"Spelling"`) also works — it will appear in the filter automatically.
- **Link** must start with `https://` or `http://`.
- Every piece of text goes inside `"double quotes"`.
- The **last** entry in the list has **no comma** after its `}`.

### If the list disappears

You probably have a typing mistake (missing comma, missing quote, or an extra
comma after the last entry). The website will show a red message. Paste the
contents of `competitions.json` into <https://jsonlint.com> to find the exact line.

## What the site does automatically

- **Upcoming deadlines & exams** box shows each competition's next registration deadline or exam date, if it is within 30 days.
- Competitions whose **exam date has passed are hidden** — no need to delete them.
- Competitions with registration closed but exam still ahead show a grey "Registration closed" label.
- Entries with `"sample": true` show a red "SAMPLE – not real" label (useful for testing; don't leave them in).

## Putting the site online (GitHub Pages)

1. On GitHub, open this repository → **Settings** → **Pages**.
2. Under "Build and deployment", set **Source** to *Deploy from a branch*.
3. Choose branch **main** and folder **/ (root)**, then click **Save**.
4. After a minute, the page shows your website address
   (like `https://<your-username>.github.io/kids-competition-calendar/`).

Note: opening `index.html` by double-clicking on your computer will **not** load the
competitions — browsers block that. Always use the GitHub Pages address.
