/* Ticknock v2 - shared components: helpers, donut, legend, species cards,
   lightbox, expanded view shell, map highlighting. */
'use strict';

/* ---------- helpers ---------- */
TD.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
TD.asset = p => TD.ASSETS + p.split("/").map(encodeURIComponent).join("/");
TD.$ = (sel, root) => (root || document).querySelector(sel);
TD.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
TD.h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
TD.fmt = n => (n == null || n === "") ? "-" : (typeof n === "number" ? n.toLocaleString("en-IE") : n);
TD.isMobile = () => window.matchMedia("(max-width: 760px)").matches;
TD.credit = path => {
  if (!path) return "";
  const f = decodeURIComponent(path).split("/").pop().replace(/\.(jpe?g|png)$/i, "");
  if (!/(image|saxifrag|stock)/i.test(f)) return "";
  const last = f.split(/\s*-\s*/).pop().trim();
  if (!/^[A-Z][A-Za-z .'’]+$/.test(last) || /^(adult|male|female|caterpillar|cocoon|image|saxifraga|stock)$/i.test(last)) return "";
  return "© " + last;
};
TD.isVideo = f => /\.(mp4|mov|webm)$/i.test(f || "");

/* Count records by key, keep first-seen extra info; returns sorted desc by n */
TD.tally = (rows, keyFn, extraFn) => {
  const m = new Map();
  rows.forEach(r => { const k = keyFn(r); if (!k) return; if (!m.has(k)) m.set(k, Object.assign({ name: k, n: 0 }, extraFn ? extraFn(r) : {})); m.get(k).n++; });
  return Array.from(m.values()).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
};

/* Stable colour per entity: assigned once per layer in first-seen order of the
   overall (unfiltered) ranking, so filters never repaint survivors. */
TD.colourMap = (names) => {
  const map = {};
  names.forEach((n, i) => { map[n] = i < TD.PALETTE.length ? TD.PALETTE[i] : TD.OTHER; });
  return map;
};
/* Fold anything beyond the 8 palette slots into "Other" */
TD.foldOther = (items, colours) => {
  const keep = items.filter(i => colours[i.name] && colours[i.name] !== TD.OTHER);
  const rest = items.filter(i => !keep.includes(i));
  if (!rest.length) return keep;
  return keep.concat([{ name: "Other", n: rest.reduce((s, i) => s + i.n, 0), members: rest.map(r => r.name), other: true }]);
};

/* ---------- donut + clickable legend ---------- */
/* opts: { items:[{name,n,sub?}], colours, unit:"records", centreLabel, onPick(name), big } */
TD.donut = (host, opts) => {
  const items = opts.items.filter(i => i.n > 0);
  const total = items.reduce((s, i) => s + i.n, 0);
  const wrap = TD.h(`<div class="donut ${opts.big ? "donut-big" : ""}">
      <div class="donut-canvas"><canvas></canvas><div class="donut-centre"><b>${TD.fmt(total)}</b><span>${TD.esc(opts.centreLabel || opts.unit || "")}</span></div></div>
      <div class="donut-legend"></div></div>`);
  host.appendChild(wrap);
  const colour = i => i.other ? TD.OTHER : (opts.colours[i.name] || TD.OTHER);
  const leg = TD.$(".donut-legend", wrap);
  items.forEach((i, idx) => {
    const row = TD.h(`<button class="lg-row" type="button" data-i="${idx}">
      <span class="lg-sw" style="background:${colour(i)}"></span>
      <span class="lg-name">${TD.esc(i.name)}${i.sub ? `<i>${TD.esc(i.sub)}</i>` : ""}</span>
      <span class="lg-n">${TD.fmt(i.n)}</span></button>`);
    if (opts.onPick && !i.other) row.addEventListener("click", () => opts.onPick(i.name));
    else row.disabled = true;
    leg.appendChild(row);
  });
  if (!total) { wrap.classList.add("donut-empty"); TD.$(".donut-canvas", wrap).innerHTML = `<div class="empty-note">No records</div>`; return wrap; }
  if (!window.Chart) { TD.$(".donut-canvas", wrap).innerHTML = `<div class="empty-note">Chart unavailable</div>`; return wrap; }
  const chart = new Chart(TD.$("canvas", wrap), {
    type: "doughnut",
    data: { labels: items.map(i => i.name), datasets: [{ data: items.map(i => i.n), backgroundColor: items.map(colour), borderColor: "#fff", borderWidth: 2, hoverOffset: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "64%", animation: { duration: 350 },
      onClick: (e, els) => { if (els.length && opts.onPick) { const it = items[els[0].index]; if (!it.other) opts.onPick(it.name); } },
      onHover: (e, els) => { e.native.target.style.cursor = els.length && opts.onPick ? "pointer" : "default"; },
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw} ${opts.unit || ""} (${Math.round(c.raw / total * 100)}%)` } } }
    }
  });
  wrap._chart = chart;
  return wrap;
};

/* ---------- horizontal bars (birds, habitats) ---------- */
/* opts: { items:[{name,n,label?,info?}], colour, unit, onPick } */
TD.bars = (host, opts) => {
  const max = Math.max(1, ...opts.items.map(i => i.n));
  const el = TD.h(`<div class="bars"></div>`);
  opts.items.forEach(i => {
    const row = TD.h(`<div class="bar-row ${opts.onPick ? "clickable" : ""}" title="${TD.esc(i.name)}">
      <div class="bar-lbl">${TD.esc(i.label || i.name)}</div>
      <div class="bar-bg"><div class="bar-fill" style="width:${(i.n / max * 100).toFixed(1)}%;background:${i.colour || opts.colour}"></div></div>
      <div class="bar-val">${opts.fmt ? opts.fmt(i.n) : TD.fmt(i.n)}${opts.unit || ""}</div>
      ${i.info ? `<span class="info-dot" tabindex="0">i<span class="tip"><b>${TD.esc(i.label || i.name)}</b><br>${TD.esc(i.info)}</span></span>` : ""}
    </div>`);
    if (opts.onPick) row.addEventListener("click", () => opts.onPick(i.name));
    el.appendChild(row);
  });
  host.appendChild(el);
  return el;
};

/* ---------- metric chips ---------- */
/* chips: [{id,val,lbl,tip,tone}]; clickable when onSelect given */
TD.chips = (host, chips, opts = {}) => {
  const row = TD.h(`<div class="chips ${opts.vertical ? "chips-v" : ""}"></div>`);
  row.style.setProperty("--cols", chips.length === 4 ? 2 : Math.min(chips.length, 3));
  chips.forEach(c => {
    const b = TD.h(`<${opts.onSelect && c.id ? "button type=button" : "div"} class="chip ${c.tone ? "tone-" + c.tone : ""} ${opts.onSelect && c.id ? "clickable" : ""}" data-id="${c.id || ""}">
      <span class="chip-val">${TD.fmt(c.val)}</span><span class="chip-lbl">${TD.esc(c.lbl)}</span>
      ${c.tip ? `<span class="info-dot chip-i" tabindex="0">i<span class="tip">${TD.esc(c.tip)}</span></span>` : ""}
    </${opts.onSelect && c.id ? "button" : "div"}>`);
    if (opts.onSelect && c.id) b.addEventListener("click", e => { if (e.target.closest(".info-dot")) return; opts.onSelect(c.id); });
    row.appendChild(b);
  });
  row.setActive = id => TD.$$(".chip", row).forEach(c => c.classList.toggle("active", c.dataset.id === id));
  host.appendChild(row);
  return row;
};

/* ---------- segmented tabs ---------- */
TD.tabs = (host, tabs, active, onSelect) => {
  const el = TD.h(`<div class="seg" role="tablist"></div>`);
  tabs.forEach(t => {
    const b = TD.h(`<button type="button" role="tab" class="seg-btn" data-id="${TD.esc(t.id)}">${TD.esc(t.label)}</button>`);
    b.addEventListener("click", () => { el.setActive(t.id); onSelect(t.id); });
    el.appendChild(b);
  });
  el.setActive = id => TD.$$(".seg-btn", el).forEach(b => { const on = b.dataset.id === id; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
  el.setActive(active);
  host.appendChild(el);
  return el;
};

TD.section = (host, title, info) => {
  const el = TD.h(`<div class="sec-hdr"><span>${TD.esc(title)}</span>${info ? `<span class="info-dot" tabindex="0">i<span class="tip">${TD.esc(info)}</span></span>` : ""}</div>`);
  host.appendChild(el); return el;
};

/* ---------- species / image cards ---------- */
/* items: [{name, sci, pic, badge, badgeTone, meta, video}], opts: {onPick(name), placeholderIcon, fit:"cover"|"contain", cols} */
TD.cards = (host, items, opts = {}) => {
  const grid = TD.h(`<div class="cards ${opts.cutout ? "cards-cutout" : ""}"></div>`);
  items.forEach(it => {
    const ph = `<div class="card-ph"><img src="${TD.asset(opts.placeholderIcon || TD.ICONS.snapshot)}" alt=""><span>Image to come</span></div>`;
    const media = it.pic
      ? (TD.isVideo(it.pic) ? `<div class="card-video"><video src="${it.pic}#t=0.5" muted preload="metadata"></video><span class="play-badge">▶</span></div>`
                            : `<img src="${it.pic}" alt="${TD.esc(it.name)}" loading="lazy">`)
      : ph;
    const card = TD.h(`<div class="card" tabindex="0">
      <div class="card-img">${media}</div>
      <div class="card-body"><div class="card-name">${TD.esc(it.name)}</div>
        ${it.sci ? `<div class="card-sci">${TD.esc(it.sci)}</div>` : ""}
        ${it.meta ? `<div class="card-meta">${TD.esc(it.meta)}</div>` : ""}
        ${it.badge ? `<span class="badge tone-${it.badgeTone || "g"}">${TD.esc(it.badge)}</span>` : ""}
        ${opts.onPick ? `<button type="button" class="card-map" title="Show on map">Show on map</button>` : ""}
      </div></div>`);
    const img = TD.$(".card-img img", card);
    if (img) img.addEventListener("error", () => { TD.$(".card-img", card).innerHTML = ph; card.classList.add("no-img"); }, { once: true });
    TD.$(".card-img", card).addEventListener("click", () => {
      if (!it.pic || card.classList.contains("no-img")) return;
      TD.lightbox(TD.isVideo(it.pic) ? "video" : "image", it.pic, it.name, it.sci, it.credit != null ? it.credit : TD.credit(it.pic), { square: !TD.isVideo(it.pic) && opts.square !== false });
    });
    if (!it.pic) card.classList.add("no-img");
    const mb = TD.$(".card-map", card);
    if (mb) mb.addEventListener("click", e => { e.stopPropagation(); opts.onPick(it.key || it.name); });
    grid.appendChild(card);
  });
  host.appendChild(grid);
  return grid;
};

/* ---------- observation list (dated records) ---------- */
TD.obsList = (host, rows, opts = {}) => {
  const el = TD.h(`<div class="obs"></div>`);
  rows.forEach(r => {
    const thumb = r.pic ? (TD.isVideo(r.pic) ? `<div class="obs-thumb obs-vid">▶</div>` : `<img class="obs-thumb" src="${r.pic}" alt="" loading="lazy">`) : `<div class="obs-thumb obs-dot" style="background:${opts.colour || "#ccc"}"></div>`;
    const row = TD.h(`<div class="obs-row">${thumb}<div class="obs-main"><b>${TD.esc(r.name)}</b>${r.sci ? `<i>${TD.esc(r.sci)}</i>` : ""}${r.notes ? `<span>${TD.esc(r.notes)}</span>` : ""}</div><div class="obs-date">${TD.esc(r.date || "")}</div></div>`);
    const t = TD.$(".obs-thumb", row);
    if (r.pic) t.addEventListener("click", e => { e.stopPropagation(); TD.lightbox(TD.isVideo(r.pic) ? "video" : "image", r.pic, r.name + (r.notes ? " - " + r.notes : ""), r.date, TD.credit(r.pic)); });
    if (t.tagName === "IMG") t.addEventListener("error", () => { t.replaceWith(TD.h(`<div class="obs-thumb obs-dot" style="background:${opts.colour || "#ccc"}"></div>`)); }, { once: true });
    if (opts.onPick) { row.classList.add("clickable"); row.addEventListener("click", () => opts.onPick(r)); }
    el.appendChild(row);
  });
  host.appendChild(el);
  return el;
};

/* ---------- lightbox (images + video) ---------- */
TD.lightbox = (type, src, title, sub, credit, o = {}) => {
  const lb = TD.$("#lightbox"), img = TD.$("#lbImg"), vid = TD.$("#lbVideo");
  TD.$("#lbTitle").textContent = title || "";
  TD.$("#lbSub").textContent = sub || "";
  TD.$("#lbCredit").textContent = credit || "";
  lb.classList.toggle("square", !!o.square);
  if (type === "video") { img.hidden = true; vid.hidden = false; vid.src = src; vid.play().catch(() => {}); }
  else { vid.pause(); vid.removeAttribute("src"); vid.hidden = true; img.hidden = false; img.src = src; }
  lb.classList.add("open");
  TD.$("#lbClose").focus();
};
TD.closeLightbox = () => {
  const vid = TD.$("#lbVideo"); vid.pause(); vid.removeAttribute("src"); vid.load();
  TD.$("#lbImg").removeAttribute("src");
  TD.$("#lightbox").classList.remove("open");
};

/* ---------- expanded view shell ---------- */
/* TD.openExpanded(key, state) - layer supplies expand(host, state) */
TD.openExpanded = (key, state) => {
  const L = TD.LAYERS[key]; if (!L || !L.expand) return;
  const ov = TD.$("#xv");
  TD.$("#xvDot").style.background = L.colour;
  TD.$("#xvIcon").innerHTML = L.icon ? `<img src="${TD.asset(L.icon)}" alt="">` : "";
  TD.$("#xvTitle").textContent = L.title;
  const body = TD.$("#xvBody"); body.innerHTML = ""; body.scrollTop = 0;
  ov.classList.add("open"); ov.dataset.layer = key;
  document.body.classList.add("xv-open");
  try { L.expand(body, state || {}); } catch (e) { console.error(e); body.innerHTML = `<div class="empty-note">Could not build this view.</div>`; }
  TD.$("#xvClose").focus();
};
TD.closeExpanded = () => {
  TD.$("#xv").classList.remove("open"); document.body.classList.remove("xv-open");
  TD.$$("#xvBody video").forEach(v => v.pause());
  TD.$("#xvBody").innerHTML = "";
};

/* Standard expanded layout: left rail of clickable chips, right content pane. */
TD.xvLayout = (host, cfg) => {
  /* cfg: { chips:[...], panes:{id: fn(el)}, initial, extraTabs:[{id,label}] } */
  const wrap = TD.h(`<div class="xv-grid"><aside class="xv-rail"></aside><section class="xv-main"></section></div>`);
  host.appendChild(wrap);
  const rail = TD.$(".xv-rail", wrap), main = TD.$(".xv-main", wrap);
  let chipRow, tabRow;
  const show = id => {
    main.innerHTML = "";
    if (chipRow) chipRow.setActive(id);
    if (tabRow) tabRow.setActive(id);
    (cfg.panes[id] || (() => {}))(main);
  };
  chipRow = TD.chips(rail, cfg.chips, { vertical: true, onSelect: id => { if (cfg.panes[id]) show(id); } });
  if (cfg.extraTabs && cfg.extraTabs.length) {
    const ex = TD.h(`<div class="xv-extra"></div>`); rail.appendChild(ex);
    cfg.extraTabs.forEach(t => {
      const b = TD.h(`<button type="button" class="xv-link" data-id="${t.id}">${TD.esc(t.label)} ›</button>`);
      b.addEventListener("click", () => show(t.id)); ex.appendChild(b);
    });
    tabRow = { setActive: id => TD.$$(".xv-link", ex).forEach(b => b.classList.toggle("active", b.dataset.id === id)) };
  }
  if (cfg.railExtra) cfg.railExtra(rail, show);
  show(cfg.initial);
  return { show, main, rail };
};

/* ---------- map markers + highlight ---------- */
TD.mkIcon = (icon, ring, sz = 30) => {
  const inner = Math.round(sz * 0.58);
  return L.divIcon({ className: "", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
    html: `<div class="mk" style="width:${sz}px;height:${sz}px;border-color:${ring}"><img src="${TD.asset(icon)}" style="width:${inner}px;height:${inner}px" alt=""></div>` });
};
TD.mkHL = (icon, sz = 40) => {
  const inner = Math.round(sz * 0.55);
  return L.divIcon({ className: "", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
    html: `<div class="mk mk-hl" style="width:${sz}px;height:${sz}px"><img src="${TD.asset(icon)}" style="width:${inner}px;height:${inner}px" alt=""></div>` });
};

TD.hl = { key: null };
TD.resetHighlight = () => {
  const k = TD.hl.key; if (!k) return;
  const Lr = TD.LAYERS[k];
  Lr.mapLayer.eachLayer(m => { if (m.setIcon && m._baseIcon) m.setIcon(m._baseIcon); });
  TD.hl.key = null;
  TD.$("#hlBar").classList.remove("show");
};
/* Highlight markers of a layer matching fn(props). Shows a dismissable bar. */
TD.highlight = (key, fn, label) => {
  if (document.body.classList.contains("xv-open")) TD.closeExpanded();
  TD.resetHighlight();
  const Lr = TD.LAYERS[key]; if (!Lr || !Lr.mapLayer) return;
  TD.setLayerVisible(key, true);
  const hits = [];
  Lr.mapLayer.eachLayer(m => {
    const p = m.feature ? m.feature.properties : (m.options.props || {});
    const match = fn(p);
    if (m.setIcon && m._baseIcon) m.setIcon(match ? TD.mkHL(Lr.hlIcon || Lr.icon) : m._baseIcon);
    if (match) { hits.push(m.getLatLng()); if (m.setZIndexOffset) m.setZIndexOffset(1000); } else if (m.setZIndexOffset) m.setZIndexOffset(0);
  });
  TD.hl.key = key;
  const bar = TD.$("#hlBar");
  TD.$("#hlText").innerHTML = `<b>${TD.esc(label)}</b> - ${hits.length} ${hits.length === 1 ? "location" : "locations"} highlighted`;
  bar.classList.add("show");
  if (hits.length) {
    const b = L.latLngBounds(hits);
    if (!TD.map.getBounds().pad(-0.1).contains(b)) TD.map.flyToBounds(b.pad(0.4), { maxZoom: 18, duration: 0.6, paddingBottomRight: TD.mapPad() });
  }
  if (TD.isMobile()) TD.sheet("peek");
};
TD.mapPad = () => TD.isMobile() ? [0, 80] : [0, 0];

/* ---------- storytelling blocks: insight tiles + "what does this mean?" ---------- */
/* items: [{big, lbl, sub, colour}] */
TD.insights = (host, items) => {
  const el = TD.h(`<div class="insights"></div>`);
  items.filter(Boolean).forEach(i => el.appendChild(TD.h(`<div class="insight"${i.colour ? ` style="--acc:${i.colour}"` : ""}>
    <div class="ins-big">${TD.esc(i.big)}</div><div class="ins-lbl">${TD.esc(i.lbl)}</div>${i.sub ? `<div class="ins-sub">${TD.esc(i.sub)}</div>` : ""}</div>`)));
  host.appendChild(el);
  return el;
};
/* paras: array of strings (plain text) */
TD.explain = (host, title, paras) => {
  const el = TD.h(`<div class="explain"><div class="ex-q">?</div><div><div class="ex-title">${TD.esc(title)}</div>${paras.map(p => `<p>${TD.esc(p)}</p>`).join("")}</div></div>`);
  host.appendChild(el);
  return el;
};
/* two-column wrapper so a chart and its story sit side by side on wide screens */
TD.split = (host) => { const el = TD.h(`<div class="split"><div class="split-a"></div><div class="split-b"></div></div>`); host.appendChild(el); return [TD.$(".split-a", el), TD.$(".split-b", el)]; };

TD.parseDate = s => { const m = String(s || "").match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
TD.fmtDate = d => d ? d.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }) : "";
TD.fmtMonth = d => d ? d.toLocaleDateString("en-IE", { month: "short", year: "numeric" }) : "";
TD.dateSpan = rows => {
  const ds = rows.map(r => TD.parseDate(r.date)).filter(Boolean).sort((a, b) => a - b);
  const uniq = Array.from(new Set(ds.map(d => d.getTime()))).length;
  if (!ds.length) return null;
  const a = ds[0], b = ds[ds.length - 1];
  return { visits: uniq, label: a.getTime() === b.getTime() ? TD.fmtDate(a) : TD.fmtMonth(a) + " - " + TD.fmtMonth(b) };
};
TD.pct = (a, b) => b ? Math.round(a / b * 100) + "%" : "0%";
