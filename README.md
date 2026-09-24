# Ticknock dashboard v2

Development version at `/v2/`. The live dashboard (`/index.html`) is untouched.

## Files
- `index.html` - page shell
- `css/dashboard.css` - all styles (the mobile layout is at the bottom)
- `js/config.js` - content: colours, image filenames, camera clips, species notes, Cesium token
- `js/core.js` - shared components (donut, chips, cards, lightbox, expanded view, map highlight)
- `js/layers.js` - one entry per layer (map, side card, expanded view). All figures are calculated from the data here.
- `js/intro3d.js` - 3D opening orbit
- `js/app.js` - start-up and wiring
- `data/data_v2.js` - **generated**; do not edit by hand

v2 also reads the existing `../dashboard_data/data.js` and `../assets/`.

## Adding data
1. Put new FIT Count exports (.csv or .xlsx) in `raw/fit-count/`. Any filename works, months are detected from the dates, and a count that appears in two files is only used once.
2. Replace GeoPackages in `raw/gpkg/` if the camera locations or route change.
3. Run `python tools/build_data.py` from the repo root. You need `pip install pyproj openpyxl`.

## Adding images
- Tree photos: `assets/tree-pics/birch.jpg`, `alder.jpg`, `oak.jpg`, `willow.jpg`, `rowan.jpg`, `holly.jpg`
- Camera species cut-outs (transparent PNG): `assets/camera-species/badger.png`, `sika-deer.png`, `red-fox.png`, `robin.png`, `sparrowhawk.png`, `pheasant.png`
- New camera clips: add the file to `assets/videos/` and a line to `TD.CAM_CLIPS` in `js/config.js`.

Missing images show an "Image to come" placeholder, so nothing breaks.

## 3D intro
- Desktop only, shown on the first visit only, and skipped when the device asks for reduced motion.
- `?intro=1` forces it and `?intro=0` suppresses it. The "3D overview" button in the top bar replays it.
- Before going live, restrict the Cesium ion token to the GitHub Pages domain.
