// School Admissions – Kochi
// Reads admissions.json and shows each school's entry class, age rule and admission status.
// If a parent enters their child's date of birth, every card also shows when the child
// can join and when to apply. The date of birth stays in this browser only.

const DOB_KEY = "kcc-child-dob";

// ---------- Small helpers ----------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function parseDate(text) {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [y, m, d] = text.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date) ? null : date;
}

function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

function formatDate(d) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function safeLink(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

function slugify(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function ymd(d) {
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
}

function track(name) {
  try {
    if (window.goatcounter && typeof window.goatcounter.count === "function") {
      window.goatcounter.count({ path: name, title: name, event: true });
    }
  } catch (e) { /* counting must never break the page */ }
}

// Full years of age on a given date.
function ageOn(dob, date) {
  let age = date.getFullYear() - dob.getFullYear();
  const before = date.getMonth() < dob.getMonth() ||
    (date.getMonth() === dob.getMonth() && date.getDate() < dob.getDate());
  return before ? age - 1 : age;
}

// "06-01" + 2027 -> 1 June 2027
function cutoffDate(rule, year) {
  const [m, d] = rule.cutoff.split("-").map(Number);
  return new Date(year, m - 1, d);
}

function ruleText(rule) {
  const on = cutoffDate(rule, 2000).toLocaleDateString("en-IN", { day: "numeric", month: "long" });
  if (rule.maxAge) return `${rule.minAge} to under ${rule.maxAge} years on ${on}`;
  return `${rule.minAge}+ years on ${on}`;
}

// Session years start in June (or April for KV). The "current" session to plan for is
// the next one that has not started yet.
function firstPlannableYear(sessionMonth) {
  const t = today();
  return t.getMonth() + 1 >= (sessionMonth || 6) ? t.getFullYear() + 1 : t.getFullYear();
}

// When can a child with this date of birth join, under this rule?
function eligibility(rule, dob, school) {
  const start = firstPlannableYear(school.sessionMonth);
  for (let year = start; year < start + 8; year++) {
    const age = ageOn(dob, cutoffDate(rule, year));
    if (age < rule.minAge) continue;
    if (rule.maxAge && age >= rule.maxAge) {
      return year === start ? { tooOld: true } : null;
    }
    return { year };
  }
  return null;
}

function thisRoundOpen(s, year) {
  return s.status === "open" && year === firstPlannableYear(s.sessionMonth);
}

function applyDate(school, sessionYear) {
  if (!school.applyMonth) return null;
  const sessionMonth = school.sessionMonth || 6;
  const y = school.applyMonth >= sessionMonth ? sessionYear - 1 : sessionYear;
  return new Date(y, school.applyMonth - 1, 1);
}

// ---------- Status ----------

function statusChip(s) {
  switch (s.status) {
    case "open": return el("span", "status status-open", "Open now");
    case "closed": return el("span", "status status-closed", "Closed for 2027-28");
    case "expected": return el("span", "status status-expected", "Expected: " + (s.expectedText || "soon"));
    default: return el("span", "status status-check", "Check with school");
  }
}

// ---------- Rendering ----------

const SCHOOL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5M9 12h.01M15 12h.01"/></svg>';
const CAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>';
const SHARE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/><path d="M9 10.5c.5 1.8 2.2 3.5 4.5 4.3l1.3-1.2 1.7.8"/></svg>';

let schools = [];
let childDob = null;

function actionLink(href, icon, label, trackName) {
  const a = el("a", "btn-secondary");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.innerHTML = icon; // fixed drawing from this file
  a.appendChild(el("span", null, label));
  a.addEventListener("click", () => track(trackName));
  return a;
}

function reminderUrl(s, when, title) {
  const end = new Date(when);
  end.setDate(end.getDate() + 1);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: ymd(when) + "/" + ymd(end),
    details: `${s.school} (${s.area}) usually opens admissions around this month. Check the school's notice: ${s.link}\n\nKochi Kids Calendar: ${location.origin + location.pathname}#${slugify(s.school)}`,
  });
  return "https://calendar.google.com/calendar/render?" + params.toString();
}

function whatsappUrl(s) {
  const lines = [`*${s.school}* (${s.area}) – admissions`];
  s.entry.forEach(r => lines.push(`${r.class}: ${ruleText(r)}`));
  if (s.applyMonth) lines.push(`Applications usually open: ${MONTHS[s.applyMonth - 1]}`);
  lines.push("", "Details: " + location.origin + location.pathname + "#" + slugify(s.school));
  return "https://wa.me/?text=" + encodeURIComponent(lines.join("\n"));
}

