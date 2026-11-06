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
- Plain HTML/CSS/JS, hosted on GitHub Pages from `main`.
- All competition data is in `competitions.json`; see README.md for the fields.
- Never add competition dates as confirmed unless they come from an official source
  or the owner's school; otherwise set `"unverified": true` and add a `note`.
