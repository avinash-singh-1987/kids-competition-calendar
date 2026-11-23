// Playschools near you – Kochi
// Reads playschools.json (the list) and areas.json (areas for the dropdown).
// The parent's location is only used on this phone.

const AREA_KEY = "kcc-area"; // shared with the admissions page

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function safeLink(url) { return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null; }
function slugify(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function parseDate(text) {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDate(d) { return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function track(name) {
  try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: name, event: true }); } catch (e) { /* never break the page */ }
}

function kmBetween(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function kmText(km) { return km < 10 ? km.toFixed(1) : String(Math.round(km)); }

// Numbers in the top pills count up once when the page opens (skipped for people who prefer less motion).
function setCount(id, n) {
  const node = document.getElementById(id);
  if (!node) return;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !(n > 1) || !window.requestAnimationFrame) { node.textContent = n; return; }
  const start = performance.now(), ms = 700;
  const step = now => {
    const t = Math.min(1, (now - start) / ms);
    node.textContent = Math.round(n * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step); else node.textContent = n;
  };
  requestAnimationFrame(step);
}

let playschools = [];
let areas = [];
let origin = null;
let kind = "all";

function nearest(locations, from) {
  if (!from || !Array.isArray(locations)) return null;
  return locations.filter(l => typeof l.lat === "number" && typeof l.lng === "number")
    .map(l => ({ ...l, km: kmBetween(from, l) })).sort((a, b) => a.km - b.km)[0] || null;
}