function renderCard(s, i) {
  const card = el("article", "card t-school");
  card.id = slugify(s.school);
  card.style.setProperty("--i", i);

  const top = el("div", "card-top");
  const icon = el("div", "type-icon");
  icon.innerHTML = SCHOOL_ICON;
  icon.setAttribute("aria-hidden", "true");
  const titles = el("div");
  titles.appendChild(el("h3", null, s.school));
  titles.appendChild(el("p", "organiser", `${s.area} · ${s.board}`));
  top.appendChild(icon);
  top.appendChild(titles);
  card.appendChild(top);

  const badges = el("div", "badges");
  badges.appendChild(statusChip(s));
  badges.appendChild(s.unverified
    ? el("span", "badge unverified", "Not yet confirmed")
    : el("span", "badge confirmed", "From school website ✓"));
  card.appendChild(badges);

  if (s.why) card.appendChild(el("p", "why", s.why));

  const details = el("dl", "details");
  const rows = [];
  if (s.entry.length) {
    s.entry.forEach(r => rows.push([`${r.class} age rule`, ruleText(r)]));
  } else {
    rows.push(["Age rule", "Ask the school"]);
  }
  rows.push(["Applications usually open", s.applyMonth ? MONTHS[s.applyMonth - 1] : "Ask the school"]);
  rows.forEach(([label, value]) => {
    const row = el("div");
    row.appendChild(el("dt", null, label));
    row.appendChild(el("dd", null, value));
    details.appendChild(row);
  });
  card.appendChild(details);

  // Personal line for the parent's child
  let reminder = null;
  if (childDob) {
    const box = el("div", "for-child");
    if (!s.entry.length) {
      box.appendChild(el("strong", null, "For your child: "));
      box.appendChild(document.createTextNode("ask the school for its age rule."));
    } else {
      const results = s.entry.map(r => ({ r, res: eligibility(r, childDob, s) }));
      const anyFits = results.some(x => x.res && !x.res.tooOld);
      if (!anyFits && results.some(x => x.res && x.res.tooOld)) {
        const line = el("p");
        line.appendChild(el("strong", null, "For your child: "));
        line.appendChild(document.createTextNode("past the kindergarten entry age here — ask the school about Class 1."));
        box.appendChild(line);
      }
      if (anyFits) results.forEach(({ r, res }) => {
        if (anyFits && (!res || res.tooOld)) return; // only show the classes that fit

        const line = el("p");
        line.appendChild(el("strong", null, `${r.class}: `));
        if (!res) line.appendChild(document.createTextNode("not within the next few years — check with the school."));
        else if (res.tooOld) line.appendChild(document.createTextNode("your child is past this entry age — ask about higher classes."));
        else {
          const sessionStart = new Date(res.year, (s.sessionMonth || 6) - 1, 1);
          let text = `can join in ${MONTHS[sessionStart.getMonth()]} ${res.year} (${res.year}-${String(res.year + 1).slice(2)} session).`;
          const apply = applyDate(s, res.year);
          if (apply) {
            const thisRound = res.year === firstPlannableYear(s.sessionMonth);
            if (apply >= today()) text += ` Apply around ${MONTHS[apply.getMonth()]} ${apply.getFullYear()}.`;
            else if (thisRound && s.status === "open") text += " Admissions are open now — apply soon.";
            else if (thisRound && s.status === "closed") text += " Admissions for that session have closed.";
            else text += ` Applications usually opened in ${MONTHS[apply.getMonth()]} ${apply.getFullYear()} — check with the school now.`;
            if (apply >= today() && !reminder) reminder = { when: apply, cls: r.class, year: res.year };
          }
          if (!s.applyMonth && thisRoundOpen(s, res.year)) text += " Admissions are open now — apply soon.";
          line.appendChild(document.createTextNode(text));
        }
        box.appendChild(line);
      });
    }
    card.appendChild(box);
  }

  if (s.statusNote) card.appendChild(el("p", "note", s.statusNote));

  const sourceUrl = safeLink(s.source);
  if (sourceUrl) {
    const line = el("p", "source-line");
    line.appendChild(document.createTextNode("Source: "));
    const a = el("a", null, ({ official: "School / official", news: "News report", blog: "Listing site" }[s.sourceType] || "Link") + " ↗");
    a.href = sourceUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    line.appendChild(a);
    const checked = parseDate(s.checkedOn);
    if (checked) line.appendChild(document.createTextNode(" · Checked " + formatDate(checked)));
    card.appendChild(line);
  }

  const actions = el("div", "card-actions");
  const url = safeLink(s.link);
  if (url) {
    const a = el("a", "btn", (s.linkLabel || "School website") + " ↗");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.addEventListener("click", () => track("click-school-link"));
    actions.appendChild(a);
  }
  const row = el("div", "secondary-actions");
  if (reminder) {
    row.appendChild(actionLink(
      reminderUrl(s, reminder.when, `Apply: ${s.school} ${reminder.cls} (${reminder.year}-${String(reminder.year + 1).slice(2)})`),
      CAL_ICON, "Remind me", "click-admission-reminder"));
  } else if (s.applyMonth) {
    const next = applyDate(s, firstPlannableYear(s.sessionMonth));
    const when = next && next >= today() ? next : applyDate(s, firstPlannableYear(s.sessionMonth) + 1);
    row.appendChild(actionLink(reminderUrl(s, when, `Check admissions: ${s.school}`), CAL_ICON, "Remind me", "click-admission-reminder"));
  }
  row.appendChild(actionLink(whatsappUrl(s), SHARE_ICON, "WhatsApp", "click-whatsapp"));
  actions.appendChild(row);
  card.appendChild(actions);
  return card;
}

