// Kids Competition Calendar
// Reads competitions.json, then shows upcoming deadlines/exams and the filtered list.
// You should not need to edit this file to add competitions — edit competitions.json.

const DEADLINE_WINDOW_DAYS = 30;
const BASE_TYPES = ["Olympiad", "Scholarship", "Drawing", "GK", "Quiz"];

let allCompetitions = [];

// ---------- Date helpers ----------

// Turns "2026-12-15" into a date at midnight local time. Returns null if empty/invalid.
function parseDate(text) {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [y, m, d] = text.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date) ? null : date;
}

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysBetween(from, to) {
  return Math.round((to - from) / 86400000);
}

function formatDate(date) {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatClasses(classes) {
  if (!Array.isArray(classes) || classes.length === 0) return "—";
  const sorted = [...classes].map(Number).sort((a, b) => a - b);
  const isRange = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
  if (sorted.length > 2 && isRange) return `Class ${sorted[0]}–${sorted[sorted.length - 1]}`;
  return "Class " + sorted.join(", ");
}

// Only allow normal web links.
function safeLink(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

// Small helper to create an element with text (text is never treated as HTML).
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------- Rules ----------

// All exam dates of a competition, sorted. Supports "examDate" (one date)
// and "examDates" (a list, when the school picks one of several dates).
function examDates(c) {
  const list = Array.isArray(c.examDates) ? c.examDates : [c.examDate];
  return list.map(parseDate).filter(Boolean).sort((a, b) => a - b);
}

function upcomingExamDates(c) {
  return examDates(c).filter(d => d >= today());
}

// A competition is "finished" once its LAST exam date has passed.
// If no exam date is given, we use the registration date instead.
function isFinished(c) {
  const dates = examDates(c);
  const end = dates.length ? dates[dates.length - 1] : parseDate(c.registrationLastDate);
  return end ? end < today() : false;
}

function isRegistrationClosed(c) {
  const reg = parseDate(c.registrationLastDate);
  return reg ? reg < today() : false;
}

// The next thing a parent must act on: registration deadline or exam, whichever comes first.
function nextEvent(c) {
  const events = [];
  const reg = parseDate(c.registrationLastDate);
  if (reg && reg >= today()) events.push({ kind: "register", date: reg });
  const exam = upcomingExamDates(c)[0];
  if (exam) events.push({ kind: "exam", date: exam });
  events.sort((a, b) => a.date - b.date);
  return events[0] || null;
}

function sortByNextEvent(a, b) {
  const far = new Date(9999, 0, 1);
  return ((nextEvent(a) || {}).date || far) - ((nextEvent(b) || {}).date || far);
}

function registerByText(c) {
  const reg = parseDate(c.registrationLastDate);
  if (reg) return formatDate(reg);
  return c.mode === "School-based" ? "Ask your school" : "Check official link";
}

function examText(c) {
  const upcoming = upcomingExamDates(c);
  if (upcoming.length === 0) return "To be announced";
  return upcoming.map(formatDate).join(" or ");
}

// ---------- Icons (small drawings for each competition type) ----------

const ICONS = {
  olympiad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10l-3 6h-4z"/><circle cx="12" cy="15" r="6"/><path d="M12 12.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" fill="currentColor" stroke="none"/></svg>',
  drawing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7" r="1.2" fill="currentColor"/></svg>',
  quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/><path d="M10.2 9.5a2 2 0 1 1 2.6 1.9c-.5.2-.8.6-.8 1.1v.5"/><circle cx="12" cy="15.6" r=".6" fill="currentColor"/></svg>',
  gk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/></svg>',
  scholarship: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M22 9v6"/></svg>',
  other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
};

const EMPTY_ART = '<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="20" y="14" width="80" height="66" rx="10" fill="#e6f4f1"/><path d="M20 26a10 10 0 0 1 10-10h60a10 10 0 0 1 10 10v6H20z" fill="#0f766e"/><circle cx="48" cy="54" r="12" fill="none" stroke="#0f766e" stroke-width="4"/><path d="M57 63l10 10" stroke="#0f766e" stroke-width="4" stroke-linecap="round"/></svg>';

function typeKey(type) {
  const key = String(type || "").toLowerCase();
  return ICONS[key] ? key : "other";
}

// ---------- Rendering ----------

const filters = { cls: "all", type: "all" };

function renderDeadlines(list) {
  const ul = document.getElementById("deadline-list");
  ul.innerHTML = "";
  const now = today();

  const upcoming = list
    .map(c => ({ c, ev: nextEvent(c) }))
    .filter(x => x.ev && daysBetween(now, x.ev.date) <= DEADLINE_WINDOW_DAYS)
    .sort((a, b) => a.ev.date - b.ev.date);

  document.getElementById("stat-soon").textContent = upcoming.length;

  if (upcoming.length === 0) {
    ul.appendChild(el("li", "empty", "Nothing due in the next 30 days."));
    return;
  }

  upcoming.forEach(({ c, ev }, i) => {
    const days = daysBetween(now, ev.date);
    const isExam = ev.kind === "exam";
    const urgent = days <= 7;
    const li = el("li");
    li.style.setProperty("--i", i);

    const tile = el("div", "date-tile" + (urgent ? " urgent" : ""));
    tile.appendChild(el("span", "day", String(ev.date.getDate())));
    tile.appendChild(el("span", "mon", ev.date.toLocaleDateString("en-IN", { month: "short" })));

    const body = el("div", "deadline-body");
    body.appendChild(el("div", "deadline-name", c.name));
    const meta = (isExam ? "Exam" : "Registration closes") + " · " + formatClasses(c.classes);
    const metaRow = el("div", "deadline-meta", meta + " ");
    body.appendChild(metaRow);

    let label;
    if (days === 0) label = isExam ? "Today" : "Last day!";
    else label = days === 1 ? "1 day" : `${days} days`;

    metaRow.appendChild(el("span", "days-left" + (urgent ? " urgent" : ""), label));
    li.appendChild(tile);
    li.appendChild(body);
    ul.appendChild(li);
  });
}

function renderCard(c, i) {
  const key = typeKey(c.type);
  const card = el("article", `card t-${key}` + (c.sample ? " is-sample" : ""));
  card.style.setProperty("--i", i);

  const top = el("div", "card-top");
  const icon = el("div", "type-icon");
  icon.innerHTML = ICONS[key]; // fixed drawings from this file, not from the data
  icon.setAttribute("aria-hidden", "true");
  const titles = el("div");
  titles.appendChild(el("h3", null, c.name || "Unnamed competition"));
  titles.appendChild(el("p", "organiser", c.organiser || ""));
  top.appendChild(icon);
  top.appendChild(titles);
  card.appendChild(top);

  const badges = el("div", "badges");
  if (c.sample) badges.appendChild(el("span", "badge sample", "SAMPLE – not real"));
  if (c.type) badges.appendChild(el("span", "badge", c.type));
  if (c.unverified) badges.appendChild(el("span", "badge unverified", "Unverified – confirm dates"));
  if (isRegistrationClosed(c)) badges.appendChild(el("span", "badge closed", "Registration closed"));
  card.appendChild(badges);

  const details = el("dl", "details");
  [
    ["Classes", formatClasses(c.classes)],
    ["Register by", registerByText(c)],
    ["Exam date", examText(c)],
    ["Fee", c.fee || "—"],
    ["Mode", c.mode || "—"],
  ].forEach(([label, value]) => {
    const row = el("div");
    row.appendChild(el("dt", null, label));
    row.appendChild(el("dd", null, value));
    details.appendChild(row);
  });
  card.appendChild(details);

  if (c.note) card.appendChild(el("p", "note", c.note));

  const url = safeLink(c.link);
  if (url) {
    const a = el("a", "btn", c.sample ? "Example link (sample)" : (c.linkLabel || "Official website") + " ↗");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    card.appendChild(a);
  }
  return card;
}

function renderList() {
  const filtered = allCompetitions.filter(c => {
    const classOk = filters.cls === "all" || (Array.isArray(c.classes) && c.classes.map(String).includes(filters.cls));
    const typeOk = filters.type === "all" || c.type === filters.type;
    return classOk && typeOk;
  });

  const container = document.getElementById("competition-list");
  container.innerHTML = "";
  document.getElementById("count").textContent = filtered.length;

  if (filtered.length === 0) {
    const box = el("div", "empty-state");
    box.innerHTML = EMPTY_ART;
    box.appendChild(el("p", null, "No competitions match these filters. Try another class or type."));
    container.appendChild(box);
    return;
  }
  filtered.sort(sortByNextEvent).forEach((c, i) => container.appendChild(renderCard(c, i)));
}

// Builds a row of tappable "chips" and keeps the chosen one highlighted.
function buildChips(containerId, options, filterName) {
  const box = document.getElementById(containerId);
  box.innerHTML = "";
  options.forEach(([value, label]) => {
    const chip = el("button", "chip", label);
    chip.type = "button";
    chip.setAttribute("aria-pressed", String(filters[filterName] === value));
    chip.addEventListener("click", () => {
      filters[filterName] = value;
      box.querySelectorAll(".chip").forEach(b => b.setAttribute("aria-pressed", String(b === chip)));
      renderList();
    });
    box.appendChild(chip);
  });
}

function buildFilters() {
  buildChips("class-chips",
    [["all", "All"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]], "cls");

  // Only show types that have at least one competition; new types appear automatically.
  const present = new Set(allCompetitions.map(c => c.type).filter(Boolean));
  const types = [...BASE_TYPES.filter(t => present.has(t)), ...[...present].filter(t => !BASE_TYPES.includes(t))];
  buildChips("type-chips", [["all", "All"], ...types.map(t => [t, t])], "type");
}

function showError(message) {
  const box = document.getElementById("error");
  box.textContent = message;
  box.hidden = false;
}

// ---------- Start ----------

async function start() {
  let data;
  try {
    const response = await fetch("competitions.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("not found");
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch (e) {
      showError("The competition list (competitions.json) has a typing mistake — often a missing comma or quote mark. " +
                "Details: " + e.message);
      return;
    }
  } catch (e) {
    showError(location.protocol === "file:"
      ? "This page can't read competitions.json when opened by double-clicking. Please open the website through its GitHub Pages address instead."
      : "Could not load the competition list. Please refresh the page.");
    return;
  }

  if (!Array.isArray(data)) {
    showError("competitions.json should start with [ and end with ].");
    return;
  }

  allCompetitions = data.filter(c => c && typeof c === "object" && !isFinished(c));
  document.getElementById("stat-total").textContent = allCompetitions.length;
  buildFilters();
  renderDeadlines(allCompetitions);
  renderList();
}

start();