// Google Maps search for this playschool: reviews, photos, phone and directions — on Google itself.
function mapsUrl(p) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${p.name.replace(/ – /g, " ")} ${p.area} Kochi`);
}

function matchesKind(p) {
  if (kind === "Daycare") return (p.kinds || []).includes("Daycare");
  if (kind === "school") return Boolean(p.partOf);
  return true;
}

function renderCard(p, i) {
  const card = el("article", "card t-school ps-card");
  card.style.setProperty("--i", i);
  card.id = slugify(p.name);

  const top = el("div", "card-top");
  const icon = el("div", "type-icon", "🧸");
  icon.setAttribute("aria-hidden", "true");
  const titles = el("div");
  titles.appendChild(el("h3", null, p.name));
  const sub = [p.area];
  if (p.partOf) sub.push("part of " + p.partOf);
  else if (p.chain) sub.push(p.chain + " chain");
  titles.appendChild(el("p", "organiser", sub.join(" · ")));
  top.appendChild(icon);
  top.appendChild(titles);
  card.appendChild(top);

  const badges = el("div", "badges");
  (p.kinds || []).forEach(k => badges.appendChild(el("span", "badge", k)));
  if (p.liveCamera) badges.appendChild(el("span", "badge live-cam", "📹 Live camera for parents"));
  badges.appendChild(p.sourceType === "official"
    ? el("span", "badge confirmed", "From its own website ✓")
    : el("span", "badge unverified", "From public listings — confirm with the playschool"));
  card.appendChild(badges);

  const near = nearest(p.locations, origin);
  if (near) {
    const line = el("p", "distance-line");
    // Only the area is known for some playschools: don't pretend to be exact.
    const inArea = near.approx && near.km < 1.5;
    const text = inArea ? `In the ${near.name || p.area} area` : `≈ ${kmText(near.km)} km away${near.approx ? " (area)" : ""}`;
    line.appendChild(el("strong", null, text));
    if (near.name && !inArea) line.appendChild(el("span", "muted", near.name));
    card.appendChild(line);
  }

  const rows = [];
  if (p.ages) rows.push(["Ages", p.ages]);
  if (p.liveCamera) rows.push(["Live camera", "Parents can watch a live CCTV view on their phone (as stated by the playschool)"]);
  if (rows.length) {
    const dl = el("dl", "details");
    rows.forEach(([k, v]) => { const r = el("div"); r.appendChild(el("dt", null, k)); r.appendChild(el("dd", null, v)); dl.appendChild(r); });
    card.appendChild(dl);
  }
  if (p.note) card.appendChild(el("p", "note", p.note));


  const src = safeLink(p.source);
  const checked = parseDate(p.checkedOn);
  if (src || checked) {
    const line = el("p", "source-line");
    if (src) {
      line.appendChild(document.createTextNode("Source: "));
      const a = el("a", null, (p.sourceType === "official" ? "Official website" : "Listing") + " ↗");
      a.href = src; a.target = "_blank"; a.rel = "noopener noreferrer";
      line.appendChild(a);
    }
    if (checked) line.appendChild(document.createTextNode((src ? " · " : "") + "Checked " + formatDate(checked)));
    card.appendChild(line);
  }

  // Owner (Nov 2026): the buttons must stay quieter than the playschool's name — light, small, one row.
  const actions = el("div", "card-actions ps-actions");
  const g = el("a", "btn-soft", "📍 Google Maps · reviews ↗");
  g.title = "Reviews, photos, phone and route on Google Maps";
  g.href = mapsUrl(p); g.target = "_blank"; g.rel = "noopener noreferrer";
  g.addEventListener("click", () => track("ps-maps/" + slugify(p.name)));
  actions.appendChild(g);
  const site = safeLink(p.link);
  if (site) {
    const w = el("a", "btn-secondary", "Website ↗");
    w.href = site; w.target = "_blank"; w.rel = "noopener noreferrer";
    w.addEventListener("click", () => track("ps-site/" + slugify(p.name)));
    actions.appendChild(w);
  }
  card.appendChild(actions);
  return card;
}

function render() {
  const list = document.getElementById("ps-list");
  list.innerHTML = "";
  let shown = playschools.map((p, i) => ({ p, i })).filter(x => matchesKind(x.p));
  if (origin) {
    shown.forEach(x => { x.near = nearest(x.p.locations, origin); });
    shown.sort((a, b) => (a.near ? a.near.km : 1e9) - (b.near ? b.near.km : 1e9) || a.i - b.i);
  } else {
    // No ranking: without a location the list is simply by area, then name.
    shown.sort((a, b) => a.p.area.localeCompare(b.p.area) || a.p.name.localeCompare(b.p.name));
  }
  document.getElementById("count").textContent = shown.length;
  shown.forEach((x, k) => { try { list.appendChild(renderCard(x.p, k)); } catch (e) { console.error("Could not show", x.p.name, e); } });
}

function setKind(value) {
  kind = ["Daycare", "school"].includes(value) ? value : "all";
  document.querySelectorAll("#kind-filter .chip").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
  render();
}

function setOrigin(o) {
  origin = o;
  document.getElementById("near-summary").textContent = o
    ? `Nearest first, from ${o.label}. Distances are straight-line; "(area)" means only the area is known — tap Google Maps for the exact place and route.`
    : "";
  document.getElementById("clear-near").hidden = !o;
  render();
}

function setupNearMe() {
  const select = document.getElementById("area-select");
  const useLoc = document.getElementById("use-location");
  areas.forEach(a => select.appendChild(new Option(a.name, a.name)));
  select.addEventListener("change", () => {
    const a = areas.find(x => x.name === select.value);
    try { if (a) localStorage.setItem(AREA_KEY, a.name); else localStorage.removeItem(AREA_KEY); } catch (e) { /* fine */ }
    if (a) track("ps-used-area-select");
    setOrigin(a ? { lat: a.lat, lng: a.lng, label: a.name } : null);
  });
  if (!("geolocation" in navigator)) useLoc.hidden = true;
  useLoc.addEventListener("click", () => {
    const summary = document.getElementById("near-summary");
    summary.textContent = "Finding your location…";
    navigator.geolocation.getCurrentPosition(pos => {
      select.value = "";
      track("ps-used-my-location");
      setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location" });
    }, () => { summary.textContent = "Couldn't get your location (permission off?). Choose your area from the list instead."; },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  });
  document.getElementById("clear-near").addEventListener("click", () => {
    select.value = "";
    try { localStorage.removeItem(AREA_KEY); } catch (e) { /* fine */ }
    setOrigin(null);
  });
  // playschools.html?area=Kakkanad (from the area pages) starts from that area.
  let wanted = null;
  try { wanted = new URLSearchParams(location.search).get("area"); } catch (e) { /* fine */ }
  const fromLink = wanted && areas.find(x => x.name.toLowerCase() === wanted.toLowerCase());
  let saved = null;
  try { saved = localStorage.getItem(AREA_KEY); } catch (e) { /* fine */ }
  const a = fromLink || (saved && areas.find(x => x.name === saved));
  if (a) { select.value = a.name; setOrigin({ lat: a.lat, lng: a.lng, label: a.name }); }
  if (fromLink && !location.hash) {
    track("ps-from-area-page/" + slugify(fromLink.name));
    setTimeout(() => {
      const t = document.getElementById("near-title");
      if (t) window.scrollTo({ top: Math.max(0, t.getBoundingClientRect().top + window.scrollY - 20), behavior: "auto" });
    }, 400);
  }
}

async function getJson(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(url + " not found");
  return r.json();
}

async function start() {
  try {
    playschools = (await getJson("playschools.json")).filter(p => p && p.name && p.area);
  } catch (e) {
    const box = document.getElementById("error");
    box.textContent = "Could not load the playschool list. Please refresh the page.";
    box.hidden = false;
    return;
  }
  try { areas = (await getJson("areas.json")).filter(a => a && a.name && typeof a.lat === "number"); } catch (e) { areas = []; }

  setCount("stat-ps", playschools.length);
  setCount("stat-daycare", playschools.filter(p => (p.kinds || []).includes("Daycare")).length);
  document.querySelectorAll("[data-kind]").forEach(b => b.addEventListener("click", () => { setKind(b.dataset.kind); track("ps-filter-" + b.dataset.kind); }));

  render();
  if (areas.length) setupNearMe(); else document.getElementById("near-me").hidden = true;
  openLinkedCard();
}

// A link like playschools.html#<playschool-name> opens straight at that playschool's card.
function openLinkedCard() {
  const id = decodeURIComponent(location.hash.slice(1));
  const card = id && document.getElementById(id);
  if (!card) return;
  card.classList.add("highlight");
  // Wait until fonts and the list have settled, then jump to the card.
  setTimeout(() => {
    const y = card.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
  }, 400);
  track("ps-linked-card/" + id);
}
window.addEventListener("hashchange", openLinkedCard);

start();
