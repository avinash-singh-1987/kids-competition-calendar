// Kochi Kids Calendar – competitions page
// Reads competitions.json, then shows upcoming deadlines/exams and the filtered list.
// You should not need to edit this file to add competitions — edit competitions.json.

const DEADLINE_WINDOW_DAYS = 30;
const BASE_TYPES = ["Olympiad", "Scholarship", "Drawing", "GK", "Quiz"];

let allCompetitions = [];
// Yearly competitions whose exams are over (kept for up to NEXT_YEAR_KEEP_DAYS so parents can plan next year).
let pastCompetitions = [];
const NEXT_YEAR_KEEP_DAYS = 300;

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

// School-only Olympiads (SOF): the school must register "schoolLeadDays" days before the exam date
// it picks. From that rule we work out the last day a parent can still ask the school.
function schoolDeadlines(c) {
  const lead = Number(c.schoolLeadDays);
  if (!lead || parseDate(c.registrationLastDate)) return [];
  return upcomingExamDates(c).map(d => { const x = new Date(d); x.setDate(x.getDate() - lead); return x; });
}

// The registration deadline that matters now: the given one, or else the earliest school
// deadline that is still open (or, if all have passed, the last one — so it shows as closed).
function regDeadline(c) {
  const given = parseDate(c.registrationLastDate);
  if (given) return given;
  const list = schoolDeadlines(c);
  if (!list.length) return null;
  return list.find(d => d >= today()) || list[list.length - 1];
}

// "Ask your school" wording for school-only entries without a fixed deadline from the organiser.
function isAskSchool(c) {
  return !parseDate(c.registrationLastDate) && schoolDeadlines(c).length > 0;
}

function isRegistrationClosed(c) {
  const reg = regDeadline(c);
  return reg ? reg < today() : false;
}

// ---------- Planning for next year ----------

// All official dates of this year's round (including dates already past).
function seasonDates(c) {
  const list = Array.isArray(c.seasonDates) ? c.seasonDates.map(parseDate).filter(Boolean) : [];
  return (list.length ? list : examDates(c)).sort((a, b) => a - b);
}

function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function addYears(date, years) { const d = new Date(date); d.setFullYear(d.getFullYear() + years); return d; }

// This year's earliest "last day to register", only when it is known from the organiser:
// a given registration date, or the school deadline rule ("schoolLeadDays") for the first exam date.
function firstDeadlineThisYear(c) {
  const first = seasonDates(c)[0];
  const given = parseDate(c.registrationLastDate);
  const lead = Number(c.schoolLeadDays);
  const fromExam = first && lead ? addDays(first, -lead) : null;
  if (given && fromExam) return given < fromExam ? given : fromExam;
  return given || fromExam;
}

// When to remind the parent next year: a month before this year's first deadline,
// or (if no deadline is known) two months before this year's first exam — one year on.
function nextYearReminderDate(c) {
  const deadline = firstDeadlineThisYear(c);
  if (deadline) return addYears(addDays(deadline, -30), 1);
  const first = seasonDates(c)[0];
  return first ? addYears(addDays(first, -60), 1) : null;
}

// "early / mid / late Aug 2027" — an estimate should not look more exact than it is.
function roughDate(date) {
  const part = date.getDate() <= 10 ? "early" : date.getDate() <= 20 ? "mid" : "late";
  return part + " " + date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function dateRangeText(dates) {
  if (!dates.length) return "";
  const a = dates[0], b = dates[dates.length - 1];
  return +a === +b ? formatDate(a) : formatDate(a) + " – " + formatDate(b);
}

// Google Calendar reminder for next year: a month before this year's first deadline, one year on.
function nextYearReminderUrl(c) {
  const remind = nextYearReminderDate(c);
  if (!remind) return null;
  const deadline = firstDeadlineThisYear(c);
  const lines = ["This year's exams: " + dateRangeText(seasonDates(c)) + "."];
  if (deadline) lines.push("This year the last day to register (for the first exam date) was " + formatDate(deadline) + ".");
  lines.push(c.individual === "yes"
    ? "Check the official website for next year's registration."
    : "Ask your school whether it will take part next year, and check the official website for new dates.");
  if (safeLink(c.link)) lines.push("Official website: " + c.link);
  lines.push("Kochi Kids Calendar: " + location.origin + location.pathname);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: (c.individual === "yes" ? "Register for next year: " : "Ask school about next year: ") + c.name,
    // 9:00–9:30 am India time, so the phone's usual event alert arrives that morning.
    dates: ymd(remind) + "T090000/" + ymd(remind) + "T093000",
    ctz: "Asia/Kolkata",
    details: lines.join("\n"),
  });
  return "https://calendar.google.com/calendar/render?" + params.toString();
}

