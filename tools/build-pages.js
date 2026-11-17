// Builds one plain HTML page per competition and per school, plus sitemap.xml,
// so Google (and WhatsApp previews) can read every entry without running JavaScript.
//
// Run after every change to competitions.json or admissions.json:
//     node tools/build-pages.js
// Check mode (exits with an error if the pages are out of date):
//     node tools/build-pages.js --check
//
// Output (fully regenerated each time — don't edit by hand):
//   competitions/index.html, competitions/<slug>/index.html
//   schools/index.html,      schools/<slug>/index.html
//   sitemap.xml

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://kochikidscalendar.com";
const CHECK = process.argv.includes("--check");

// ---------- Helpers (same rules as script.js / admissions.js) ----------

function slugify(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function esc(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function parseDate(text) {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [y, m, d] = text.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function formatDate(d) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
function safeLink(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}
function formatClasses(classes) {
  if (!Array.isArray(classes) || classes.length === 0) return "—";
  const sorted = [...classes].map(Number).sort((a, b) => a - b);
  const isRange = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
  if (sorted.length > 2 && isRange) return `Class ${sorted[0]}–${sorted[sorted.length - 1]}`;
  return "Class " + sorted.join(", ");
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
function ruleText(rule) {
  const [m, d] = String(rule.cutoff || "06-01").split("-").map(Number);
  const on = `${d} ${MONTHS[m - 1]}`;
  return rule.maxAge ? `${rule.minAge} to under ${rule.maxAge} years on ${on}` : `${rule.minAge}+ years on ${on}`;
}
function allDates(c) {
  const list = Array.isArray(c.seasonDates) && c.seasonDates.length ? c.seasonDates
    : Array.isArray(c.examDates) ? c.examDates : [c.examDate];
  return list.map(parseDate).filter(Boolean).sort((a, b) => a - b);
}
function latest(...texts) {
  const dates = texts.map(parseDate).filter(Boolean).sort((a, b) => b - a);
  return dates[0] || null;
}
function isoDay(d) { return d.toISOString().slice(0, 10); }

// Version of style.css used by the main pages, so these pages share the cache-busted file.
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS_VERSION = (indexHtml.match(/style\.css\?v=([\w]+)/) || [])[1] || "1";

// ---------- Page shell ----------

function page({ title, description, url, image, active, h1, eyebrow, intro, body, bodyClass }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(url)}">
  <meta name="theme-color" content="#0f766e">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Kochi Kids Calendar">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${SITE}/${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css?v=${CSS_VERSION}">
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
  <header class="hero hero-compact">
    <nav class="wrap tabs" aria-label="Sections">
      <a class="brand" href="/">Kochi Kids Calendar</a>
      <a href="/"${active === "competitions" ? ' aria-current="page"' : ""}>Competitions</a>
      <a href="/admissions.html"${active === "schools" ? ' aria-current="page"' : ""}>School admissions</a>
      <a href="/playschools.html">Playschools</a>
    </nav>
    <div class="wrap">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
      <h1>${esc(h1)}</h1>
      ${intro ? `<p class="tagline">${intro}</p>` : ""}
    </div>
  </header>
  <main class="wrap static-page">
${body}
  </main>
  <footer class="site-footer">
    <div class="wrap footer-inner">
      <div class="footer-icon" aria-hidden="true">✏️</div>
      <p>Kochi Kids Calendar · A free, independent guide for parents in Kochi, Kerala ·
        <a href="/olympiad-guide/">Parent's guide to Olympiads</a> ·
        <a href="/lkg-admission-guide/">LKG admission guide</a> ·
        <a href="/playschools.html">Playschools near you</a> ·
        <a href="/competitions/">All competitions</a> · <a href="/schools/">All schools</a></p>
    </div>
  </footer>
  <script data-goatcounter="https://kochikidscalendar.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</body>
</html>
`;
}

function detailsList(rows) {
  return `<dl class="details">\n${rows.map(([k, v]) =>
    `        <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("\n")}\n      </dl>`;
}

function sourceLine(source, sourceType, labels, dateLabel, date) {
  const url = safeLink(source);
  const parts = [];
  if (url) parts.push(`Source: <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(labels[sourceType] || "Link")} ↗</a>`);
  if (date) parts.push(`${dateLabel} ${esc(formatDate(date))}`);
  return parts.length ? `<p class="source-line">${parts.join(" · ")}</p>` : "";
}

// ---------- Competitions ----------

function competitionPage(c) {
  const slug = slugify(c.name);
  const url = `${SITE}/competitions/${slug}/`;
  const dates = allDates(c);
  const year = dates.length ? dates[0].getUTCFullYear() : null;
  const round = year ? (dates[0].getUTCMonth() >= 5 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`) : "";
  const reg = parseDate(c.registrationLastDate);
  let registerText;
  if (reg) registerText = formatDate(reg);
  else if (Number(c.schoolLeadDays)) registerText = `The school registers at least ${Number(c.schoolLeadDays)} days before the exam date it picks — ask your school`;
  else registerText = c.mode === "School-based" ? "Ask your school" : "See the official website";
  const individual = c.individual === "yes" ? "Yes — parents can register directly (no school registration needed)"
    : c.individual === "no" ? "No — only through the school" : "Ask the organiser";
  const rows = [
    ["Organiser", c.organiser || "—"],
    ["Classes", formatClasses(c.classes)],
    [dates.length > 1 ? "Exam dates" : "Exam date", dates.length ? dates.map(formatDate).join(", ") : "To be announced"],
    ["Register by", registerText],
    ["Fee", c.fee || "—"],
    ["Mode", c.mode || "—"],
    ["Parents can register directly", individual],
  ];
  if (c.repeatsYearly) rows.push(["Held", "Every year"]);
  const updated = latest(c.updatedOn, c.addedOn);
  const badges = [`<span class="badge">${esc(c.type || "Competition")}</span>`];
  if (c.individual === "yes") badges.push('<span class="badge direct">✓ Register directly — no school registration needed</span>');
  badges.push(c.unverified ? '<span class="badge unverified">Not yet confirmed</span>' : '<span class="badge confirmed">Confirmed ✓</span>');
  const official = safeLink(c.link);
  const desc = `${c.name}${round ? " " + round : ""} for ${formatClasses(c.classes)}: ` +
    (dates.length ? `exam ${dates.length > 1 ? "dates" : "date"} ${dates.map(formatDate).join(", ")}. ` : "") +
    `${c.individual === "yes" ? "Parents can register directly. " : c.individual === "no" ? "Registration through the school. " : ""}` +
    `Fee, how to register and official link — Kochi Kids Calendar.`;
  const body = `    <article class="card static-card t-${esc(slugify(c.type) || "other")}">
      <div class="badges">${badges.join("")}</div>
      ${detailsList(rows)}
      ${c.note ? `<p class="note">${esc(c.note)}</p>` : ""}
      ${sourceLine(c.source, c.sourceType, { official: "Official website", news: "News report", blog: "Education blog" }, "Checked", updated)}
      <div class="card-actions">
        ${official ? `<a class="btn" href="${esc(official)}" target="_blank" rel="noopener noreferrer">${esc(c.linkLabel || "Official website")} ↗</a>` : ""}
        <a class="btn-secondary" href="/#${esc(slug)}">See it in the calendar (with reminders)</a>
      </div>
    </article>
    ${c.type === "Olympiad" ? '<p class="static-foot"><a href="/olympiad-guide/">New to Olympiads? Read the 5-minute parent\'s guide →</a></p>' : ""}
    <p class="muted static-foot">Dates change sometimes — always confirm with the organiser or your school. This page was last updated ${esc(updated ? formatDate(updated) : "recently")}.
      <a href="/competitions/">See all competitions</a>.</p>`;
  return {
    slug, url, lastmod: updated,
    html: page({
      title: `${c.name}${round ? " " + round : ""} – ${formatClasses(c.classes)} dates & registration | Kochi Kids Calendar`,
      description: desc, url, image: "og-image.jpg", active: "competitions",
      h1: c.name, eyebrow: `${c.type || "Competition"} · ${formatClasses(c.classes)}${round ? " · " + round : ""}`,
      intro: esc(c.organiser || ""), body,
    }),
  };
}

// ---------- Schools ----------

const STATUS_TEXT = { open: "Admissions open", closed: "Closed for this round", expected: "Expected soon", check: "Check with the school" };

function schoolPage(s) {
  const slug = slugify(s.school);
  const url = `${SITE}/schools/${slug}/`;
  const entry = Array.isArray(s.entry) ? s.entry : [];
  const classes = entry.map(r => r.class);
  const classText = classes.length ? classes.join(", ") : "Kindergarten";
  const checked = parseDate(s.checkedOn);
  const status = (STATUS_TEXT[s.status] || "Check with the school") +
    (s.status === "expected" && s.expectedText ? `: ${s.expectedText}` : "") +
    (checked ? ` (as of ${formatDate(checked)})` : "");
  const rows = [["Area", s.area || "—"], ["Board", s.board || "—"], ["Status", status]];
  if (entry.length) entry.forEach(r => rows.push([`${r.class} age rule`, ruleText(r)]));
  else rows.push(["Age rule", "Ask the school"]);
  rows.push(["Applications usually open", s.applyMonth ? MONTHS[s.applyMonth - 1] : "Ask the school"]);
  const site = safeLink(s.link);
  const badges = [s.unverified ? '<span class="badge unverified">Not yet confirmed</span>' : '<span class="badge confirmed">From school website ✓</span>'];
  const desc = `${s.school}, ${s.area} (${s.board}): ${classText} admission — age rules${entry.length ? " (" + entry.map(r => `${r.class}: ${ruleText(r)}`).join("; ") + ")" : ""}, ` +
    `${s.applyMonth ? `applications usually open in ${MONTHS[s.applyMonth - 1]}, ` : ""}status and official link.`;
  const body = `    <article class="card static-card t-school">
      <div class="badges">${badges.join("")}</div>
      ${s.why ? `<p class="why">${esc(s.why)}</p>` : ""}
      ${detailsList(rows)}
      ${s.statusNote ? `<p class="note">${esc(s.statusNote)}</p>` : ""}
      ${sourceLine(s.source, s.sourceType, { official: "School / official", news: "News report", blog: "Listing site" }, "Checked", checked)}
      <div class="card-actions">
        ${site ? `<a class="btn" href="${esc(site)}" target="_blank" rel="noopener noreferrer">${esc(s.linkLabel || "School website")} ↗</a>` : ""}
        <a class="btn-secondary" href="/admissions.html#${esc(slug)}">When can my child join? (enter date of birth)</a>
      </div>
    </article>
    <p class="muted static-foot">We never rate or rank schools; details come from the school's own notices where possible. Always confirm with the school.
      <a href="/schools/">See all schools</a>.</p>`;
  return {
    slug, url, lastmod: checked,
    html: page({
      title: `${s.school}, ${s.area} – ${classText} admission, age rules & dates | Kochi Kids Calendar`,
      description: desc, url, image: "og-admissions.jpg", active: "schools",
      h1: `${s.school}, ${s.area}`, eyebrow: `${classText} admission · ${s.board || ""}`,
      intro: "Age rules, when applications open and the latest admission status.", body,
    }),
  };
}

// ---------- Hub pages ----------

function hubPage({ kind, items, title, h1, description, intro, image, active }) {
  const url = `${SITE}/${kind}/`;
  const body = `    <ul class="hub-list">
${items.map(i => `      <li><a href="/${kind}/${esc(i.slug)}/"><strong>${esc(i.label)}</strong><span>${esc(i.sub)}</span></a></li>`).join("\n")}
    </ul>`;
  return { url, html: page({ title, description, url, image, active, h1, eyebrow: "Kochi Kids Calendar", intro: esc(intro), body }) };
}

// ---------- Build ----------

const competitions = JSON.parse(fs.readFileSync(path.join(ROOT, "competitions.json"), "utf8")).filter(c => c && c.name);
const schools = JSON.parse(fs.readFileSync(path.join(ROOT, "admissions.json"), "utf8")).filter(s => s && s.school);

const files = new Map(); // relative path -> content
const sitemap = [
  { loc: `${SITE}/`, lastmod: null, priority: "1.0" },
  { loc: `${SITE}/admissions.html`, lastmod: null, priority: "0.9" },
  { loc: `${SITE}/playschools.html`, lastmod: null, priority: "0.9" },
];

function addPages(list, kind, make) {
  const seen = new Set();
  return list.map(item => {
    const p = make(item);
    if (!p.slug || seen.has(p.slug)) throw new Error(`Duplicate or empty page name in ${kind}: "${p.slug}"`);
    seen.add(p.slug);
    files.set(`${kind}/${p.slug}/index.html`, p.html);
    sitemap.push({ loc: p.url, lastmod: p.lastmod, priority: "0.7" });
    return p;
  });
}

const compPages = addPages(competitions, "competitions", competitionPage);
const schoolPages = addPages(schools, "schools", schoolPage);

const compHub = hubPage({
  kind: "competitions", active: "competitions", image: "og-image.jpg",
  title: "All competitions for Class 1–5 in Kochi – Olympiads, drawing, GK, quiz | Kochi Kids Calendar",
  h1: "All competitions", intro: "Every competition on Kochi Kids Calendar, with its own page of dates and details.",
  description: "Olympiads, drawing, GK and quiz competitions for Class 1–5 children in Kochi, Kerala — dates, fees and how to register.",
  items: competitions.map((c, i) => ({ slug: compPages[i].slug, label: c.name, sub: `${c.organiser || ""} · ${formatClasses(c.classes)}` })),
});
files.set("competitions/index.html", compHub.html);
sitemap.push({ loc: compHub.url, lastmod: null, priority: "0.8" });

const schoolHub = hubPage({
  kind: "schools", active: "schools", image: "og-admissions.jpg",
  title: "Kochi school admissions – Pre-KG, LKG, UKG age rules & dates | Kochi Kids Calendar",
  h1: "School admissions in Kochi", intro: "Popular Kochi schools: age rules, when applications open and the latest status.",
  description: "Pre-KG, LKG and UKG admission age rules and dates for popular schools in Kochi, Kerala.",
  items: schools.map((s, i) => ({ slug: schoolPages[i].slug, label: `${s.school}, ${s.area}`, sub: s.board || "" })),
});
files.set("schools/index.html", schoolHub.html);
sitemap.push({ loc: schoolHub.url, lastmod: null, priority: "0.8" });

// ---------- LKG admission guide + printable admission calendar (built from admissions.json) ----------

const SHORT_MONTHS = MONTHS.map(m => m.slice(0, 3));
const TODAY = new Date();
// Next school year that has not started yet (sessions start in June).
const NEXT_SESSION = TODAY.getMonth() + 1 >= 6 ? TODAY.getFullYear() + 1 : TODAY.getFullYear();

function lkgRule(s) {
  return (s.entry || []).find(r => /\bLKG\b|Balvatika-2/i.test(r.class)) || null;
}
function statusShort(s) {
  return s.status === "open" ? "Open now" : s.status === "closed" ? "Closed for 2027-28"
    : s.status === "expected" ? `Expected ${s.expectedText || "soon"}` : "Check with school";
}
// Schools grouped by the month applications usually open, in school-year order (July first).
function byApplyMonth(list) {
  const order = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
  const groups = order.map(m => ({ month: m, schools: list.filter(s => s.applyMonth === m) })).filter(g => g.schools.length);
  return { groups, unknown: list.filter(s => !s.applyMonth) };
}
const latestCheck = schools.map(s => parseDate(s.checkedOn)).filter(Boolean).sort((a, b) => b - a)[0];
const checkedText = latestCheck ? formatDate(latestCheck) : "";

function schoolLink(s) {
  return `<a href="/schools/${esc(slugify(s.school))}/">${esc(s.school)}</a>`;
}

function lkgGuideBody() {
  const { groups, unknown } = byApplyMonth(schools);
  const rows = [0, 1, 2].map(k => {
    const y = NEXT_SESSION + k;
    return `<tr><td>June ${y - 5} – May ${y - 4}</td><td><strong>June ${y}</strong> (${y}-${String(y + 1).slice(2)})</td><td>Jul–Oct ${y - 1}</td></tr>`;
  }).join("\n            ");
  const months = groups.map(g => `        <li><strong>${MONTHS[g.month - 1]}:</strong> ${g.schools.map(s => `${schoolLink(s)} <span class="muted">(${esc(statusShort(s))})</span>`).join(", ")}</li>`).join("\n");
  const ruleRows = schools.map(s => ({ s, r: lkgRule(s) })).filter(x => x.r).map(({ s, r }) => {
    const [m, d] = r.cutoff.split("-").map(Number);
    return `<tr><td>${schoolLink(s)}</td><td>${esc(r.class)}</td><td>${esc(r.minAge)} to under ${esc(r.maxAge)} years on ${d} ${SHORT_MONTHS[m - 1]}</td></tr>`;
  }).join("\n            ");
  return `    <article class="guide">
      <section class="panel guide-box">
        <h2>In 30 seconds</h2>
        <ul class="guide-points">
          <li>Most popular Kochi schools take children into <strong>LKG at 4 to under 5 years of age</strong>, counted on <strong>1 June</strong> (some use 31 May; Kendriya Vidyalayas use 31 March).</li>
          <li>Applications open <strong>8–11 months before</strong> the June start — for most schools between <strong>July and October</strong> of the year before.</li>
          <li>Some schools give seats <strong>first-come, first-served</strong> — apply as soon as applications open.</li>
          <li>Keep the <strong>birth certificate</strong> ready. Rajagiri's notice says applications with any date-of-birth mismatch are rejected.</li>
        </ul>
      </section>

      <h2>When does my child join LKG?</h2>
      <p>For schools with the common rule (4 to under 5 years on 1 June):</p>
      <div class="guide-table-wrap">
        <table class="guide-table guide-table-narrow">
          <thead><tr><th>Child born</th><th>Joins LKG in</th><th>Apply around</th></tr></thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      <p class="muted guide-small">Children born right at the start or end of a range: check the exact dates in the school's notice. For every school at once, use the <a href="/admissions.html">"When can my child join?" checker</a> — enter the date of birth and each school card shows the year and when to apply.</p>

      <h2>When each school takes applications</h2>
      <p>Usual month applications open, and the status when we last checked (${esc(checkedText)}):</p>
      <ul class="guide-points">
${months}
        <li><strong>Month not published:</strong> ${unknown.map(s => `${schoolLink(s)} <span class="muted">(${esc(statusShort(s))})</span>`).join(", ")}</li>
      </ul>
      <p><a href="/admission-calendar/">Printable one-page admission calendar →</a></p>

      <h2>LKG age rule, school by school</h2>
      <div class="guide-table-wrap">
        <table class="guide-table guide-table-narrow">
          <thead><tr><th>School</th><th>Class name</th><th>Age</th></tr></thead>
          <tbody>
            ${ruleRows}
          </tbody>
        </table>
      </div>
      <p class="muted guide-small">Only schools that publish their rule are listed. Note that some schools name their classes differently — for example, The Choice School's "KG (LKG)" starts at 3 years.</p>

      <h2>Documents to keep ready</h2>
      <ul class="guide-points">
        <li><strong>Birth certificate</strong> — asked by every school (Rajagiri wants the page showing the child's name, date of birth and parents' names).</li>
        <li><strong>Passport-size photo</strong> of the child (Rajagiri, Mar Thoma).</li>
        <li><strong>Immunisation / vaccination card</strong> (Mar Thoma, Delhi Public School).</li>
        <li><strong>Aadhaar</strong> — of the child, and at some schools also the parents (Mar Thoma, Delhi Public School).</li>
      </ul>

      <h2>How schools choose</h2>
      <ul class="guide-points">
        <li><strong>First-come, first-served:</strong> Mar Thoma says KG seats are given mainly in order of application (siblings get preference).</li>
        <li><strong>A friendly interaction, not a test:</strong> Mar Thoma and Delhi Public School (no entrance test up to Grade 4); TIPS says there is no entrance exam for the early years.</li>
        <li><strong>Strict age check:</strong> Rajagiri rejects applications that don't meet its age rule.</li>
      </ul>

      <h2>Never miss the date</h2>
      <p>On the <a href="/admissions.html">school admissions page</a>, each school card has a <strong>Remind me</strong> button: it puts a reminder in your phone's calendar for the month that school usually opens applications.</p>

      <p class="muted guide-small">Kochi Kids Calendar is an independent, free guide — not connected to any school. We never rate or rank schools. Details come from each school's own website or notice; always confirm with the school before applying.</p>

      <div class="card-actions guide-cta">
        <a class="btn" href="/admissions.html">See all ${schools.length} schools and check your child's age</a>
      </div>
    </article>`;
}

const lkgUrl = `${SITE}/lkg-admission-guide/`;
files.set("lkg-admission-guide/index.html", page({
  title: `LKG admission in Kochi ${NEXT_SESSION}-${String(NEXT_SESSION + 1).slice(2)}: age rules, dates and documents | Kochi Kids Calendar`,
  description: `When popular Kochi schools take LKG applications, the age rule (4 to under 5 years on 1 June), which year your child joins, documents to keep ready — for ${schools.length} schools.`,
  url: lkgUrl, image: "og-admissions.jpg", active: "schools",
  h1: "LKG admission in Kochi: a parent's guide", eyebrow: "Kochi Kids Calendar · Guide",
  intro: "Age rules, when each school takes applications, documents to keep ready — in 5 minutes.",
  body: lkgGuideBody(),
}));
sitemap.push({ loc: lkgUrl, lastmod: latestCheck || null, priority: "0.9" });

function calendarBody() {
  const { groups, unknown } = byApplyMonth(schools);
  const line = s => {
    const r = lkgRule(s);
    return `<tr><td><strong>${esc(s.school)}</strong> <span class="muted">· ${esc(s.area)}</span></td><td>${r ? esc(`${r.minAge}–${r.maxAge} yrs on ${Number(r.cutoff.split("-")[1])} ${SHORT_MONTHS[Number(r.cutoff.split("-")[0]) - 1]}`) : "Ask school"}</td><td>${esc(statusShort(s))}</td></tr>`;
  };
  const sections = groups.map(g => `          <tr class="cal-month"><th colspan="3">${MONTHS[g.month - 1]}</th></tr>\n          ${g.schools.map(line).join("\n          ")}`).join("\n");
  return `    <div class="print-actions"><button type="button" class="btn" onclick="window.print()">Print / save as PDF</button></div>
    <section class="cal-sheet">
      <div class="cal-head">
        <div>
          <p class="cal-title">School admissions in Kochi — when to apply</p>
          <p class="cal-sub">Pre-KG / LKG / UKG · ${esc(String(NEXT_SESSION))}-${esc(String(NEXT_SESSION + 1).slice(2))} and later · LKG age rule and status as of ${esc(checkedText)}</p>
        </div>
        <img class="cal-qr" src="/qr-admissions.svg" alt="QR code: kochikidscalendar.com/admissions.html" width="96" height="96">
      </div>
      <table class="cal-table">
        <thead><tr><th>Applications usually open · School</th><th>LKG age</th><th>Status</th></tr></thead>
        <tbody>
${sections}
          <tr class="cal-month"><th colspan="3">Month not published — ask the school</th></tr>
          ${unknown.map(line).join("\n          ")}
        </tbody>
      </table>
      <p class="cal-foot">Scan the QR code or open <strong>kochikidscalendar.com/admissions.html</strong> — enter your child's date of birth to see the year your child can join each school, and set reminders. Free, independent guide by a Kochi parent; not connected to any school. Always confirm with the school.</p>
    </section>`;
}
const calUrl = `${SITE}/admission-calendar/`;
files.set("admission-calendar/index.html", page({
  title: "Kochi school admission calendar (printable) – when to apply for Pre-KG, LKG, UKG | Kochi Kids Calendar",
  description: `One page: the month each of ${schools.length} popular Kochi schools usually opens Pre-KG/LKG/UKG applications, the LKG age rule and current status. Free to print and share.`,
  url: calUrl, image: "og-admissions.jpg", active: "schools", bodyClass: "print-page",
  h1: "Admission calendar (printable)", eyebrow: "Kochi Kids Calendar",
  intro: "One page to print, save as PDF or share with other parents.",
  body: calendarBody(),
}));
sitemap.push({ loc: calUrl, lastmod: latestCheck || null, priority: "0.7" });

// Parent's guide (hand-written body in tools/guide-content.html)
const guideUrl = `${SITE}/olympiad-guide/`;
files.set("olympiad-guide/index.html", page({
  title: "Olympiads for Class 1–5: a guide for Kochi parents – SOF, SilverZone, Unified Council | Kochi Kids Calendar",
  description: "Which Olympiads can Class 1–5 children in Kochi take, which go only through the school and which parents can register for directly, fees, dates, Level 2 and free sample papers.",
  url: guideUrl, image: "og-image.jpg", active: "competitions",
  h1: "Olympiads for Class 1–5: a parent's guide", eyebrow: "Kochi Kids Calendar · Guide",
  intro: "SOF, SilverZone and Unified Council explained in 5 minutes — who registers, what it costs, when the exams are and how to prepare.",
  body: fs.readFileSync(path.join(__dirname, "guide-content.html"), "utf8").replace(/\s+$/, ""),
}));
sitemap.push({ loc: guideUrl, lastmod: null, priority: "0.9" });

files.set("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map(u => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${isoDay(u.lastmod)}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`);

// Existing generated files (so removed entries lose their page)
function listGenerated() {
  const out = new Set(["sitemap.xml"]);
  for (const dir of ["competitions", "schools", "olympiad-guide", "lkg-admission-guide", "admission-calendar"]) {
    const base = path.join(ROOT, dir);
    if (!fs.existsSync(base)) continue;
    (function walk(d) {
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, f.name);
        if (f.isDirectory()) walk(full); else out.add(path.relative(ROOT, full).split(path.sep).join("/"));
      }
    })(base);
  }
  return out;
}

const existing = listGenerated();
const stale = [];
for (const [rel, content] of files) {
  const full = path.join(ROOT, rel);
  const old = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
  if (old !== content) stale.push(rel);
}
const removed = [...existing].filter(rel => !files.has(rel));

if (CHECK) {
  if (stale.length || removed.length) {
    console.error("Pages are out of date. Run: node tools/build-pages.js");
    [...stale, ...removed].forEach(f => console.error("  " + f));
    process.exit(1);
  }
  console.log(`Pages are up to date (${files.size} files).`);
} else {
  for (const rel of removed) fs.rmSync(path.join(ROOT, rel));
  for (const dir of ["competitions", "schools"]) {
    // tidy empty folders left by removed entries
    const base = path.join(ROOT, dir);
    if (fs.existsSync(base)) for (const f of fs.readdirSync(base)) {
      const full = path.join(base, f);
      if (fs.statSync(full).isDirectory() && fs.readdirSync(full).length === 0) fs.rmdirSync(full);
    }
  }
  for (const [rel, content] of files) {
    const full = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  console.log(`Wrote ${files.size} files (${stale.length} changed, ${removed.length} removed).`);
}
