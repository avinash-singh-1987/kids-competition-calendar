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

// ---------- Rendering ----------

function renderDeadlines(list) {
  const ul = document.getElementById("deadline-list");
  ul.innerHTML = "";
  const now = today();

  const upcoming = list
    .map(c => ({ c, ev: nextEvent(c) }))
    .filter(x => x.ev && daysBetween(now, x.ev.date) <= DEADLINE_WINDOW_DAYS)
    .sort((a, b) => a.ev.date - b.ev.date);

  if (upcoming.length === 0) {
    ul.appendChild(el("li", "empty", "Nothing due in the next 30 days."));
    return;
  }

  upcoming.forEach(({ c, ev }) => {
    const days = daysBetween(now, ev.date);
    const isExam = ev.kind === "exam";
    const li = el("li");
    const left = el("div");
    left.appendChild(el("div", "deadline-name", c.name));
    let detail = (isExam ? "Exam: " : "Register by ") + formatDate(ev.date);
    if (isExam && upcomingExamDates(c).length > 1) detail += " (one of the school's date options)";
    left.appendChild(el("div", "muted", `${detail} · ${formatClasses(c.classes)}`));

    let label;
    if (days === 0) label = isExam ? "Exam today" : "Last day today!";
    else label = (isExam ? "Exam in " : "") + (days === 1 ? "1 day" : `${days} days`) + (isExam ? "" : " left");

    li.appendChild(left);
    li.appendChild(el("div", "days-left" + (days <= 7 ? " urgent" : "") + (isExam ? " exam" : ""), label));
    ul.appendChild(li);
  });
}

function renderCard(c) {
  const card = el("article", "card" + (c.sample ? " is-sample" : ""));

  const badges = el("div", "badges");
  if (c.sample) badges.appendChild(el("span", "badge sample", "SAMPLE – not real"));
  if (c.unverified) badges.appendChild(el("span", "badge unverified", "Unverified – confirm dates"));
  if (c.type) badges.appendChild(el("span", "badge", c.type));
  if (isRegistrationClosed(c)) badges.appendChild(el("span", "badge closed", "Registration closed"));
  card.appendChild(badges);

  card.appendChild(el("h3", null, c.name || "Unnamed competition"));
  card.appendChild(el("p", "organiser", c.organiser || ""));

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
  const classValue = document.getElementById("class-filter").value;
  const typeValue = document.getElementById("type-filter").value;

  const filtered = allCompetitions.filter(c => {
    const classOk = classValue === "all" || (Array.isArray(c.classes) && c.classes.map(String).includes(classValue));
    const typeOk = typeValue === "all" || c.type === typeValue;
    return classOk && typeOk;
  });

  const container = document.getElementById("competition-list");
  container.innerHTML = "";
  document.getElementById("count").textContent = `(${filtered.length})`;

  if (filtered.length === 0) {
    container.appendChild(el("p", "empty", "No competitions match these filters."));
    return;
  }
  filtered.sort(sortByNextEvent).forEach(c => container.appendChild(renderCard(c)));
}

function fillTypeFilter() {
  const select = document.getElementById("type-filter");
  const types = new Set(BASE_TYPES);
  allCompetitions.forEach(c => c.type && types.add(c.type)); // new types appear automatically
  types.forEach(t => select.appendChild(new Option(t, t)));
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
  fillTypeFilter();
  renderDeadlines(allCompetitions);
  renderList();

  document.getElementById("class-filter").addEventListener("change", renderList);
  document.getElementById("type-filter").addEventListener("change", renderList);
}

start();