// The next thing a parent must act on: registration deadline or exam, whichever comes first.
function nextEvent(c) {
  const events = [];
  const reg = regDeadline(c);
  if (reg && reg >= today()) events.push({ kind: "register", date: reg });
  // School-only Olympiads: while asking the school is still possible, that is the thing to act on
  // (an earlier exam date whose deadline has passed is not).
  if (reg && reg >= today() && isAskSchool(c)) return events[0];
  const exam = upcomingExamDates(c)[0];
  if (exam) events.push({ kind: "exam", date: exam });
  events.sort((a, b) => a.date - b.date);
  return events[0] || null;
}

// Competitions parents can still act on come first; "registration closed" ones go to the end.
function sortByNextEvent(a, b) {
  const closed = Number(isRegistrationClosed(a)) - Number(isRegistrationClosed(b));
  if (closed) return closed;
  const far = new Date(9999, 0, 1);
  return ((nextEvent(a) || {}).date || far) - ((nextEvent(b) || {}).date || far);
}

function registerByText(c) {
  const reg = regDeadline(c);
  if (reg && isAskSchool(c)) {
    return reg < today()
      ? "Closed (school deadline was " + formatDate(reg) + ")"
      : "Ask your school before " + formatDate(reg);
  }
  if (reg) return formatDate(reg);
  return c.mode === "School-based" ? "Ask your school" : "Check official link";
}

// Can a parent register the child directly, without the school?
function individualText(c) {
  if (c.individual === "yes") return "Yes ✓";
  if (c.individual === "no") return "No — school only";
  return "Ask organiser";
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

// ---------- Sharing and calendar helpers ----------

const SOURCE_LABELS = { official: "Official website", news: "News report", blog: "Education blog" };

const ACTION_ICONS = {
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/><path d="M9 10.5c.5 1.8 2.2 3.5 4.5 4.3l1.3-1.2 1.7.8"/></svg>',
};

function slugify(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function pageUrl(c) {
  return location.origin + location.pathname + "#" + slugify(c.name);
}

function ymd(d) {
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
}

// The date to put in the parent's calendar: next exam, or else the registration deadline.
// While registration is still open, the reminder that helps most is the last day to register.
function calendarEvent(c) {
  const reg = regDeadline(c);
  if (reg && reg >= today()) return { date: reg, kind: "register" };
  const exam = upcomingExamDates(c)[0];
  if (exam) return { date: exam, kind: "exam" };
  return null;
}

function calendarUrl(c) {
  const ev = calendarEvent(c);
  if (!ev) return null;
  const end = new Date(ev.date);
  end.setDate(end.getDate() + 1);
  const lines = [];
  if (ev.kind === "exam" && upcomingExamDates(c).length > 1) lines.push("Exam date options: " + examText(c) + " (your school picks one)");
  lines.push("Classes: " + formatClasses(c.classes));
  lines.push("Register by: " + registerByText(c));
  if (c.unverified) lines.push("Dates not yet confirmed — please check with your school or the organiser.");
  if (safeLink(c.link)) lines.push("More info: " + c.link);
  lines.push("Kochi Kids Calendar: " + pageUrl(c));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: (ev.kind === "exam" ? "" : (isAskSchool(c) ? "Ask school to register: " : "Last day to register: ")) + c.name,
    dates: ymd(ev.date) + "/" + ymd(end),
    details: lines.join("\n"),
  });
  return "https://calendar.google.com/calendar/render?" + params.toString();
}

function whatsappUrl(c) {
  const lines = [
    "*" + c.name + "*",
    "Exam: " + examText(c),
    formatClasses(c.classes) + " · Register by: " + registerByText(c),
  ];
  if (c.unverified) lines.push("(Dates not yet confirmed — please check with your school)");
  lines.push("", "Details: " + pageUrl(c));
  return "https://wa.me/?text=" + encodeURIComponent(lines.join("\n"));
}

