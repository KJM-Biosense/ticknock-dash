# Ticknock dashboard

The live site is served from the repository root. `/v2/` is an older backup copy.

## Files
- `index.html` - page shell
- `css/dashboard.css` - all styles (the mobile layout is at the bottom)
- `js/config.js` - content: colours, image filenames, camera clips, species notes, Cesium token
- `js/core.js` - shared components (donut, chips, cards, lightbox, expanded view, map highlight)
- `js/layers.js` - one entry per layer (map, side card, expanded view). All figures are calculated from the data here.
- `js/intro3d.js` - 3D opening orbit
- `js/app.js` - start-up and wiring
- `data/data_v2.js` - **generated**; do not edit by hand

The site also reads `dashboard_data/data.js` (the original survey layers) and `assets/`.

When you change any js/css/data file, bump the `?v=` date string in `index.html` so browsers fetch the new version.

## Adding data
1. Put new FIT Count exports (.csv or .xlsx) in `raw/fit-count/`. Any filename works, months are detected from the dates, and a count that appears in two files is only used once.
2. Replace GeoPackages in `raw/gpkg/` if the camera locations, route, planted trees, rare plants or Polliknow devices change.
3. Run `python tools/build_data.py` from the repo root. You need `pip install pyproj openpyxl`.

## Adding images
- Tree photos: `assets/tree-pics/birch.jpg`, `alder.jpg`, `oak.jpg`, `willow.jpg`, `rowan.jpg`, `holly.jpg`
- Camera species cut-outs (transparent PNG): `assets/camera-species/badger.png`, `sika-deer.png`, `red-fox.png`, `robin.png`, `sparrowhawk.png`, `pheasant.png`
- Rare plant photos: `assets/rare-plant-pics/<Scientific name>.jpg` (mapped in `TD.RARE_PICS`).
- Polliknow device photos: add to `assets/polliknow/` and list them in `TD.POLLIKNOW_PICS` in `js/config.js`.
- Drone video: `assets/videos/ticknock-drone.mp4` (+ `ticknock-drone.jpg` still). Walking route photo: `assets/route/timber-walkway.jpg`.
- Photo credits: edit `TD.CREDITS` in `js/config.js`.
- New camera clips: add the file to `assets/videos/` and a line to `TD.CAM_CLIPS` in `js/config.js`.

Missing images show an "Image to come" placeholder, so nothing breaks.

## 3D intro
- Desktop only, shown on the first visit only, and skipped when the device asks for reduced motion.
- `?intro=1` forces it and `?intro=0` suppresses it. The "3D overview" button in the top bar replays it.
- Before going live, restrict the Cesium ion token to the GitHub Pages domain.