function render() {
  const list = document.getElementById("school-list");
  list.innerHTML = "";
  document.getElementById("count").textContent = schools.length;
  schools.forEach((s, i) => list.appendChild(renderCard(s, i)));
}

// ---------- Date of birth box ----------

function loadDob() {
  try { return localStorage.getItem(DOB_KEY); } catch (e) { return null; }
}

function saveDob(value) {
  try {
    if (value) localStorage.setItem(DOB_KEY, value);
    else localStorage.removeItem(DOB_KEY);
  } catch (e) { /* private mode etc. — page still works */ }
}

function setupDob() {
  // Day / Month / Year dropdowns (Indian order), instead of the browser's date box,
  // which shows month/day/year on many phones.
  const daySel = document.getElementById("dob-day");
  const monthSel = document.getElementById("dob-month");
  const yearSel = document.getElementById("dob-year");
  const clear = document.getElementById("clear-dob");
  const summary = document.getElementById("dob-summary");
  const t = today();

  for (let d = 1; d <= 31; d++) daySel.appendChild(new Option(String(d), String(d)));
  MONTHS.forEach((m, k) => monthSel.appendChild(new Option(m, String(k + 1))));
  for (let y = t.getFullYear(); y >= t.getFullYear() - 10; y--) yearSel.appendChild(new Option(String(y), String(y)));

  function pad(n) { return String(n).padStart(2, "0"); }

  // Returns "YYYY-MM-DD" when all three are chosen and the date is real, "" if not complete, null if invalid.
  function readValue() {
    const d = Number(daySel.value), m = Number(monthSel.value), y = Number(yearSel.value);
    if (!d || !m || !y) return "";
    const date = new Date(y, m - 1, d);
    if (date.getMonth() !== m - 1 || date > t) return null; // e.g. 31 February, or a future date
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  function apply(value) {
    childDob = value ? parseDate(value) : null;
    clear.hidden = !(daySel.value || monthSel.value || yearSel.value);
    if (value === null) summary.textContent = "Please check the date — that day doesn't exist in this month.";
    else summary.textContent = childDob ? `Showing when a child born on ${formatDate(childDob)} can join each school.` : "";
    render();
  }

  const saved = loadDob();
  const savedDate = saved && parseDate(saved);
  if (savedDate) {
    daySel.value = String(savedDate.getDate());
    monthSel.value = String(savedDate.getMonth() + 1);
    yearSel.value = String(savedDate.getFullYear());
  }
  apply(readValue());

  [daySel, monthSel, yearSel].forEach(sel => sel.addEventListener("change", () => {
    const value = readValue();
    if (value) { saveDob(value); track("used-age-checker"); }
    apply(value);
  }));
  clear.addEventListener("click", () => {
    daySel.value = ""; monthSel.value = ""; yearSel.value = "";
    saveDob("");
    apply("");
  });
}

// ---------- Start ----------

async function start() {
  try {
    const res = await fetch("admissions.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("not found");
    const data = JSON.parse(await res.text());
    if (!Array.isArray(data)) throw new Error("not a list");
    schools = data.filter(s => s && s.school).map(s => ({ ...s, entry: Array.isArray(s.entry) ? s.entry : [] }));
  } catch (e) {
    const box = document.getElementById("error");
    box.textContent = "Could not load the school list (admissions.json). " + (e.message || "");
    box.hidden = false;
    return;
  }
  // Keep the order from admissions.json (most popular schools first).
  const open = schools.filter(s => s.status === "open" || s.status === "expected").length;
  document.getElementById("stat-schools").textContent = schools.length;
  document.getElementById("stat-open").textContent = open;
  setupDob();
  const id = decodeURIComponent(location.hash.slice(1));
  const card = id && document.getElementById(id);
  if (card) {
    card.classList.add("highlight");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

start();