// Counts button clicks anonymously in GoatCounter (does nothing if the counter is blocked).
function track(name) {
  try {
    if (window.goatcounter && typeof window.goatcounter.count === "function") {
      window.goatcounter.count({ path: name, title: name, event: true });
    }
  } catch (e) { /* counting must never break the page */ }
}

function actionLink(className, href, iconSvg, label, trackName) {
  const a = el("a", className);
  if (trackName) a.addEventListener("click", () => track(trackName));
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.innerHTML = iconSvg; // fixed drawing from this file, not from the data
  a.appendChild(el("span", null, label));
  return a;
}

// ---------- Rendering ----------

const filters = { cls: "all", type: "all", who: "all" };

function renderDeadlines(list) {
  const ul = document.getElementById("deadline-list");
  ul.innerHTML = "";
  const now = today();

  const upcoming = list
    .map(c => ({ c, ev: nextEvent(c) }))
    .filter(x => x.ev && daysBetween(now, x.ev.date) <= DEADLINE_WINDOW_DAYS)
    // Only things a parent can still act on: skip exams whose registration has already closed.
    .filter(x => !(x.ev.kind === "exam" && isRegistrationClosed(x.c)))
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
    const what = !isExam ? (isAskSchool(c) ? "Last day to ask your school" : "Registration closes")
      : "Exam";
    const meta = what + " · " + formatClasses(c.classes);
    const metaRow = el("div", "deadline-meta", meta + " ");
    if (c.individual === "yes") body.appendChild(el("div", "direct-tag", "✓ Register directly · no school registration needed"));
    body.appendChild(metaRow);

    let label;
    if (days === 0) label = isExam ? "Today" : "Last day!";
    else label = days === 1 ? "1 day" : `${days} days`;

    metaRow.appendChild(el("span", "days-left" + (urgent ? " urgent" : ""), label));

    // The whole row is a link to the full card further down the page.
    const id = slugify(c.name);
    const link = el("a", "deadline-link");
    link.href = "#" + id;
    link.setAttribute("aria-label", c.name + " — see full details");
    link.appendChild(tile);
    link.appendChild(body);
    link.appendChild(el("span", "deadline-chevron", "›"));
    link.addEventListener("click", e => {
      e.preventDefault();
      openCard(id);
      track("click-coming-up");
    });
    li.appendChild(link);
    ul.appendChild(li);
  });
}

function renderCard(c, i) {
  const key = typeKey(c.type);
  const card = el("article", `card t-${key}` + (c.sample ? " is-sample" : ""));
  card.style.setProperty("--i", i);
  card.id = slugify(c.name);

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
  if (c.individual === "yes" && !c.sample) badges.appendChild(el("span", "badge direct", "✓ Register directly — no school registration needed"));
  if (!c.sample) {
    badges.appendChild(c.unverified
      ? el("span", "badge unverified", "Not yet confirmed")
      : el("span", "badge confirmed", "Confirmed ✓"));
  }
  if (isRegistrationClosed(c)) badges.appendChild(el("span", "badge closed", "Registration closed"));
  card.appendChild(badges);

  const details = el("dl", "details");
  [
    ["Classes", formatClasses(c.classes)],
    ["Register by", registerByText(c)],
    ["Exam date", examText(c)],
    ["Fee", c.fee || "—"],
    ["Mode", c.mode || "—"],
    ["Parents can register directly", individualText(c)],
  ].forEach(([label, value]) => {
    const row = el("div");
    row.appendChild(el("dt", null, label));
    row.appendChild(el("dd", null, value));
    details.appendChild(row);
  });
  card.appendChild(details);

  if (c.note) card.appendChild(el("p", "note", c.note));

  // Where this information came from, and when it was added
  const sourceUrl = safeLink(c.source);
  const updated = parseDate(c.updatedOn);
  const added = updated || parseDate(c.addedOn);
  if (sourceUrl || added) {
    const line = el("p", "source-line");
    if (sourceUrl) {
      line.appendChild(document.createTextNode("Source: "));
      const s = el("a", null, (SOURCE_LABELS[c.sourceType] || "Link") + " ↗");
      s.href = sourceUrl;
      s.target = "_blank";
      s.rel = "noopener noreferrer";
      line.appendChild(s);
    }
    if (added) line.appendChild(document.createTextNode((sourceUrl ? " · " : "") + (updated ? "Checked " : "Added ") + formatDate(added)));
    card.appendChild(line);
  }

  const actions = el("div", "card-actions");
  const url = safeLink(c.link);
  if (url) {
    const a = el("a", "btn", c.sample ? "Example link (sample)" : (c.linkLabel || "Official website") + " ↗");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.addEventListener("click", () => track("click-official-link"));
    actions.appendChild(a);
  }
  if (!c.sample) {
    const row = el("div", "secondary-actions");
    const cal = calendarUrl(c);
    if (cal) row.appendChild(actionLink("btn-secondary", cal, ACTION_ICONS.calendar, "Add to calendar", "click-calendar"));
    row.appendChild(actionLink("btn-secondary", whatsappUrl(c), ACTION_ICONS.share, "WhatsApp", "click-whatsapp"));
    actions.appendChild(row);
  }
  card.appendChild(actions);
  return card;
}

