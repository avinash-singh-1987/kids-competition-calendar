// Announcement bar shown at the top of every page.
// Edit announcement.json to change or switch it off ("active": false).
// Optional: "showUntil" (YYYY-MM-DD) hides it after that date; "closable": true adds a ✕ button
// (a visitor's close is remembered per announcement id). By default it always shows.
(function () {
  const KEY = "kcc-closed-announcement";

  function parseDate(text) {
    if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const [y, m, d] = text.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59);
  }
  function safeLink(url) {
    return typeof url === "string" && /^(https?:\/\/|\.\/|\/)/i.test(url) ? url : null;
  }
  function closedId() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function rememberClosed(id) { try { localStorage.setItem(KEY, id); } catch (e) { /* fine */ } }
  function track(name) {
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: name, event: true }); } catch (e) {}
  }

  fetch("announcement.json", { cache: "no-cache" })
    .then(r => (r.ok ? r.json() : null))
    .then(a => {
      if (!a || !a.active) return;
      const until = parseDate(a.showUntil);
      if (until && until < new Date()) return;
      // Either one "text", or several "points" (each can have its own showUntil / detailsLink).
      const now = new Date();
      const points = (Array.isArray(a.points) ? a.points : (a.text ? [{ text: a.text, detailsLink: a.detailsLink }] : []))
        .filter(p => p && p.text && !(parseDate(p.showUntil) && parseDate(p.showUntil) < now));
      if (!points.length) return;
      if (a.closable && a.id && closedId() === a.id) return;

      const bar = document.createElement("div");
      bar.className = "announce";
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-label", "Announcement");

      const inner = document.createElement("div");
      inner.className = "wrap announce-inner";

      const icon = document.createElement("span");
      icon.className = "announce-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "🔔";

      const text = document.createElement("div");
      text.className = "announce-text";
      if (a.title) {
        const h = document.createElement("strong");
        h.className = "announce-title";
        h.textContent = a.title;
        text.appendChild(h);
      }
      const addLine = (parent, p) => {
        const details = safeLink(p.detailsLink);
        if (details) {
          const t = document.createElement("a");
          t.href = details;
          t.textContent = p.text;
          t.addEventListener("click", () => track("click-announcement-details"));
          parent.appendChild(t);
        } else {
          parent.appendChild(document.createTextNode(p.text));
        }
      };
      if (points.length === 1 && !a.title) {
        addLine(text, points[0]);
      } else {
        const ul = document.createElement("ul");
        ul.className = "announce-points";
        points.forEach(p => { const li = document.createElement("li"); addLine(li, p); ul.appendChild(li); });
        text.appendChild(ul);
      }

      inner.appendChild(icon);
      inner.appendChild(text);

      const link = safeLink(a.link);
      if (link) {
        const btn = document.createElement("a");
        btn.className = "announce-btn";
        btn.href = link;
        btn.target = "_blank";
        btn.rel = "noopener noreferrer";
        btn.textContent = (a.linkText || "Open") + " →";
        btn.addEventListener("click", () => track("click-announcement"));
        inner.appendChild(btn);
      }

      if (a.closable) {
        const close = document.createElement("button");
        close.type = "button";
        close.className = "announce-close";
        close.setAttribute("aria-label", "Close announcement");
        close.textContent = "✕";
        close.addEventListener("click", () => { bar.remove(); if (a.id) rememberClosed(a.id); });
        inner.appendChild(close);
      }

      bar.appendChild(inner);
      document.body.insertBefore(bar, document.body.firstChild);
    })
    .catch(() => { /* no announcement — page works as normal */ });
})();
