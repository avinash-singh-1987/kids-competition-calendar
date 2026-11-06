// Kids Competition Calendar
// Reads competitions.json, then shows upcoming deadlines and the filtered list.
// You should not need to edit this file to add competitions — edit competitions.json.

const DEADLINE_WINDOW_DAYS = 30;
const BASE_TYPES = ["Olympiad", "Scholarship", "Drawing", "GK", "Quiz"];

let allCompetitions = [];

// ---------- Date helpers ----------

// Turns "2026-12-15" into a date at midnight local time. Returns null if empty/invalid.
function parseDate(text) {
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
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

function formatDate(text) {
  const date = parseDate(text);
  if (!date) return "To be announced";
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

// A competition is "finished" once its exam date has passed.
// If no exam date is given, we use the registration date instead.
function isFinished(c) {
  const end = parseDate(c.examDate) || parseDate(c.registrationLastDate);
  return end ? end < today() : false;
}

function isRegistrationClosed(c) {
  const reg = parseDate(c.registrationLastDate);
  return reg ? reg < today() : false;
}

function sortByDates(a, b) {
  const far = new Date(9999, 0, 1);
  const regA = parseDate(a.registrationLastDate) || far;
  const regB = parseDate(b.registrationLastDate) || far;
  // Open registrations first, then by nearest date.
  const closedA = isRegistrationClosed(a), closedB = isRegistrationClosed(b);
  if (closedA !== closedB) return closedA ? 1 : -1;
  if (closedA) return (parseDate(a.examDate) || far) - (parseDate(b.examDate) || far);
  return regA - regB;
}

// ---------- Rendering ----------

function renderDeadlines(list) {
  const ul = document.getElementById("deadline-list");
  ul.innerHTML = "";
  const now = today();

  const upcoming = list
    .map(c => ({ c, days: parseDate(c.registrationLastDate) ? daysBetween(now, parseDate(c.registrationLastDate)) : null }))
    .filter(x => x.days !== null && x.days >= 0 && x.days <= DEADLINE_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days);

  if (upcoming.length === 0) {
    ul.appendChild(el("li", "empty", "No registration deadlines in the next 30 days."));
    return;
  }

  upcoming.forEach(({ c, days }) => {
    const li = el("li");
    const left = el("div");
    left.appendChild(el("div", "deadline-name", c.name));
    left.appendChild(el("div", "muted", `Register by ${formatDate(c.registrationLastDate)} · ${formatClasses(c.classes)}`));
    const label = days === 0 ? "Last day today!" : days === 1 ? "1 day left" : `${days} days left`;
    li.appendChild(left);
    li.appendChild(el("div", "days-left" + (days <= 7 ? " urgent" : ""), label));
    ul.appendChild(li);
  });
}

function renderCard(c) {
  const card = el("article", "card" + (c.sample ? " is-sample" : ""));

  const badges = el("div", "badges");
  if (c.sample) badges.appendChild(el("span", "badge sample", "SAMPLE – not real"));
  if (c.type) badges.appendChild(el("span", "badge", c.type));
  if (isRegistrationClosed(c)) badges.appendChild(el("span", "badge closed", "Registration closed"));
  card.appendChild(badges);

  card.appendChild(el("h3", null, c.name || "Unnamed competition"));
  card.appendChild(el("p", "organiser", c.organiser || ""));

  const details = el("dl", "details");
  [
    ["Classes", formatClasses(c.classes)],
    ["Register by", formatDate(c.registrationLastDate)],
    ["Exam date", formatDate(c.examDate)],
    ["Fee", c.fee || "—"],
    ["Mode", c.mode || "—"],
  ].forEach(([label, value]) => {
    const row = el("div");
    row.appendChild(el("dt", null, label));
    row.appendChild(el("dd", null, value));
    details.appendChild(row);
  });
  card.appendChild(details);

  const url = safeLink(c.link);
  if (url) {
    const a = el("a", "btn", c.sample ? "Example link (sample)" : "Official website ↗");
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
  filtered.sort(sortByDates).forEach(c => container.appendChild(renderCard(c)));
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