function matchesFilters(c) {
  const classOk = filters.cls === "all" || (Array.isArray(c.classes) && c.classes.map(String).includes(filters.cls));
  const typeOk = filters.type === "all" || c.type === filters.type;
  const whoOk = filters.who === "all" || c.individual === "yes";
  return classOk && typeOk && whoOk;
}

function renderList() {
  renderNextYear();
  // Yearly competitions whose registration has closed move to the "next year" section below.
  const filtered = allCompetitions.filter(c => !(c.repeatsYearly && isRegistrationClosed(c))).filter(matchesFilters);

  const container = document.getElementById("competition-list");
  container.innerHTML = "";
  document.getElementById("count").textContent = filtered.length;

  if (filtered.length === 0) {
    const box = el("div", "empty-state");
    box.innerHTML = EMPTY_ART;
    const noFilters = filters.cls === "all" && filters.type === "all" && filters.who === "all";
    box.appendChild(el("p", null, noFilters
      ? "Nothing is open for registration right now. New competitions are added every week — see \u201cClosed for this year\u201d below to plan for next year."
      : "No competitions match these filters. Try another class or type."));
    container.appendChild(box);
    return;
  }
  filtered.sort(sortByNextEvent).forEach((c, i) => container.appendChild(renderCard(c, i)));
}

// "Closed for this year — don't miss next year": this year's dates + a reminder for next year.
function renderNextYear() {
  const section = document.getElementById("next-year");
  if (!section) return;
  const list = [...allCompetitions.filter(c => c.repeatsYearly && isRegistrationClosed(c)), ...pastCompetitions]
    .filter(matchesFilters)
    .sort((a, b) => (nextYearReminderDate(a) || 0) - (nextYearReminderDate(b) || 0));
  const box = document.getElementById("next-year-list");
  box.innerHTML = "";
  section.hidden = list.length === 0;
  document.getElementById("next-year-count").textContent = list.length;
  list.forEach((c, i) => box.appendChild(renderNextYearCard(c, i)));
}

function renderNextYearCard(c, i) {
  const key = typeKey(c.type);
  const card = el("article", `card ny-card t-${key}`);
  card.style.setProperty("--i", i);
  card.id = slugify(c.name);

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

  const deadline = firstDeadlineThisYear(c);
  const details = el("dl", "details");
  const rows = [["Classes", formatClasses(c.classes)], ["This year's exams", dateRangeText(seasonDates(c))]];
  if (deadline) {
    rows.push([c.individual === "yes" ? "Next year, register before" : "Next year, ask your school before",
      roughDate(addYears(deadline, 1)) + " (approx.)"]);
  }
  rows.forEach(([label, value]) => {
    const row = el("div");
    row.appendChild(el("dt", null, label));
    row.appendChild(el("dd", null, value));
    details.appendChild(row);
  });
  card.appendChild(details);
  if (deadline) card.appendChild(el("p", "ny-hint", "This is a guess from this year's official dates. We will add next year's exact dates here when they are announced."));

  const actions = el("div", "card-actions");
  const remind = nextYearReminderUrl(c);
  if (remind) {
    const a = el("a", "btn", "🔔 Remind me next year");
    a.href = remind;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.addEventListener("click", () => track("click-remind-next-year"));
    actions.appendChild(a);
  }
  const url = safeLink(c.link);
  if (url) {
    const o = el("a", "ny-link", (c.linkLabel || "Official website") + " ↗");
    o.href = url;
    o.target = "_blank";
    o.rel = "noopener noreferrer";
    o.addEventListener("click", () => track("click-official-link"));
    actions.appendChild(o);
  }
  card.appendChild(actions);
  return card;
}

