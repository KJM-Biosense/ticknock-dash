/* Ticknock v2 - 3D opening orbit (Cesium).
   Desktop only, shown on every page load unless suppressed with ?intro=0.
   Skipped for reduced-motion/save-data users. Any failure falls straight through to the 2D dashboard. */
'use strict';

TD.intro = (function () {
  const LOAD_TIMEOUT = 9000;     // give up on Cesium after this
  const BUTTON_DELAY = 2600;     // ms after orbit starts before the button fades in
  const RANGE = 950, PITCH = -26; // metres from site centre, degrees
  let viewer = null, raf = null, done = false;

  const q = new URLSearchParams(location.search).get("intro");
  function shouldRun() {
    if (q === "0") return false;
    if (q === "1") return true;
    if (TD.isMobile()) return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (navigator.connection && navigator.connection.saveData) return false;
    return true;
  }

  function loadCesium() {
    if (window.Cesium) return Promise.resolve();
    return new Promise((res, rej) => {
      window.CESIUM_BASE_URL = TD.CESIUM_URL;
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = TD.CESIUM_URL + "Widgets/widgets.css"; document.head.appendChild(css);
      const s = document.createElement("script"); s.src = TD.CESIUM_URL + "Cesium.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s);
      setTimeout(() => rej(new Error("timeout")), LOAD_TIMEOUT);
    });
  }

  function siteRing() {
    const g = GJ_STUDY.features[0].geometry;
    const ring = g.type === "Polygon" ? g.coordinates[0] : g.coordinates[0][0];
    const lon = ring.reduce((s, c) => s + c[0], 0) / ring.length, lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    return { ring, lon, lat };
  }

  function finish(immediate, failed) {
    if (done) return; done = true;
    const ov = TD.$("#intro");
    ov.classList.add("leaving");
    setTimeout(() => {
      ov.classList.remove("open", "leaving", "ready", "show-btn");
      if (raf) cancelAnimationFrame(raf); raf = null;
      if (viewer && !viewer.isDestroyed()) viewer.destroy(); viewer = null;
      TD.$("#introGlobe").innerHTML = "";
      TD.map.invalidateSize();
    }, immediate ? 0 : 900);
  }

  async function start(force) {
    if (!force && !shouldRun()) return;
    done = false;
    const ov = TD.$("#intro");
    ov.classList.add("open");
    TD.$("#introSkip").onclick = () => finish();
    TD.$("#introGo").onclick = () => finish();
    try {
      await loadCesium();
      const C = window.Cesium;
      C.Ion.defaultAccessToken = TD.CESIUM_TOKEN;
      const terrain = C.Terrain.fromWorldTerrain();
      const imagery = C.ImageryLayer.fromWorldImagery();
      const failed = new Promise((_, rej) => {
        terrain.errorEvent.addEventListener(e => rej(new Error("terrain: " + (e && e.message))));
        imagery.errorEvent.addEventListener(e => rej(new Error("imagery: " + (e && e.message))));
      });
      failed.catch(() => {});
      viewer = new C.Viewer("introGlobe", {
        terrain, baseLayer: imagery,
        animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false,
        sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false, infoBox: false,
        selectionIndicator: false, requestRenderMode: false
      });
      viewer.scene.globe.enableLighting = false;
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.fog.enabled = true;
      viewer.scene.screenSpaceCameraController.enableInputs = false;
      viewer._cesiumWidget._creditContainer.classList.add("intro-credits");

      const { ring, lon, lat } = siteRing();
      viewer.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray(ring.flat()), width: 4, clampToGround: true,
        material: new C.PolylineGlowMaterialProperty({ glowPower: 0.25, color: C.Color.fromCssColorString("#5ff2e0") }) } });
      viewer.entities.add({ polygon: { hierarchy: C.Cartesian3.fromDegreesArray(ring.flat()), material: C.Color.fromCssColorString("#39c6bc").withAlpha(0.18), classificationType: C.ClassificationType.TERRAIN } });

      // park the camera at the approach position so the first tiles loaded are the ones we need
      let heading = C.Math.toRadians(200);
      viewer.camera.lookAt(C.Cartesian3.fromDegrees(lon, lat, 350), new C.HeadingPitchRange(heading, C.Math.toRadians(-55), RANGE * 6));

      // wait until terrain + imagery are ready and the first tiles have drawn, or give up
      const firstTiles = new Promise(res => { const off = viewer.scene.globe.tileLoadProgressEvent.addEventListener(n => { if (n === 0 && viewer.scene.globe.tilesLoaded) { off(); res(); } }); });
      await Promise.race([
        Promise.all([new Promise(r => terrain.readyEvent.addEventListener(r)), new Promise(r => imagery.readyEvent.addEventListener(r))]).then(() => firstTiles),
        failed,
        new Promise((_, rej) => setTimeout(() => rej(new Error("3D tiles took too long")), LOAD_TIMEOUT))
      ]);
      if (done) return;

      let h = 350;
      try { const [pos] = await C.sampleTerrainMostDetailed(viewer.terrainProvider, [C.Cartographic.fromDegrees(lon, lat)]); if (pos && isFinite(pos.height)) h = pos.height; } catch (e) {}
      const centre = C.Cartesian3.fromDegrees(lon, lat, h);

      // approach: from high and far, then settle into orbit
      const pitch = C.Math.toRadians(PITCH);
      viewer.camera.lookAt(centre, new C.HeadingPitchRange(heading, C.Math.toRadians(-55), RANGE * 6));
      ov.classList.add("ready");
      const t0 = performance.now(), APPROACH = 3200;
      let orbitStart = null;
      const step = now => {
        if (done || !viewer || viewer.isDestroyed()) return;
        const t = Math.min(1, (now - t0) / APPROACH), e = 1 - Math.pow(1 - t, 3);
        heading += C.Math.toRadians(t < 1 ? 0.12 : 0.07);
        const range = RANGE * 6 + (RANGE - RANGE * 6) * e;
        const p = C.Math.toRadians(-55 + (PITCH + 55) * e);
        viewer.camera.lookAt(centre, new C.HeadingPitchRange(heading, t < 1 ? p : pitch, range));
        if (t >= 1 && orbitStart == null) { orbitStart = now; setTimeout(() => ov.classList.add("show-btn"), BUTTON_DELAY); }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    } catch (err) {
      console.warn("3D intro unavailable, continuing to dashboard:", err && err.message);
      finish(true, true);
    }
  }

  return { start, maybeStart: () => start(false), finish };
})();
