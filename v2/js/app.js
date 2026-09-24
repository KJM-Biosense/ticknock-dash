/* Ticknock v2 - app bootstrap: map, layer panel, snapshot cards, mobile sheet, events. */
'use strict';

(function () {
  const E = TD.esc, A = TD.asset;
  const R = TD.LAYERS;

  /* ---------- map ---------- */
  const basemaps = {
    osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 20, maxNativeZoom: 19 }),
    satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "© Esri, Maxar, Earthstar Geographics", maxZoom: 20, maxNativeZoom: 19 }),
    topo: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { attribution: "© OpenTopoMap contributors", maxZoom: 20, maxNativeZoom: 17 })
  };
  const map = TD.map = L.map("map", { zoomControl: false, zoomSnap: 0.25, layers: [basemaps.satellite], tap: true }).setView([53.2508, -6.2490], 16);
  L.control.zoom({ position: "topright" }).addTo(map);
  let curBM = "satellite";
  TD.$$(".bm-btn[data-bm]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.bm; if (k === curBM) return;
    map.removeLayer(basemaps[curBM]); map.addLayer(basemaps[k]); basemaps[k].bringToBack(); curBM = k;
    TD.$$(".bm-btn[data-bm]").forEach(x => x.classList.toggle("active", x === b));
  }));

  /* ---------- build map layers ---------- */
  TD.ORDER.forEach(k => { try { R[k].mapLayer = R[k].build(); } catch (e) { console.error("Layer failed:", k, e); R[k].failed = true; R[k].mapLayer = L.layerGroup(); } });
  const fitSite = () => { try { const b = L.geoJSON(GJ_STUDY).getBounds(); TD.isMobile() ? map.fitBounds(b, { paddingTopLeft: [16, 60], paddingBottomRight: [16, 80] }) : map.fitBounds(b, { padding: [50, 50] }); } catch (e) {} };
  fitSite();

  /* ---------- layer visibility ---------- */
  TD.setLayerVisible = (k, on) => {
    const Lr = R[k]; if (!Lr) return;
    Lr.visible = on;
    if (on) { if (!map.hasLayer(Lr.mapLayer)) map.addLayer(Lr.mapLayer); } else { map.removeLayer(Lr.mapLayer); if (TD.hl.key === k) TD.resetHighlight(); }
    TD.$$(`[data-toggle="${k}"]`).forEach(t => { t.classList.toggle("on", on); t.setAttribute("aria-checked", on); });
    const card = TD.$(`#card-${k}`); if (card) card.classList.toggle("inactive", !on);
    // keep point layers above polygons
    ["birds", "bats", "amph", "inv", "fit", "trees", "cameras"].forEach(x => { if (R[x].visible && R[x].mapLayer.eachLayer) R[x].mapLayer.eachLayer(m => m.bringToFront && m.bringToFront()); });
  };

  /* ---------- layer panel ---------- */
  const lp = TD.$("#layerList");
  TD.GROUPS.forEach(g => {
    const keys = TD.ORDER.filter(k => R[k].group === g); if (!keys.length) return;
    lp.appendChild(TD.h(`<div class="lp-group">${E(g)}</div>`));
    keys.forEach(k => {
      const Lr = R[k];
      const sw = Lr.lineSwatch ? `<span class="lp-line" style="border-color:${Lr.colour}"></span>` : `<span class="lp-dot" style="background:${Lr.colour}"></span>`;
      const row = TD.h(`<button type="button" class="lp-row" role="switch" aria-checked="false" data-toggle="${k}"><span class="lp-tog"></span>${sw}<span class="lp-name">${E(Lr.title)}</span></button>`);
      row.addEventListener("click", () => TD.setLayerVisible(k, !R[k].visible));
      lp.appendChild(row);
    });
  });
  TD.$("#lpHead").addEventListener("click", () => TD.$("#layerPanel").classList.toggle("collapsed"));
  TD.$("#layersFab").addEventListener("click", () => { TD.$("#layerPanel").classList.add("open"); TD.sheet("peek"); });
  TD.$("#lpClose").addEventListener("click", () => TD.$("#layerPanel").classList.remove("open"));

  /* ---------- snapshot cards ---------- */
  const expandSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
  const cardsHost = TD.$("#cards");
  TD.ORDER.filter(k => !R[k].noCard).forEach(k => {
    const Lr = R[k];
    const card = TD.h(`<section class="acc" id="card-${k}">
      <div class="acc-hdr" role="button" tabindex="0" aria-expanded="false">
        <span class="acc-dot" style="background:${Lr.colour}"></span>
        ${Lr.icon ? `<img class="acc-icon" src="${A(Lr.icon)}" alt="">` : ""}
        <span class="acc-name">${E(Lr.title)}</span>
        ${Lr.expand ? `<button type="button" class="acc-expand" title="Expand ${E(Lr.title)}" aria-label="Expand ${E(Lr.title)}">${expandSvg}</button>` : ""}
        <span class="acc-chev" aria-hidden="true">▾</span>
      </div>
      <div class="acc-body"></div></section>`);
    const hdr = TD.$(".acc-hdr", card), body = TD.$(".acc-body", card);
    const toggle = () => {
      const open = !card.classList.contains("open");
      TD.$$(".acc.open").forEach(c => { c.classList.remove("open"); TD.$(".acc-hdr", c).setAttribute("aria-expanded", "false"); });
      if (open) {
        card.classList.add("open"); hdr.setAttribute("aria-expanded", "true");
        if (!R[k].visible) TD.setLayerVisible(k, true);
        if (!card._built) { card._built = true; try { Lr.card(body); } catch (e) { console.error(e); body.innerHTML = `<div class="empty-note">${E(Lr.title)} data unavailable.</div>`; } }
        setTimeout(() => card.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
      }
    };
    hdr.addEventListener("click", e => { if (e.target.closest(".acc-expand")) return; toggle(); });
    hdr.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".acc-expand")) { e.preventDefault(); toggle(); } });
    const xb = TD.$(".acc-expand", card);
    if (xb) xb.addEventListener("click", e => { e.stopPropagation(); if (!R[k].visible) TD.setLayerVisible(k, true); TD.openExpanded(k); });
    cardsHost.appendChild(card);
    card._toggle = toggle;
  });

  TD.ORDER.forEach(k => TD.setLayerVisible(k, !!R[k].on));
  TD.$("#card-study")._toggle();

  /* ---------- highlight bar ---------- */
  TD.$("#hlClear").addEventListener("click", () => TD.resetHighlight());
  map.on("click", () => TD.resetHighlight());

  /* ---------- popups: images, videos, camera footage ---------- */
  map.on("popupopen", e => {
    const el = e.popup.getElement(); if (!el) return;
    TD.$$("[data-lb]", el).forEach(i => { i.onclick = () => TD.lightbox("image", i.dataset.lb, i.dataset.title, "", TD.credit(i.dataset.lb)); i.onerror = () => i.remove(); });
    TD.$$("[data-cam]", el).forEach(b => { b.onclick = () => { map.closePopup(); TD.openExpanded("cameras", { cam: b.dataset.cam }); }; });
    TD.$$("[data-video]", el).forEach(b => { b.onclick = () => TD.lightbox("video", b.dataset.video, b.dataset.title, "", ""); });
  });

  /* ---------- overlays ---------- */
  TD.$("#lbClose").addEventListener("click", TD.closeLightbox);
  TD.$("#lightbox").addEventListener("click", e => { if (e.target.id === "lightbox" || e.target.classList.contains("lb-stage")) TD.closeLightbox(); });
  TD.$("#xvClose").addEventListener("click", TD.closeExpanded);
  TD.$("#xv").addEventListener("click", e => { if (e.target.id === "xv") TD.closeExpanded(); });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (TD.$("#lightbox").classList.contains("open")) TD.closeLightbox();
    else if (TD.$("#xv").classList.contains("open")) TD.closeExpanded();
    else if (TD.$("#layerPanel").classList.contains("open")) TD.$("#layerPanel").classList.remove("open");
  });

  /* ---------- mobile bottom sheet ---------- */
  const panel = TD.$("#snapshot");
  TD.sheet = state => { if (!TD.isMobile()) return; panel.dataset.sheet = state; TD.$("#sheetHandle").setAttribute("aria-expanded", state !== "peek"); };
  TD.$("#sheetHandle").addEventListener("click", () => TD.sheet(panel.dataset.sheet === "peek" ? "half" : "peek"));
  let y0 = null, s0 = null;
  TD.$("#sheetHandle").addEventListener("touchstart", e => { y0 = e.touches[0].clientY; s0 = panel.dataset.sheet; }, { passive: true });
  TD.$("#sheetHandle").addEventListener("touchend", e => {
    if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; y0 = null;
    const order = ["peek", "half", "full"], i = order.indexOf(s0);
    if (dy < -40) TD.sheet(order[Math.min(2, i + 1)]); else if (dy > 40) TD.sheet(order[Math.max(0, i - 1)]);
  });
  panel.dataset.sheet = "peek";
  const mq = window.matchMedia("(max-width: 760px)");
  const onMQ = () => { setTimeout(() => map.invalidateSize(), 250); };
  mq.addEventListener ? mq.addEventListener("change", onMQ) : mq.addListener(onMQ);
  window.addEventListener("resize", () => map.invalidateSize());

  /* ---------- 3D intro ---------- */
  const replay = TD.$("#introReplay");
  if (replay) replay.addEventListener("click", () => TD.intro && TD.intro.start(true));
  if (TD.intro) TD.intro.maybeStart();

  TD.ready = true;
  document.body.classList.add("ready");
})();