// Builds a row of tappable "chips" and keeps the chosen one highlighted.
function buildChips(containerId, options, filterName) {
  const box = document.getElementById(containerId);
  box.innerHTML = "";
  options.forEach(([value, label, sub]) => {
    const chip = el("button", sub ? "chip two-line" : "chip", label);
    if (sub) chip.appendChild(el("span", "chip-sub", sub));
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

  // "Who can apply": highlight competitions parents can register for directly.
  const direct = allCompetitions.filter(c => c.individual === "yes").length;
  const whoGroup = document.getElementById("who-group");
  if (whoGroup) whoGroup.hidden = direct === 0;
  const statDirect = document.getElementById("stat-direct");
  if (statDirect) {
    statDirect.textContent = direct;
    document.getElementById("stat-direct-item").hidden = direct === 0;
  }
  buildChips("who-chips", [["all", "Any"], ["yes", `✓ Register directly (${direct})`, "No school registration needed"]], "who");
}

function showError(message) {
  const box = document.getElementById("error");
  box.textContent = message;
  box.hidden = false;
}

// ---------- Start ----------

async function start() {
  let data;
  let lastModified = null;
  try {
    const response = await fetch("competitions.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("not found");
    lastModified = response.headers.get("Last-Modified");
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
  pastCompetitions = data.filter(c => c && typeof c === "object" && c.repeatsYearly && isFinished(c) &&
    examDates(c).length && daysBetween(examDates(c)[examDates(c).length - 1], today()) <= NEXT_YEAR_KEEP_DAYS);
  document.getElementById("stat-total").textContent = allCompetitions.length;
  showLastUpdated(data, lastModified);
  buildFilters();
  renderDeadlines(allCompetitions);
  renderList();
  scrollToLinkedCard();
}

// "Last updated" = the newer of: when the site was last published, or the newest entry date.
function showLastUpdated(data, lastModified) {
  let newest = null;
  data.forEach(c => {
    [c && c.addedOn, c && c.updatedOn].map(parseDate).forEach(d => { if (d && (!newest || d > newest)) newest = d; });
  });
  const published = lastModified ? new Date(lastModified) : null;
  if (published && !isNaN(published) && (!newest || published > newest)) newest = published;
  if (!newest) return;
  document.getElementById("last-updated").textContent = formatDate(newest);
  document.getElementById("updated-line").hidden = false;
}

// When someone opens a shared link (…#competition-name), jump to that card and highlight it.
// Scroll to a competition's card and highlight it. If the class/type filters
// are hiding it, reset them first so the card is always found.
function openCard(id) {
  let card = document.getElementById(id);
  if (!card) {
    filters.cls = "all";
    filters.type = "all";
    filters.who = "all";
    buildFilters();
    renderList();
    card = document.getElementById(id);
  }
  if (!card) return;
  document.querySelectorAll(".card.highlight").forEach(c => c.classList.remove("highlight"));
  void card.offsetWidth; // restart the highlight animation
  card.classList.add("highlight");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  try { history.replaceState(null, "", "#" + id); } catch (e) { /* not important */ }
}

// "#no-school": show only competitions parents can apply for without the school.
// "#direct" (used by the /no-school/ share link) does the same but stays at the top,
// so the announcement bar and its registration button are the first thing people see.
function showNoSchool(scroll = true) {
  filters.cls = "all";
  filters.type = "all";
  filters.who = "yes";
  buildFilters();
  renderList();
  if (!scroll) return;
  const target = document.getElementById("who-label") || document.getElementById("all-title");
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Hero pill "N without school registration": works even when #no-school is already in the address.
const statDirectLink = document.getElementById("stat-direct-link");
if (statDirectLink) statDirectLink.addEventListener("click", e => {
  e.preventDefault();
  if (location.hash !== "#no-school") history.replaceState(null, "", "#no-school");
  showNoSchool();
});

// Links to a card on the same page (e.g. from the announcement bar) open it too.
window.addEventListener("hashchange", () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id === "no-school") return showNoSchool();
  if (id === "direct") return showNoSchool(false);
  if (id && document.querySelector(".card")) openCard(id);
});

function scrollToLinkedCard() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  if (id === "no-school") return showNoSchool();
  if (id === "direct") return showNoSchool(false);
  const card = document.getElementById(id);
  if (!card) return;
  card.classList.add("highlight");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

start();
