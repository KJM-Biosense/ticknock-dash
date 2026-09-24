/* Ticknock v2 - layer registry. Each layer supplies:
   title, colour, icon, group, on (default visibility),
   build()  -> Leaflet layer (stored as mapLayer)
   card(el) -> side-panel content
   expand(el, state) -> expanded view content (optional)
   All numbers are computed from the data here - nothing is typed into the HTML. */
'use strict';

(function () {
  const A = TD.asset, E = TD.esc;
  const sentence = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
  const prop = (p, ...keys) => { for (const k of keys) if (p[k] != null && p[k] !== "") return p[k]; return ""; };

  /* ---------- popup builder ---------- */
  function popup(pic, title, rows, note, extra) {
    const img = pic ? `<img class="mp-img" src="${pic}" alt="" data-lb="${E(pic)}" data-title="${E(title)}">` : "";
    const trs = rows.filter(r => r[1] !== "" && r[1] != null).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
    return `<div class="mp">${img}<div class="mp-body"><div class="mp-title">${title}</div>${trs ? `<table>${trs}</table>` : ""}${note ? `<div class="mp-note">${note}</div>` : ""}${extra || ""}</div></div>`;
  }
  function pointLayer(fc, key, icon, ringFn, popupFn, tipFn) {
    return L.geoJSON(fc, {
      pointToLayer: (f, ll) => { const ic = TD.mkIcon(icon, ringFn ? ringFn(f.properties) : TD.C[key]); const m = L.marker(ll, { icon: ic }); m._baseIcon = ic; return m; },
      onEachFeature: (f, l) => { l.bindTooltip(tipFn(f.properties), { direction: "top", offset: [0, -12] }); l.bindPopup(() => popupFn(f.properties), { maxWidth: 290, autoPanPaddingTopLeft: [10, 60] }); }
    });
  }

  /* =================== DATA NORMALISATION =================== */
  const D = TD.D = {};

  /* Birds */
  D.birds = GJ_BIRDS.features.map(f => {
    const p = f.properties, code = String(prop(p, "Breeding.s", "Breeding_s")).trim().toUpperCase();
    return { name: sentence(prop(p, "BTO.Name", "BTO_Name")), code: prop(p, "BTO.Code", "BTO_Code"), bocci: prop(p, "BoCCI.Stat", "BoCCI_Stat") || "Green",
      breeding: code, confirmed: TD.CONFIRMED_BREEDING.includes(code), habitat: p.Habitat || "", date: p.Date || "", p };
  });
  const birdPic = n => { const f = TD.BIRD_PICS[(n || "").toLowerCase()]; return f ? A("bird-pics/" + f) : null; };
  D.birdSpecies = TD.tally(D.birds, r => r.name, r => ({ bocci: r.bocci, code: r.code }));
  D.birdSpecies.forEach(s => { s.confirmed = D.birds.some(r => r.name === s.name && r.confirmed); s.pic = birdPic(s.name); });

  /* Bats / amphibians / invertebrates share one shape */
  function obsRecords(fc, picFn, nameFix) {
    return fc.features.map(f => { const p = f.properties, sci = p.Species || "", name = (nameFix || (x => x))(prop(p, "Common.Nam", "Common_Nam") || sci);
      return { name, sci, date: p.Date || "", notes: p.Notes || "", pic: picFn(p), p }; });
  }
  const batPic = sci => { const f = TD.BAT_PICS[(sci || "").toLowerCase()]; return f ? A("bat-pics/" + f) : null; };
  const amphStock = sci => { const f = TD.AMPH_PICS[(sci || "").toLowerCase()]; return f ? A("amphibian-pics/" + f) : null; };
  const amphRec = p => { const d = TD.AMPH_DATE[(p.Date || "") + "_" + (p.Species || "").toLowerCase()]; return d ? A("amphibian-pics/" + d) : amphStock(p.Species); };
  const invStages = sci => TD.INV_PICS[(sci || "").toLowerCase()] || [];
  const invRec = p => { const st = invStages(p.Species); if (!st.length) return null; const n = (p.Notes || "").toLowerCase(); const m = st.find(s => n.includes(s.stage.toLowerCase())) || st[0]; return A("invertebrate-pics/" + m.file); };
  const invStock = sci => { const st = invStages(sci); const s = st.find(x => /^adult/i.test(x.stage)) || st[0]; return s ? A("invertebrate-pics/" + s.file) : null; };

  D.bats = obsRecords(GJ_BATS, p => batPic(p.Species), sentence);
  D.amph = obsRecords(GJ_AMPH, amphRec);
  D.inv = obsRecords(GJ_INV, invRec);
  const speciesOf = (recs, stockFn) => TD.tally(recs, r => r.name, r => ({ sci: r.sci })).map(s => Object.assign(s, { pic: stockFn(s.sci) }));
  D.batSpecies = speciesOf(D.bats, batPic);
  D.amphSpecies = speciesOf(D.amph, amphStock);
  D.invSpecies = speciesOf(D.inv, invStock);

  /* Trees */
  D.trees = GJ_TREES.features.map(f => ({ name: f.properties.Species || "Unknown" }));
  D.treeSpecies = TD.tally(D.trees, r => r.name).map(s => Object.assign(s, { sci: (TD.TREES[s.name] || {}).sci || "", pic: TD.TREES[s.name] ? A("tree-pics/" + TD.TREES[s.name].file) : null }));

  /* Habitats (computed from polygons; label = FossLayer) */
  const code3 = s => (s || "").slice(0, 3).toUpperCase();
  D.habs = GJ_HAB_AREA.features.map(f => { const p = f.properties; return { layer: p.FossLayer || "", code: code3(p.FossLayer), ha: +(p["Area..ha."] || p.Area__ha_ || 0), mosaic: !!p.is_mosaic, mosaicCodes: p.mosaic_codes || "", art: p.Artificial || "" }; });
  const habByType = {};
  D.habs.filter(h => h.layer).forEach(h => { (habByType[h.layer] = habByType[h.layer] || { name: h.layer, code: h.code, n: 0, polys: 0 }); habByType[h.layer].n += h.ha; habByType[h.layer].polys++; });
  D.habTypes = Object.values(habByType).sort((a, b) => b.n - a.n);
  D.habTotalHa = D.habs.reduce((s, h) => s + h.ha, 0);
  D.habMapped = D.habs.filter(h => h.layer).length;
  const normM = c => c.split(/\s*\/\s*/).map(s => s.trim()).sort().join(" / ");
  const mos = {};
  D.habs.filter(h => h.mosaic).forEach(h => { const k = normM(h.mosaicCodes); (mos[k] = mos[k] || { code: k, n: 0, ha: 0 }); mos[k].n++; mos[k].ha += h.ha; });
  D.mosaics = Object.values(mos).sort((a, b) => b.ha - a.ha);
  D.nMosaic = D.habs.filter(h => h.mosaic).length;
  const art = {}; D.habs.filter(h => h.art).forEach(h => { art[h.art] = (art[h.art] || 0) + h.ha; });
  D.artSemi = Object.entries(art).map(([k, ha]) => ({ name: k, ha, pct: ha / D.habTotalHa * 100 }));
  D.pctSemi = Math.round(((art["Semi-Natural"] || 0) / D.habTotalHa) * 100);

  D.lin = GJ_HAB_LIN.features.map(f => ({ layer: f.properties.FossLayer || "Unclassified", m: +(f.properties.length_m || 0) }));
  const linBy = {}; D.lin.forEach(l => { linBy[l.layer] = (linBy[l.layer] || 0) + l.m; });
  D.linTypes = Object.entries(linBy).map(([k, m]) => ({ name: k, code: code3(k), n: Math.round(m) })).sort((a, b) => b.n - a.n);
  D.linTotal = D.linTypes.reduce((s, t) => s + t.n, 0);

  /* Pollinators (FIT Counts) */
  D.fit = ((typeof GJ_FIT !== "undefined") ? GJ_FIT.features : []).map(f => Object.assign({ ll: [f.geometry.coordinates[1], f.geometry.coordinates[0]] }, f.properties));
  D.fitMonths = Array.from(new Map(D.fit.map(r => [r.month, r.month_label])).entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const grpTot = {}; D.fit.forEach(r => Object.entries(r.groups).forEach(([g, n]) => { grpTot[g] = (grpTot[g] || 0) + n; }));
  D.fitGroupOrder = Object.entries(grpTot).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  D.fitColours = TD.colourMap(D.fitGroupOrder);
  D.fitStats = month => {
    const rows = D.fit.filter(r => month === "all" || r.month === month);
    const g = {}; rows.forEach(r => Object.entries(r.groups).forEach(([k, n]) => { g[k] = (g[k] || 0) + n; }));
    const insects = rows.reduce((s, r) => s + r.total, 0);
    return { rows, insects, counts: rows.length, zero: rows.filter(r => r.total === 0).length,
      perCount: rows.length ? insects / rows.length : 0,
      groups: D.fitGroupOrder.filter(k => g[k]).map(k => ({ name: k, n: g[k] })) };
  };

  /* Cameras */
  D.cams = ((typeof GJ_CAMERAS_V2 !== "undefined") ? GJ_CAMERAS_V2.features.map(f => ({ name: f.properties.name, notes: f.properties.notes, ll: [f.geometry.coordinates[1], f.geometry.coordinates[0]] }))
                                 : GJ_CAMERAS.features.map(f => ({ name: prop(f.properties, "Camera.Nam", "Camera_Nam"), ll: [f.geometry.coordinates[1], f.geometry.coordinates[0]] })));
  D.cams.forEach(c => { c.clips = TD.CAM_CLIPS[c.name] || []; c.species = TD.tally(c.clips, x => x.sp); });
  D.allClips = D.cams.flatMap(c => c.clips.map(x => Object.assign({ cam: c.name }, x)));
  D.camSpecies = TD.tally(D.allClips, x => x.sp).map(s => Object.assign(s, TD.CAM_SPECIES[s.name] || {}, { cams: D.cams.filter(c => c.clips.some(x => x.sp === s.name)).map(c => c.name) }));
  D.camColours = TD.colourMap(D.camSpecies.map(s => s.name));
  const camPic = sp => TD.CAM_SPECIES[sp] ? A("camera-species/" + TD.CAM_SPECIES[sp].file) : null;

  /* Stable colours per species (overall rank order) */
  D.batColours = TD.colourMap(D.batSpecies.map(s => s.name));
  D.amphColours = TD.colourMap(D.amphSpecies.map(s => s.name));
  D.invColours = TD.colourMap(D.invSpecies.map(s => s.name));
  D.treeColours = TD.colourMap(D.treeSpecies.map(s => s.name));

  /* =================== SHARED LAYER PATTERNS =================== */
  /* Side card with chip-switched panes */
  function paneCard(el, chips, panes, initial, extra) {
    const row = TD.chips(el, chips, { onSelect: id => { if (panes[id]) show(id); } });
    const host = TD.h(`<div class="pane"></div>`); el.appendChild(host);
    function show(id) { row.setActive(id); host.innerHTML = ""; panes[id](host); }
    show(initial);
    if (extra) extra(el, show);
  }
  const hlBy = (key, field) => name => TD.highlight(key, p => {
    if (field === "bird") return sentence(prop(p, "BTO.Name", "BTO_Name")) === name;
    if (field === "tree") return (p.Species || "Unknown") === name;
    const n = prop(p, "Common.Nam", "Common_Nam") || p.Species;
    return n === name || sentence(n) === name;
  }, name);

  /* Standard species-survey layer (bats, amphibians, invertebrates) */
  function speciesLayer(o) {
    /* o: key, title, recs, species, colours, recTip, sppTip, obsList(bool), stages(bool), placeholderIcon, unit */
    const pick = hlBy(o.key);
    const chips = () => [
      { id: "records", val: o.recs.length, lbl: "Records", tip: o.recTip },
      { id: "species", val: o.species.length, lbl: "Species", tip: o.sppTip }];
    const donutOf = (host, big) => { TD.section(host, "Species breakdown", "Records per species. Click a segment or a name to highlight those records on the map."); TD.donut(host, { items: o.species.map(s => ({ name: s.name, n: s.n, sub: s.sci })), colours: o.colours, unit: "records", onPick: pick, big }); };
    const cardsOf = (host, big) => TD.cards(host, o.species.map(s => ({ name: s.name, sci: s.sci, pic: s.pic, meta: s.n + (s.n === 1 ? " record" : " records") })), { onPick: pick, placeholderIcon: o.icon });
    return {
      card(el) {
        paneCard(el, chips(), { records: h => donutOf(h), species: h => cardsOf(h) }, "records",
          o.stages ? (el) => { const b = TD.h(`<button type="button" class="link-btn">Life stages ›</button>`); b.onclick = () => TD.openExpanded(o.key, { pane: "stages" }); el.appendChild(b); } : null);
      },
      expand(el, st) {
        const panes = {
          records: h => { donutOf(h, true); if (o.story) o.story(h, "records"); if (o.obsList) { TD.section(h, "All records"); TD.obsList(h, o.recs, { colour: TD.C[o.key], onPick: r => pick(r.name) }); } },
          species: h => { TD.section(h, "Species recorded", "Click a photo to enlarge it."); cardsOf(h, true); if (o.story) o.story(h, "species"); }
        };
        const extra = [];
        if (o.stages) { extra.push({ id: "stages", label: "Life stages" }); panes.stages = h => lifeStages(h); }
        TD.xvLayout(el, { chips: chips(), panes, initial: st.pane || "records", extraTabs: extra });
      }
    };
  }
  function lifeStages(h) {
    TD.section(h, "Life stages recorded", "Several species were recorded at more than one life stage, which indicates they are breeding on site.");
    const recStages = new Set(D.inv.filter(r => !/^adult/i.test(r.notes)).map(r => r.name));
    TD.insights(h, [
      { big: recStages.size, lbl: "species seen as young stages", sub: "Caterpillars or cocoons, not just adults" },
      { big: new Set(D.inv.map(r => (r.notes || "").replace(/ (male|female)$/i, ""))).size, lbl: "life stages recorded", sub: Array.from(new Set(D.inv.map(r => (r.notes || "").replace(/ (male|female)$/i, "")))).join(", ") }]);
    TD.explain(h, "Why life stages matter", ["An adult butterfly or moth can fly in from elsewhere, but a caterpillar or cocoon was born here. Finding young stages shows the site is providing the food plants these species need to complete their life cycle."]);
    const groups = D.invSpecies.map(s => ({ s, st: invStages(s.sci) })).filter(g => g.st.length);
    groups.sort((a, b) => b.st.length - a.st.length);
    groups.forEach(g => {
      const blk = TD.h(`<div class="stage-blk"><div class="stage-name">${E(g.s.name)} <i>${E(g.s.sci)}</i>${g.st.length > 1 ? ` <span class="badge tone-g">${g.st.length} stages</span>` : ""}</div></div>`);
      TD.cards(blk, g.st.map(x => ({ name: x.stage, pic: A("invertebrate-pics/" + x.file) })), {});
      h.appendChild(blk);
    });
  }

  /* =================== REGISTRY =================== */
  const R = TD.LAYERS = {};

  /* ---- Site boundary ---- */
  R.study = {
    title: "Site boundary", group: "General", colour: TD.C.study, on: true,
    build() { return L.geoJSON(GJ_STUDY, { style: { color: "#39c6bc", weight: 2.5, fillColor: "#176560", fillOpacity: 0.06, dashArray: "6,4" }, interactive: false }); },
    chips() { return [{ val: STATS.site.area_ha, lbl: "Hectares" }, { val: STATS.site.perim_km, lbl: "Perimeter (km)" }]; },
    card(el) { TD.chips(el, this.chips()); },
    expand(el) {
      TD.chips(el, this.chips().concat([{ val: (STATS.site.area_m2 || 0).toLocaleString("en-IE"), lbl: "Square metres" }, { val: (D.routeLen / 1000).toFixed(2), lbl: "Walking route (km)" }]));
      el.appendChild(TD.h(`<div class="prose"><p>The Ticknock Lands study area covers ${STATS.site.area_ha} ha of upland and transitional habitat on the slopes of the Dublin Mountains, surveyed in 2025-2026.</p>
        <p>Use the layer list to switch survey layers on and off, and the cards in the Biodiversity snapshot to explore each survey. Click any chart segment or species to highlight its records on the map.</p></div>`));
    }
  };

  /* ---- Walking route (map only) ---- */
  D.routeLen = ((typeof GJ_ROUTE !== "undefined") ? GJ_ROUTE.features : []).reduce((s, f) => s + (f.properties.length_m || 0), 0);
  R.route = {
    title: "Walking route", group: "General", colour: TD.C.route, on: true, noCard: true, lineSwatch: true,
    build() {
      if (!(typeof GJ_ROUTE !== "undefined")) return L.layerGroup();
      const tip = f => popup(null, "Walking route", [["Section", f.properties.fid + " of " + GJ_ROUTE.features.length], ["Section length", f.properties.length_m + " m"], ["Total route", D.routeLen.toLocaleString("en-IE") + " m"]]);
      const casing = L.geoJSON(GJ_ROUTE, { style: { color: "#1b2a28", weight: 6, opacity: 0.45, lineCap: "round" }, interactive: false });
      const line = L.geoJSON(GJ_ROUTE, { style: { color: TD.C.route, weight: 3, dashArray: "7,6", lineCap: "round" },
        onEachFeature: (f, l) => { l.bindTooltip("Walking route", { sticky: true }); l.bindPopup(tip(f)); } });
      return L.layerGroup([casing, line]);
    }
  };

  /* ---- Area habitats ---- */
  const habInfo = c => TD.FOSSITT_DESC[c] || TD.FOSSITT_DESC.DEFAULT;
  R.hab_area = {
    title: "Area habitats", group: "Habitats", colour: TD.C.hab_area, on: true,
    build() {
      return L.geoJSON(GJ_HAB_AREA, {
        style: f => ({ color: "#3b3b3b", weight: 0.7, opacity: 0.65, fillOpacity: 0.58, fillColor: TD.FC[code3(f.properties.FossLayer)] || TD.FC.DEFAULT }),
        onEachFeature: (f, l) => { const p = f.properties, c = code3(p.FossLayer), a = +(p["Area..ha."] || 0);
          l.bindTooltip(`<b>${E(p.FossLayer || "Habitat")}</b>`, { sticky: true, direction: "top" });
          l.bindPopup(popup(null, E(p.FossLayer || "Habitat"), [["Code", E(p.Fossitt || c)], ["Area", a ? a.toFixed(3) + " ha" : ""], ["Mosaic", p.is_mosaic ? "Yes - " + E(p.mosaic_codes) : "No"]], E(habInfo(c)))); }
      });
    },
    chips() { return [
      { id: "fossitt", val: D.habMapped, lbl: "Mapped areas", tip: "Number of habitat polygons mapped across the site. Several areas can share one habitat type." },
      { id: "types", val: D.habTypes.length, lbl: "Habitat types", tip: "Number of distinct Fossitt habitat types mapped on site." },
      { id: "mosaic", val: D.nMosaic, lbl: "Mosaics", tip: "Areas where two or more habitat types are too intermingled to map separately." },
      { id: "artnat", val: D.pctSemi + "%", lbl: "Semi-natural", tip: "Share of the mapped area that is semi-natural rather than artificial (e.g. conifer plantation)." }]; },
    fossittBars(h, big) {
      TD.section(h, "Fossitt habitat area", "Fossitt is Ireland's standard habitat classification. Hover the (i) on each row for a plain-English description.");
      TD.bars(h, { items: D.habTypes.map(t => ({ name: t.name, n: t.n, colour: TD.FC[t.code] || TD.FC.DEFAULT, info: habInfo(t.code) })), unit: " ha", fmt: n => n.toFixed(2) });
    },
    typeList(h) {
      TD.section(h, "Habitat types");
      const l = TD.h(`<div class="type-list"></div>`);
      D.habTypes.forEach(t => l.appendChild(TD.h(`<div class="type-row"><span class="lg-sw" style="background:${TD.FC[t.code] || TD.FC.DEFAULT}"></span><div><b>${E(t.name)}</b> <span class="muted">· ${t.n.toFixed(2)} ha · ${t.polys} area${t.polys === 1 ? "" : "s"}</span><p>${E(habInfo(t.code))}</p></div></div>`)));
      h.appendChild(l);
    },
    mosaicTable(h) {
      TD.section(h, "Mosaic habitats", "A mosaic is where two or more habitat types occur together in patches too small to map separately.");
      h.appendChild(TD.h(`<table class="tbl"><thead><tr><th>Combination</th><th>Areas</th><th>Hectares</th></tr></thead><tbody>${D.mosaics.map(m => `<tr><td><b>${E(m.code)}</b></td><td>${m.n}</td><td>${m.ha.toFixed(3)}</td></tr>`).join("")}</tbody></table>`));
    },
    artBar(h) {
      TD.section(h, "Artificial vs semi-natural", "Semi-natural habitats develop with little human modification. Artificial habitats are heavily modified, such as conifer plantations.");
      const cols = { "Semi-Natural": "#3a9a40", Artificial: "#c8a040" };
      h.appendChild(TD.h(`<div><div class="stack">${D.artSemi.map(r => `<div style="width:${r.pct.toFixed(1)}%;background:${cols[r.name] || "#888"}">${Math.round(r.pct)}%</div>`).join("")}</div>
        <div class="stack-key">${D.artSemi.map(r => `<span><i style="background:${cols[r.name] || "#888"}"></i>${E(r.name)} · ${r.ha.toFixed(2)} ha</span>`).join("")}</div></div>`));
    },
    habColours() { const c = {}; D.habTypes.forEach(t => { c[t.name] = TD.FC[t.code] || TD.FC.DEFAULT; }); return c; },
    areasPane(h) {
      this.fossittBars(h, true);
      const top = D.habTypes[0], tot = D.habTotalHa;
      TD.insights(h, [
        { big: TD.pct(top.n, tot), lbl: "of the site is " + top.name.replace(/^\w+ - /, "").toLowerCase(), sub: top.n.toFixed(2) + " of " + tot.toFixed(2) + " ha", colour: TD.FC[top.code] },
        { big: tot.toFixed(2) + " ha", lbl: "mapped in total", sub: D.habMapped + " separate areas" },
        { big: (tot / D.habMapped * 10000).toLocaleString("en-IE", { maximumFractionDigits: 0 }) + " m²", lbl: "average area", sub: "About " + Math.round(tot / D.habMapped * 10000 / 7140 * 10) / 10 + " football pitches" }]);
      TD.explain(h, "How was this mapped?", [
        "Surveyors walked the site and drew each patch of habitat on a map, then classified it using the Fossitt system, Ireland's standard habitat classification.",
        "Each code describes a type of vegetation. WS1, for example, is scrub, and GS4 is wet grassland. Open the Habitat types chip for a plain-English description of each."]);
    },
    typesPane(h) {
      const [a, b] = TD.split(h);
      TD.section(a, "Share of the site by habitat");
      TD.donut(a, { items: D.habTypes.map(t => ({ name: t.name, n: +t.n.toFixed(2) })), colours: this.habColours(), unit: "ha", centreLabel: "hectares", big: true });
      this.typeList(b);
    },
    mosaicPane(h) {
      const mosHa = D.habs.filter(x => x.mosaic).reduce((s, x) => s + x.ha, 0);
      const [a, b] = TD.split(h);
      TD.section(a, "Mosaic vs single-habitat area");
      TD.donut(a, { items: [{ name: "Single habitat", n: +(D.habTotalHa - mosHa).toFixed(2) }, { name: "Mosaic", n: +mosHa.toFixed(2) }], colours: { "Single habitat": "#9fc9c2", "Mosaic": "#e98965" }, unit: "ha", centreLabel: "hectares", big: true });
      this.mosaicTable(b);
      const names = c => c.split(" / ").map(x => (TD.FOSSITT_NAMES[x] || x).toLowerCase()).join(" and ");
      TD.explain(b, "What is a mosaic?", [
        "Some patches of ground are too mixed to call one habitat. Where two habitat types are woven together in patches too small to map separately, surveyors record them as a mosaic.",
        D.mosaics.length ? "Here, the mosaics are " + D.mosaics.map(m => names(m.code)).filter((v, i, arr) => arr.indexOf(v) === i).join("; ") + ". Mosaics are often good for wildlife because they offer several habitats side by side." : ""].filter(Boolean));
    },
    artPane(h) {
      const cols = { "Semi-Natural": "#3a9a40", Artificial: "#c8a040" };
      const [a, b] = TD.split(h);
      TD.section(a, "Artificial vs semi-natural");
      TD.donut(a, { items: D.artSemi.map(r => ({ name: r.name.replace("-N", "-n"), n: +r.ha.toFixed(2) })), colours: { "Semi-natural": cols["Semi-Natural"], Artificial: cols.Artificial }, unit: "ha", centreLabel: "hectares", big: true });
      const by = {}; D.habs.filter(x => x.layer).forEach(x => { const k = x.art || "Unknown"; (by[k] = by[k] || {}); by[k][x.layer] = (by[k][x.layer] || 0) + x.ha; });
      Object.keys(by).sort((x, y) => (x === "Semi-Natural" ? -1 : 1)).forEach(k => {
        TD.section(b, (k === "Semi-Natural" ? "Semi-natural" : k) + " habitats here");
        const l = TD.h(`<div class="mini-list"></div>`);
        Object.entries(by[k]).sort((x, y) => y[1] - x[1]).forEach(([n, ha]) => l.appendChild(TD.h(`<div class="ml-row"><span class="lg-sw" style="background:${TD.FC[code3(n)] || TD.FC.DEFAULT}"></span><span>${E(n)}</span><b>${ha.toFixed(2)} ha</b></div>`)));
        b.appendChild(l);
      });
      const listOf = o => { const n = Object.keys(o || {}).sort((x, y) => o[y] - o[x]).map(x => x.replace(/^\w+ - /, "").replace(/^\(Mixed\) /, "").toLowerCase()); return n.length > 1 ? n.slice(0, -1).join(", ") + " and " + n[n.length - 1] : (n[0] || "none"); };
      TD.explain(h, "What does semi-natural mean?", [
        "Semi-natural habitats are made up mostly of native plants that have grown up largely on their own, even if people have shaped them over time through grazing, cutting or drainage. On this site that means " + listOf(by["Semi-Natural"]) + ".",
        "Artificial habitats have been created or heavily changed by people. Here, that means " + listOf(by.Artificial) + ".",
        "At " + D.pctSemi + "% semi-natural, most of Ticknock is habitat that native plants and wildlife are adapted to."]);
    },
    card(el) { paneCard(el, this.chips(), { fossitt: h => this.fossittBars(h), types: h => this.fossittBars(h), mosaic: h => this.mosaicTable(h), artnat: h => this.artBar(h) }, "fossitt"); },
    expand(el, st) { TD.xvLayout(el, { chips: this.chips(), initial: st.pane || "fossitt",
      panes: { fossitt: h => this.areasPane(h), types: h => this.typesPane(h), mosaic: h => this.mosaicPane(h), artnat: h => this.artPane(h) } }); }
  };

  /* ---- Linear habitats ---- */
  const linName = t => t.name + (TD.LINE_NAMES[t.code] && !/ - /.test(t.name) ? " - " + TD.LINE_NAMES[t.code] : "");
  R.hab_lin = {
    title: "Linear habitats", group: "Habitats", colour: TD.C.hab_lin, on: true,
    build() {
      return L.geoJSON(GJ_HAB_LIN, {
        style: f => { const c = code3(f.properties.FossLayer); return { color: TD.LINE_FC[c] || TD.LINE_FC.DEFAULT, weight: c === "FW1" ? 3.2 : 2.4, opacity: 0.95 }; },
        onEachFeature: (f, l) => { const p = f.properties; l.bindTooltip(`<b>${E(p.FossLayer || "Linear habitat")}</b>`, { sticky: true, direction: "top" });
          l.bindPopup(popup(null, E(p.FossLayer || "Linear habitat"), [["Type", E(TD.LINE_NAMES[code3(p.FossLayer)] || "")], ["Length", p.length_m ? Math.round(p.length_m) + " m" : ""]], E(habInfo(code3(p.FossLayer))))); }
      });
    },
    chips() { return [{ val: D.lin.length, lbl: "Features" }, { val: D.linTotal, lbl: "Total metres" }]; },
    bars(h) { TD.section(h, "Length by habitat type", "Linear habitats include watercourses, ditches and hedgerows. Length is calculated from the mapped lines.");
      TD.bars(h, { items: D.linTypes.map(t => ({ name: t.name, label: linName(t), n: t.n, colour: TD.LINE_FC[t.code] || TD.LINE_FC.DEFAULT, info: habInfo(t.code) })), unit: " m" }); },
    card(el) { TD.chips(el, this.chips()); this.bars(el); },
    expand(el) {
      TD.chips(el, this.chips());
      const [a, b] = TD.split(el);
      TD.section(a, "Share of total length");
      const cols = {}; D.linTypes.forEach(t => { cols[linName(t)] = TD.LINE_FC[t.code] || TD.LINE_FC.DEFAULT; });
      TD.donut(a, { items: D.linTypes.map(t => ({ name: linName(t), n: t.n })), colours: cols, unit: "m", centreLabel: "metres", big: true });
      this.bars(b);
      const top = D.linTypes[0];
      TD.insights(b, [
        { big: (top.n / 1000).toFixed(2) + " km", lbl: "of " + (TD.LINE_NAMES[top.code] || top.name).toLowerCase(), sub: TD.pct(top.n, D.linTotal) + " of all linear habitat", colour: TD.LINE_FC[top.code] },
        { big: (D.linTotal / 1000).toFixed(2) + " km", lbl: "of linear habitat in total", sub: "About " + (D.linTotal / (STATS.site.perim_m || 1410)).toFixed(1) + " times the site boundary" }]);
      TD.section(el, "Habitat types");
      const l = TD.h(`<div class="type-list"></div>`);
      Array.from(new Set(D.linTypes.map(t => t.code))).forEach(c => l.appendChild(TD.h(`<div class="type-row"><span class="lg-sw" style="background:${TD.LINE_FC[c] || TD.LINE_FC.DEFAULT}"></span><div><b>${E(c + (TD.LINE_NAMES[c] ? " - " + TD.LINE_NAMES[c] : ""))}</b><p>${E(habInfo(c))}</p></div></div>`)));
      el.appendChild(l);
      TD.explain(el, "Why do linear habitats matter?", ["Streams, ditches and hedgerows are narrow, but they link the site together. Wildlife uses them as corridors: bats follow hedgerows and treelines when they hunt, and amphibians and insects move along wet ditches."]);
    }
  };

  /* ---- Birds (keeps bar charts) ---- */
  const pickBird = hlBy("birds", "bird");
  const boTone = b => b === "Red" ? "r" : b === "Amber" ? "a" : "g";
  R.birds = {
    title: "Bird species", group: "Species surveys", colour: TD.C.birds, icon: TD.ICONS.birds, on: true,
    build() {
      return pointLayer(GJ_BIRDS, "birds", TD.ICONS.birds, null, p => {
        const n = sentence(prop(p, "BTO.Name", "BTO_Name")) || "Bird", bo = prop(p, "BoCCI.Stat", "BoCCI_Stat"), bc = bo === "Red" ? "#c0392b" : bo === "Amber" ? "#e67e22" : "#2e9d5b";
        return popup(birdPic(n), E(n), [["Date", E(p.Date)], ["BTO code", E(prop(p, "BTO.Code"))], ["Activity", E(p.Activity)], ["Breeding code", E(prop(p, "Breeding.s"))], ["Habitat", E(p.Habitat)], ["BoCCI", `<b style="color:${bc}">${E(bo)}</b>`]], p.Notes && p.Notes !== "-" ? E(p.Notes) : null);
      }, p => `<b>${E(sentence(prop(p, "BTO.Name", "BTO_Name")))}</b><br><span class="tt-sub">BoCCI ${E(prop(p, "BoCCI.Stat") || "Green")}</span>`);
    },
    chips() {
      const conf = D.birdSpecies.filter(s => s.confirmed), ra = D.birdSpecies.filter(s => s.bocci === "Red" || s.bocci === "Amber");
      return [
        { id: "records", val: D.birds.length, lbl: "Records", tip: "Individual bird observations across all survey visits." },
        { id: "species", val: D.birdSpecies.length, lbl: "Species", tip: "Distinct bird species recorded on site." },
        { id: "breeding", val: conf.length, lbl: "Confirmed breeding", tone: "a", tip: "Species with confirmed breeding evidence (e.g. adults carrying food, recently fledged young)." },
        { id: "redamber", val: ra.length, lbl: "Red / Amber listed", tone: "r", tip: "Species on the Red or Amber list of Birds of Conservation Concern in Ireland (BoCCI)." }];
    },
    recordBars(h) { TD.section(h, "Records by species", "Number of records per species. Click a row to highlight those records on the map.");
      TD.bars(h, { items: D.birdSpecies.map(s => ({ name: s.name, n: s.n })), colour: TD.C.birds, onPick: pickBird }); },
    birdCards(h, list, title, info) { TD.section(h, title, info);
      TD.cards(h, list.map(s => ({ name: s.name, pic: s.pic, meta: s.n + (s.n === 1 ? " record" : " records"), badge: "BoCCI " + s.bocci, badgeTone: boTone(s.bocci) })), { onPick: pickBird, placeholderIcon: TD.ICONS.birds }); },
    habitatBars(h) {
      const by = {}; D.birds.filter(r => r.habitat).forEach(r => { (by[r.habitat] = by[r.habitat] || new Set()).add(r.name); });
      TD.section(h, "Species per habitat", "Number of distinct species recorded in each habitat type.");
      TD.bars(h, { items: Object.entries(by).map(([k, s]) => ({ name: k, n: s.size, label: k + (TD.FOSSITT_NAMES[k] ? " - " + TD.FOSSITT_NAMES[k] : "") })).sort((a, b) => b.n - a.n), colour: TD.C.birds });
    },
    evidence() {
      const LV = { Confirmed: 3, Probable: 2, Possible: 1 };
      const lvl = c => TD.CONFIRMED_BREEDING.includes(c) ? "Confirmed" : ["P", "T", "D", "N", "A", "I", "B"].includes(c) ? "Probable" : ["H", "S"].includes(c) ? "Possible" : "Not breeding / unknown";
      const best = {}; D.birds.forEach(r => { const l = lvl(r.breeding); if (!best[r.name] || (LV[l] || 0) > (LV[best[r.name]] || 0)) best[r.name] = l; });
      const order = ["Confirmed", "Probable", "Possible", "Not breeding / unknown"];
      return order.map(k => ({ name: k, n: Object.values(best).filter(v => v === k).length, species: Object.keys(best).filter(n => best[n] === k) }));
    },
    breedingStory(h) {
      const ev = this.evidence(), cols = { Confirmed: "#b8620a", Probable: "#eda100", Possible: "#f3cf7a", "Not breeding / unknown": "#cfdcd9" };
      const [a, b] = TD.split(h);
      TD.section(a, "Strongest breeding evidence per species");
      TD.donut(a, { items: ev, colours: cols, unit: "species", centreLabel: "species", big: true });
      TD.explain(b, "What counts as confirmed breeding?", [
        "For every bird seen, surveyors note the strongest sign of breeding using standard British Trust for Ornithology (BTO) codes.",
        "Possible: a bird singing or present in suitable habitat. Probable: a pair, a territory or display. Confirmed: clear proof, such as adults carrying food for young or recently fledged chicks.",
        ev[1].n + ev[2].n > 0 ? (ev[1].n + ev[2].n) + " more species showed possible or probable signs, so repeat visits in spring could confirm more breeders." : ""].filter(Boolean));
    },
    bocciStory(h) {
      const n = k => D.birdSpecies.filter(s => s.bocci === k).length;
      const [a, b] = TD.split(h);
      TD.section(a, "Species by conservation status");
      TD.donut(a, { items: [{ name: "Red", n: n("Red") }, { name: "Amber", n: n("Amber") }, { name: "Green", n: n("Green") }], colours: { Red: "#c0392b", Amber: "#e89a2c", Green: "#2e9d5b" }, unit: "species", centreLabel: "species", big: true });
      TD.explain(b, "What are the Red and Amber lists?", [
        "Birds of Conservation Concern in Ireland (BoCCI) sorts Ireland's regularly occurring birds into three lists.",
        "Red: highest concern, usually because of a severe decline in breeding numbers or range. Amber: medium concern. Green: not currently of concern.",
        "Every Red and Amber species using the site adds to its conservation value."]);
    },
    habitatStory(h) {
      const by = {}; D.birds.filter(r => r.habitat).forEach(r => { (by[r.habitat] = by[r.habitat] || new Set()).add(r.name); });
      const top = Object.entries(by).sort((a, b) => b[1].size - a[1].size)[0];
      if (!top) return;
      TD.insights(h, [
        { big: top[1].size, lbl: "species in " + (TD.FOSSITT_NAMES[top[0]] || top[0]).toLowerCase(), sub: "The richest habitat for birds on site" },
        { big: Object.keys(by).length, lbl: "habitat types used by birds", sub: "Records with a habitat noted" }]);
      TD.explain(h, "Why compare habitats?", ["Different birds need different places to feed and nest. Warblers favour scrub, coal tits and goldcrests use the conifers, and snipe need wet ground. Keeping a mix of habitats keeps a mix of birds."]);
    },
    panes(big) { return {
      records: h => this.recordBars(h),
      species: h => this.birdCards(h, D.birdSpecies, "Species recorded", "Click a photo to enlarge it, or 'Show on map' to highlight records."),
      breeding: h => { this.birdCards(h, D.birdSpecies.filter(s => s.confirmed), "Confirmed breeding species"); if (big) this.breedingStory(h); },
      redamber: h => { this.birdCards(h, D.birdSpecies.filter(s => s.bocci === "Red" || s.bocci === "Amber").sort((a, b) => (a.bocci === "Red" ? 0 : 1) - (b.bocci === "Red" ? 0 : 1)), "Red and Amber listed species", "Red = highest conservation concern; Amber = medium concern."); if (big) this.bocciStory(h); },
      habitat: h => { this.habitatBars(h); if (big) this.habitatStory(h); } }; },
    card(el) { const p = this.panes(); paneCard(el, this.chips(), p, "records", el => { const b = TD.h(`<button type="button" class="link-btn">Species per habitat ›</button>`); b.onclick = () => TD.openExpanded("birds", { pane: "habitat" }); el.appendChild(b); }); },
    expand(el, st) { TD.xvLayout(el, { chips: this.chips(), panes: this.panes(true), initial: st.pane || "records", extraTabs: [{ id: "habitat", label: "Species per habitat" }] }); }
  };

  /* ---- Bats ---- */
  R.bats = Object.assign({
    title: "Bat species", group: "Species surveys", colour: TD.C.bats, icon: TD.ICONS.bats, on: false,
    build() { return pointLayer(GJ_BATS, "bats", TD.ICONS.bats, null,
      p => popup(batPic(p.Species), E(sentence(prop(p, "Common.Nam") || p.Species)), [["Species", `<i>${E(p.Species)}</i>`], ["Date", E(p.Date)]]),
      p => `<b>${E(sentence(prop(p, "Common.Nam") || p.Species))}</b><br><i class="tt-sub">${E(p.Species)}</i>`); }
  }, speciesLayer({ key: "bats", recs: D.bats, species: D.batSpecies, colours: D.batColours, icon: TD.ICONS.bats,
    story: (h, pane) => {
      const top = D.batSpecies[0], span = TD.dateSpan(D.bats);
      if (pane === "records") TD.insights(h, [
        { big: TD.pct(top.n, D.bats.length), lbl: "of records were " + top.name, sub: top.n + " of " + D.bats.length + " bat passes", colour: D.batColours[top.name] },
        span && { big: span.visits, lbl: span.visits === 1 ? "survey night" : "survey nights", sub: span.label },
        { big: D.batSpecies.filter(s => /pipistrel/i.test(s.name)).length, lbl: "pipistrelle species", sub: "Ireland's smallest and most familiar bats" }]);
      TD.explain(h, "What do these records mean?", [
        "Bats were surveyed with an acoustic detector, which records the ultrasonic calls bats use to find their way and catch insects. Each species calls at its own pitch, which is how they are told apart.",
        "Each record is a bat pass: one bat flying within range of the detector. One bat can make several passes, so the numbers show how active bats are, not how many there are. All bat species in Ireland are protected by law."]);
    },
    recTip: "Bat passes detected during the acoustic survey.", sppTip: "Distinct bat species identified from recordings." }));

  /* ---- Amphibians ---- */
  R.amph = Object.assign({
    title: "Amphibians", group: "Species surveys", colour: TD.C.amph, icon: TD.ICONS.amph, on: false,
    build() { return pointLayer(GJ_AMPH, "amph", TD.ICONS.amph, null,
      p => { const m = amphRec(p); return popup(m && !TD.isVideo(m) ? m : null, E(prop(p, "Common.Nam") || p.Species), [["Species", `<i>${E(p.Species)}</i>`], ["Date", E(p.Date)], ["Stage", E(p.Notes)]], null, m && TD.isVideo(m) ? `<button class="mp-btn" data-video="${E(m)}" data-title="${E(prop(p, "Common.Nam"))}">▶ Play video</button>` : ""); },
      p => `<b>${E(prop(p, "Common.Nam") || p.Species)}</b><br><span class="tt-sub">${E(p.Notes)}</span>`); }
  }, speciesLayer({ key: "amph", recs: D.amph, species: D.amphSpecies, colours: D.amphColours, icon: TD.ICONS.amph, obsList: true,
    story: (h, pane) => {
      const span = TD.dateSpan(D.amph), stages = Array.from(new Set(D.amph.map(r => r.notes).filter(Boolean)));
      const breeding = D.amph.filter(r => /spawn|tadpole/i.test(r.notes)).length;
      if (pane === "records") TD.insights(h, [
        { big: stages.length, lbl: "life stages recorded", sub: stages.join(", ") },
        { big: breeding, lbl: breeding === 1 ? "breeding record" : "breeding records", sub: "Frogspawn or tadpoles found on site" },
        span && { big: span.visits, lbl: "survey visits", sub: span.label }]);
      TD.explain(h, "What do these records mean?", [
        "Amphibians were recorded whenever they were found during site visits, including adults, frogspawn and tadpoles.",
        "Spawn and tadpoles are good news: they show frogs are breeding here, which depends on shallow pools and wet ground staying on the site."]);
    },
    recTip: "Amphibian observations, including adults, spawn and tadpoles.", sppTip: "Distinct amphibian species recorded on site." }));

  /* ---- Invertebrates ---- */
  R.inv = Object.assign({
    title: "Invertebrates", group: "Species surveys", colour: TD.C.inv, icon: TD.ICONS.inv, on: false,
    build() { return pointLayer(GJ_INV, "inv", TD.ICONS.inv, null,
      p => popup(invRec(p), E(prop(p, "Common.Nam") || p.Species), [["Species", `<i>${E(p.Species)}</i>`], ["Date", E(p.Date)], ["Stage", E(p.Notes)]]),
      p => `<b>${E(prop(p, "Common.Nam") || p.Species)}</b><br><span class="tt-sub">${E(p.Notes)}</span>`); }
  }, speciesLayer({ key: "inv", recs: D.inv, species: D.invSpecies, colours: D.invColours, icon: TD.ICONS.inv, obsList: true, stages: true,
    story: (h, pane) => {
      const bf = D.invSpecies.filter(s => /butterfl/i.test(s.name)).length, mo = D.invSpecies.filter(s => /moth/i.test(s.name)).length;
      const young = new Set(D.inv.filter(r => !/^adult/i.test(r.notes)).map(r => r.name)).size, span = TD.dateSpan(D.inv);
      if (pane === "records") TD.insights(h, [
        { big: bf + " / " + mo, lbl: "butterfly / moth species", sub: "Of " + D.invSpecies.length + " species recorded" },
        { big: young, lbl: "species breeding on site", sub: "Seen as caterpillars or cocoons" },
        span && { big: span.visits, lbl: "survey visits", sub: span.label }]);
      TD.explain(h, "Why butterflies and moths?", [
        "Butterflies and moths respond quickly to changes in their habitat, so they are widely used as indicators of how healthy a site is.",
        "Many depend on one or a few food plants as caterpillars. The cinnabar moth, for example, feeds on ragwort, and the peacock butterfly on nettles."]);
    },
    recTip: "Invertebrate observations, mostly butterflies and moths.", sppTip: "Distinct invertebrate species identified on site." }));

  /* ---- Pollinators (FIT Counts) ---- */
  const fitWord = n => n === 1 ? "insect" : "insects";
  const flowerName = f => String(f || "").split(" - ")[0].trim();
  const flowerSci = f => { const p = String(f || "").split(" - "); return p.length > 1 ? p.slice(1).join(" - ").trim() : ""; };
  const fitDate = r => new Date(r.date + "T00:00").toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
  function fitPopup(r) {
    const groups = Object.entries(r.groups).map(([g, n]) => `<tr><td><span class="lg-sw sm" style="background:${D.fitColours[g]}"></span>${E(g)}</td><td>${n}</td></tr>`).join("");
    return `<div class="mp"><div class="mp-body"><div class="mp-kicker">FIT Count</div><div class="mp-title">${fitDate(r)} · ${E(r.time)}</div>
      <table><tr><td>Target flower</td><td>${E(flowerName(r.flower))}${flowerSci(r.flower) ? `<br><i class="muted">${E(flowerSci(r.flower))}</i>` : ""}</td></tr><tr><td>Flowers counted</td><td>${r.flowers_counted} ${E(r.flower_unit)}${r.flowers_counted === 1 ? "" : "s"}</td></tr>
      <tr><td>Habitat</td><td>${E(r.habitat)}</td></tr><tr><td><b>Insects seen</b></td><td><b>${r.total}</b></td></tr>${groups}</table>
      <div class="mp-note">${E(r.cloud)} · ${E(r.wind)} · ${E(r.sun)}</div></div></div>`;
  }
  R.fit = {
    title: "Pollinators", group: "Species surveys", colour: TD.C.fit, icon: TD.ICONS.fit, on: false, month: "all",
    build() {
      const g = L.layerGroup();
      D.fit.forEach(r => { const ic = TD.mkIcon(TD.ICONS.fit, TD.C.fit); const m = L.marker(r.ll, { icon: ic, props: r }); m._baseIcon = ic; m._fit = r;
        m.bindTooltip(`<b>FIT Count · ${fitDate(r)}</b><br><span class="tt-sub">${r.total} ${fitWord(r.total)} on ${E(flowerName(r.flower))}</span>`, { direction: "top", offset: [0, -12] });
        m.bindPopup(fitPopup(r), { maxWidth: 290 }); g.addLayer(m); });
      return g;
    },
    setMonth(mo) {
      this.month = mo;
      this.mapLayer.eachLayer(m => { const on = mo === "all" || m._fit.month === mo; m.setOpacity(on ? 1 : 0.18); if (m.setZIndexOffset) m.setZIndexOffset(on ? 500 : 0); });
      TD.$$("[data-fit-month]").forEach(n => n.setActive && n.setActive(mo));
    },
    monthTabs(host, onChange) {
      const tabs = [{ id: "all", label: "Overall" }].concat(D.fitMonths.map(([k, lbl]) => ({ id: k, label: lbl })));
      const seg = TD.tabs(host, tabs, this.month, id => { this.setMonth(id); onChange(id); });
      seg.dataset.fitMonth = "1"; seg.classList.add("seg-months");
      return seg;
    },
    chips(s) { return [
      { id: "counts", val: s.counts, lbl: "FIT Counts", tip: "Flower-Insect Timed Counts: 10-minute counts of insects visiting a 50 × 50 cm patch of a target flower." },
      { id: "insects", val: s.insects, lbl: "Insects", tip: "Total insects seen landing on the target flowers." },
      { val: s.counts ? s.perCount.toFixed(1) : "-", lbl: "Insects per count", tip: "Average insects per 10-minute count. Use this to compare months with different numbers of counts." }]; },
    donut(h, s, big) {
      TD.section(h, "Insect groups", "FIT Counts record insects by group rather than species. Click a group to highlight the counts where it was seen.");
      TD.donut(h, { items: s.groups, colours: D.fitColours, unit: "insects", big, onPick: g => TD.highlight("fit", p => (this.month === "all" || p.month === this.month) && !!(p.groups || {})[g], g) });
      if (s.zero) h.appendChild(TD.h(`<div class="note">${s.zero} of ${s.counts} count${s.counts === 1 ? "" : "s"} recorded no insects.</div>`));
    },
    story(h, s) {
      const [a, b] = TD.split(h);
      if (this.month === "all" && D.fitMonths.length > 1) {
        TD.section(a, "Insects per count, by month", "Average number of insects per 10-minute count. Months with more counts are not inflated.");
        TD.bars(a, { items: D.fitMonths.map(([k, lbl]) => { const m = D.fitStats(k); return { name: lbl, n: +m.perCount.toFixed(2), label: lbl + " (" + m.counts + " count" + (m.counts === 1 ? "" : "s") + ")" }; }), colour: TD.C.fit, fmt: n => n.toFixed(1) });
      }
      const fl = {}; s.rows.forEach(r => { const k = flowerName(r.flower); (fl[k] = fl[k] || { n: 0, c: 0 }); fl[k].n += r.total; fl[k].c++; });
      const fls = Object.entries(fl).map(([k, v]) => ({ name: k, n: +(v.n / v.c).toFixed(2), label: k + " (" + v.c + ")" })).sort((x, y) => y.n - x.n);
      TD.section(a, "Insects per count, by target flower", "Average insects per count on each flower. The number in brackets is how many counts were made on it.");
      TD.bars(a, { items: fls, colour: "#e87ba4", fmt: n => n.toFixed(1) });
      const best = fls[0];
      TD.explain(b, "What is a FIT Count?", [
        "A Flower-Insect Timed Count is a simple 10-minute survey. The recorder watches a 50 × 50 cm patch of one type of flower and counts every insect that lands on the flowers, sorted into broad groups such as bumblebees, hoverflies and butterflies.",
        "Repeating counts through the season shows which flowers matter most to pollinators and how their numbers change over time." + (best && fls.length > 1 ? " So far, " + best.name.toLowerCase() + " has attracted the most insects per count on this site." : "")]);
    },
    list(h, s) {
      TD.section(h, "Counts", "Click a count to show it on the map.");
      const el = TD.h(`<div class="obs"></div>`);
      s.rows.forEach(r => { const row = TD.h(`<div class="obs-row clickable"><div class="obs-thumb obs-dot" style="background:${TD.C.fit}"></div><div class="obs-main"><b>${fitDate(r)} · ${E(r.time)}</b><span>${E(flowerName(r.flower))} · ${r.flowers_counted} ${E(r.flower_unit)}s</span></div><div class="obs-date"><b>${r.total}</b> ${fitWord(r.total)}</div></div>`);
        row.onclick = () => TD.focusFit(r); el.appendChild(row); });
      h.appendChild(el);
    },
    card(el) {
      if (!D.fit.length) { el.appendChild(TD.h(`<div class="empty-note">Pollinator data unavailable.</div>`)); return; }
      const body = TD.h(`<div></div>`);
      const render = () => { body.innerHTML = ""; const s = D.fitStats(this.month); TD.chips(body, this.chips(s)); this.donut(body, s); };
      this.monthTabs(el, render); el.appendChild(body); render();
    },
    expand(el, st) {
      const top = TD.h(`<div class="xv-top"></div>`); el.appendChild(top);
      const body = TD.h(`<div></div>`); el.appendChild(body);
      let pane = st.pane || "insects";
      const render = () => { body.innerHTML = ""; const s = D.fitStats(this.month);
        TD.xvLayout(body, { chips: this.chips(s), initial: pane, panes: {
          insects: h => { pane = "insects"; this.donut(h, s, true); this.story(h, s); },
          counts: h => { pane = "counts"; this.list(h, s); } } }); };
      this.monthTabs(top, render); render();
    }
  };
  TD.focusFit = r => {
    TD.closeExpanded(); TD.setLayerVisible("fit", true);
    TD.LAYERS.fit.mapLayer.eachLayer(m => { if (m._fit === r) { TD.map.flyTo(r.ll, 18, { duration: 0.6 }); setTimeout(() => m.openPopup(), 650); } });
    if (TD.isMobile()) TD.sheet("peek");
  };

  /* ---- Tree planting ---- */
  const pickTree = hlBy("trees", "tree");
  R.trees = {
    title: "Tree planting", group: "Restoration", colour: TD.C.trees, icon: TD.ICONS.trees, on: false,
    build() { return pointLayer(GJ_TREES, "trees", TD.ICONS.trees, p => D.treeColours[p.Species] || TD.C.trees,
      p => { const t = TD.TREES[p.Species] || {}; return popup(t.file ? A("tree-pics/" + t.file) : null, E(p.Species || "Tree"), [["Species", t.sci ? `<i>${E(t.sci)}</i>` : ""]]); },
      p => `<b>${E(p.Species || "Tree")}</b>`); },
    chips() { return [{ id: "trees", val: D.trees.length, lbl: "Trees planted", tip: "Native trees planted as part of the restoration programme." },
      { id: "species", val: D.treeSpecies.length, lbl: "Species", tip: "Native tree species planted." }]; },
    donut(h, big) { TD.section(h, "Species breakdown", "Click a segment or name to highlight those trees on the map.");
      TD.donut(h, { items: D.treeSpecies.map(s => ({ name: s.name, n: s.n, sub: s.sci })), colours: D.treeColours, unit: "trees", onPick: pickTree, big }); },
    cards(h) { TD.section(h, "Species planted", "Click a photo to enlarge it.");
      TD.cards(h, D.treeSpecies.map(s => ({ name: s.name, sci: s.sci, pic: s.pic, meta: s.n + " planted", credit: "" })), { onPick: pickTree, placeholderIcon: TD.ICONS.trees }); },
    card(el) { paneCard(el, this.chips(), { trees: h => this.donut(h), species: h => this.cards(h) }, "trees"); },
    story(h) {
      const top = D.treeSpecies[0];
      TD.insights(h, [
        { big: TD.pct(top.n, D.trees.length), lbl: "of trees planted are " + top.name.toLowerCase(), sub: top.n + " of " + D.trees.length + " trees", colour: D.treeColours[top.name] },
        { big: D.treeSpecies.length + " / " + D.treeSpecies.length, lbl: "species are native to Ireland", sub: D.treeSpecies.map(t => t.name).join(", ") }]);
      TD.explain(h, "Why plant native trees?", [
        "All of the trees planted here are native Irish species. Native trees have grown alongside Irish wildlife for thousands of years, so they support far more insects than introduced trees, and those insects feed birds and bats.",
        "The mix matters too. Birch, alder and willow grow quickly and give early cover, oak and holly are slower but long-lived, and rowan berries are an important autumn food for birds."]);
    },
    expand(el, st) { TD.xvLayout(el, { chips: this.chips(), initial: st.pane || "trees", panes: { trees: h => { this.donut(h, true); this.story(h); }, species: h => { this.cards(h); this.story(h); } } }); }
  };

  /* ---- Wildlife cameras ---- */
  const playClip = (c, cam) => TD.lightbox("video", A("videos/" + c.file), c.sp + " - " + cam, "", "");
  function camPopup(c) {
    const sp = c.species.map(s => E(s.name)).join(", ");
    return `<div class="mp"><div class="mp-body"><div class="mp-kicker">Wildlife camera</div><div class="mp-title">${E(c.name)}</div>
      ${c.clips.length ? `<table><tr><td>Clips</td><td>${c.clips.length}</td></tr><tr><td>Species</td><td>${c.species.length}</td></tr></table><div class="mp-note">${sp}</div>
      <button class="mp-btn" data-cam="${E(c.name)}">View footage</button>` : `<div class="mp-note">No footage currently available.</div>`}</div></div>`;
  }
  R.cameras = {
    title: "Wildlife cameras", group: "Monitoring", colour: TD.C.cameras, icon: TD.ICONS.cameras, on: true,
    build() {
      const g = L.layerGroup();
      D.cams.forEach(c => { const ic = TD.mkIcon(TD.ICONS.cameras, TD.C.cameras); const m = L.marker(c.ll, { icon: ic, props: { cam: c.name } }); m._baseIcon = ic;
        m.bindTooltip(`<b>${E(c.name)}</b><br><span class="tt-sub">${c.clips.length ? c.clips.length + " clips" : "No footage yet"}</span>`, { direction: "top", offset: [0, -12] });
        m.bindPopup(camPopup(c), { maxWidth: 260 }); g.addLayer(m); });
      return g;
    },
    chips() { return [
      { val: D.cams.length, lbl: "Cameras" }, { val: D.allClips.length, lbl: "Video clips" }, { val: D.camSpecies.length, lbl: "Species" }]; },
    pickSpecies(name) { const s = D.camSpecies.find(x => x.name === name); TD.highlight("cameras", p => s && s.cams.includes(p.cam), name + " - cameras that recorded it"); },
    donut(h, big) { TD.section(h, "Species detected", "Number of video clips per species across all cameras. Click a species to highlight the cameras that recorded it.");
      TD.donut(h, { items: D.camSpecies.map(s => ({ name: s.name, n: s.n, sub: s.sci })), colours: D.camColours, unit: "clips", onPick: n => this.pickSpecies(n), big }); },
    footage(h) {
      D.cams.forEach(c => {
        const blk = TD.h(`<div class="cam-blk"><div class="cam-hdr"><span class="cam-dot"></span>${E(c.name)}<span class="muted">${c.clips.length ? c.clips.length + " clips" : ""}</span></div><div class="cam-clips"></div></div>`);
        const list = TD.$(".cam-clips", blk);
        if (!c.clips.length) list.appendChild(TD.h(`<div class="muted small">No footage currently available.</div>`));
        c.clips.forEach((x, i) => { const n = c.clips.filter((y, j) => y.sp === x.sp && j <= i).length, tot = c.clips.filter(y => y.sp === x.sp).length;
          const b = TD.h(`<button type="button" class="clip"><span class="play">▶</span>${E(x.sp)}${tot > 1 ? ` <span class="muted">(${n})</span>` : ""}</button>`); b.onclick = () => playClip(x, c.name); list.appendChild(b); });
        h.appendChild(blk);
      });
    },
    card(el) {
      TD.chips(el, this.chips());
      const host = TD.h(`<div class="pane"></div>`);
      TD.tabs(el, [{ id: "species", label: "Species" }, { id: "footage", label: "Footage" }], "species", id => { host.innerHTML = ""; id === "species" ? this.donut(host) : this.footage(host); });
      el.appendChild(host); this.donut(host);
    },
    expand(el, st) {
      const wrap = TD.h(`<div class="xv-grid cam-xv"><aside class="xv-rail cam-rail"></aside><section class="xv-main"></section></div>`);
      el.appendChild(wrap);
      const rail = TD.$(".cam-rail", wrap), main = TD.$(".xv-main", wrap);
      const btns = [{ id: "all", label: "All cameras", sub: D.allClips.length + " clips" }].concat(D.cams.map(c => ({ id: c.name, label: c.name, sub: c.clips.length ? c.clips.length + " clips" : "No footage" })));
      btns.forEach(b => { const n = TD.h(`<button type="button" class="cam-pick" data-id="${E(b.id)}">${b.id === "all" ? `<span class="cam-all">${D.cams.length}</span>` : `<img src="${A(TD.ICONS.cameras)}" alt="">`}<span><b>${E(b.label)}</b><small>${E(b.sub)}</small></span></button>`);
        n.onclick = () => show(b.id); rail.appendChild(n); });
      const show = (id, sp) => {
        TD.$$(".cam-pick", rail).forEach(b => b.classList.toggle("active", b.dataset.id === id));
        main.innerHTML = "";
        if (id === "all") {
          TD.chips(main, this.chips()); this.donut(main, true);
          TD.section(main, "Cameras at a glance");
          const g = TD.h(`<div class="insights"></div>`);
          D.cams.forEach(c => { const t = TD.h(`<button type="button" class="insight ins-btn"><div class="ins-big">${c.clips.length || "-"}</div><div class="ins-lbl">${E(c.name)}: ${c.clips.length ? c.clips.length + " clips" : "no footage yet"}</div><div class="ins-sub">${c.species.length ? E(c.species.map(x => x.name).join(", ")) : "Footage not currently available"}</div></button>`); t.onclick = () => show(c.name); g.appendChild(t); });
          main.appendChild(g);
          TD.explain(main, "How do wildlife cameras work?", [
            "Camera traps are triggered by movement and heat, so they film wildlife day and night without anyone being there. They are especially good at catching shy, nocturnal mammals such as badgers and foxes.",
            "Clips are not a count of animals: the same badger or deer can appear in several clips. What the cameras show is which species use the site, and where."]);
          return;
        }
        const c = D.cams.find(x => x.name === id);
        TD.section(main, c.name + (c.clips.length ? ` - ${c.species.length} species, ${c.clips.length} clips` : ""));
        if (!c.clips.length) { main.appendChild(TD.h(`<div class="empty-note">No footage currently available for ${E(c.name)}.</div>`)); return; }
        if (sp) return detail(c, sp);
        const grid = TD.h(`<div class="animals"></div>`);
        c.species.forEach(s => {
          const info = TD.CAM_SPECIES[s.name] || {}, pic = camPic(s.name);
          const card = TD.h(`<div class="animal"><div class="animal-img">${pic ? `<img src="${pic}" alt="${E(s.name)}">` : ""}</div>
            <div class="animal-name">${E(s.name)}</div><div class="animal-sci">${E(info.sci || "")}</div>
            <div class="animal-btns"><button type="button" class="pill-btn" data-a="learn">Learn about me</button><button type="button" class="pill-btn ghost" data-a="site">See me on site</button></div></div>`);
          const im = TD.$("img", card); const ph = () => { TD.$(".animal-img", card).innerHTML = `<div class="card-ph"><img src="${A(TD.ICONS.cameras)}" alt=""><span>Image to come</span></div>`; };
          if (im) im.addEventListener("error", ph, { once: true }); else ph();
          TD.$('[data-a="learn"]', card).onclick = () => show(id, s.name);
          TD.$(".animal-img", card).onclick = () => show(id, s.name);
          TD.$('[data-a="site"]', card).onclick = () => { TD.closeExpanded(); this.pickSpecies(s.name); };
          grid.appendChild(card);
        });
        main.appendChild(grid);
      };
      const detail = (c, spName) => {
        const s = D.camSpecies.find(x => x.name === spName) || { name: spName }, info = TD.CAM_SPECIES[spName] || {}, clips = c.clips.filter(x => x.sp === spName), pic = camPic(spName);
        const d = TD.h(`<div class="animal-detail"><button type="button" class="link-btn back">‹ All ${E(c.name)} species</button>
          <div class="ad-grid"><div class="animal-img big">${pic ? `<img src="${pic}" alt="">` : ""}</div>
          <div><h3>${E(spName)}</h3><div class="animal-sci">${E(info.sci || "")}</div><p>${E(info.note || "")}</p>
          <div class="muted small">${clips.length} clip${clips.length === 1 ? "" : "s"} on ${E(c.name)}${s.cams && s.cams.length > 1 ? ` · also recorded on ${E(s.cams.filter(x => x !== c.name).join(", "))}` : ""}</div>
          <div class="cam-clips"></div><button type="button" class="pill-btn ghost" data-a="site">See me on site</button></div></div></div>`);
        const im = TD.$(".animal-img img", d); const ph = () => { TD.$(".animal-img", d).innerHTML = `<div class="card-ph"><img src="${A(TD.ICONS.cameras)}" alt=""><span>Image to come</span></div>`; };
        if (im) im.addEventListener("error", ph, { once: true }); else ph();
        clips.forEach((x, i) => { const b = TD.h(`<button type="button" class="clip"><span class="play">▶</span>Clip ${i + 1}</button>`); b.onclick = () => playClip(x, c.name); TD.$(".cam-clips", d).appendChild(b); });
        TD.$(".back", d).onclick = () => show(c.name);
        TD.$('[data-a="site"]', d).onclick = () => { TD.closeExpanded(); this.pickSpecies(spName); };
        main.appendChild(d);
      };
      show(st.cam || "all");
    }
  };

  TD.ORDER = ["study", "route", "hab_area", "hab_lin", "birds", "bats", "amph", "inv", "fit", "trees", "cameras"];
  TD.GROUPS = ["General", "Habitats", "Species surveys", "Restoration", "Monitoring"];
})();
