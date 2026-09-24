/* Ticknock v2 - configuration: paths, colours, images, species notes.
   Everything that is "content" rather than "behaviour" lives here. */
'use strict';
window.TD = window.TD || {};

TD.ASSETS = "assets/";
TD.CESIUM_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IktDSlRSay1GTDRPQzloeWwiLCJqdGkiOiJhNTFjY2QyYi05Y2ZhLTRhYjUtYjI3OC1lMmRmMjY2OWJjZjUiLCJpZCI6NTA2NDE5LCJzdWIiOiJLSk0tQmlvc2Vuc2UiLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoiYmlvc2Vuc2UiLCJpYXQiOjE3OTAyMzc4MDZ9.VQstiNn5WgdH0Wepa5WeAkyxJyzetg_kD85nv0HeEiM";
TD.CESIUM_URL = "https://cdn.jsdelivr.net/npm/cesium@1.121.0/Build/Cesium/";

/* Categorical palette - fixed order, validated for colour-blind separation on adjacent slices.
   Colours follow the entity (species), never its rank; a 9th category folds into "Other". */
TD.PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
TD.OTHER = "#9aa69c";

/* Layer colours (dots, rings, headers) */
TD.C = {
  study: "#176560", route: "#ffd84d", hab_area: "#3a9a40", hab_lin: "#7ab648", birds: "#4a90d9",
  bats: "#9b59b6", amph: "#16a085", inv: "#d35400", fit: "#c2185b", trees: "#27ae60", cameras: "#e74c3c"
};

TD.ICONS = {
  birds: "icons/bird.png", bats: "icons/bat_icon_256.png", amph: "icons/amphibian_icon_256.png",
  inv: "icons/invertebrate_icon_256.png", fit: "icons/flower_icon_256.png", trees: "icons/plant.png",
  cameras: "icons/camera.png", snapshot: "icons/Biodiversity Snapshot Icon.png"
};

/* Habitat colours (area) keyed by Fossitt code */
TD.FC = { GS3: "#d4d861", GS4: "#e98965", GS1: "#c7dc72", GS2: "#e0e88a", HD1: "#d13aa2", WD1: "#9b8e7f",
  WD4: "#7d4aa8", WS1: "#1fc7a6", WL1: "#1fd6c2", FW1: "#00a9e6", FW4: "#8b3fd1", DEFAULT: "#9aa69c" };
TD.LINE_FC = { FW1: "#00a9e6", FW4: "#8b3fd1", WL1: "#00e0c6", DEFAULT: "#00c7b7" };

TD.FOSSITT_DESC = {
  WS1: "Scrub is made up of dense shrubs such as hawthorn, blackthorn, willow or gorse. It provides important shelter, nesting sites and food sources for birds, mammals and insects, making it a valuable habitat for biodiversity.",
  WD4: "Conifer plantation woodland consists of planted evergreen trees, typically grown for timber production. While generally less diverse than native woodland, these forests can still provide habitat for birds, mammals and woodland wildlife.",
  GS4: "Wet grassland occurs on poorly drained or seasonally waterlogged ground and is often characterised by rushes and moisture-loving plants. These areas are important for birds, amphibians, pollinators and other wildlife that depend on wet habitats.",
  GS3: "Dry-humid acid grassland develops on acidic soils and supports a range of grasses, wildflowers and insects. Although often overlooked, these grasslands can provide valuable habitat for biodiversity.",
  GS1: "Improved grassland is farmland that has been managed to increase grass production for grazing or silage. While it is important for agriculture, it generally supports fewer plant and animal species than semi-natural grasslands.",
  GS2: "Dry calcareous grassland develops on lime-rich soils and is often rich in wildflowers. These species-rich grasslands are among Ireland's most valuable habitats for pollinators and other wildlife.",
  HD1: "Dense bracken is dominated by tall bracken ferns and is commonly found on hillsides and rough ground. While extensive bracken can limit plant diversity, it can still provide cover and shelter for some wildlife species.",
  FW1: "Eroding and upland rivers are fast-flowing streams that support aquatic insects, fish, birds and mammals such as otters. Healthy watercourses also connect habitats across the landscape.",
  FW4: "Drainage ditches are artificial or modified channels that carry water through the landscape. They can provide valuable habitat for aquatic plants, insects and amphibians, particularly where water quality is good.",
  WD1: "Broadleaved woodland is dominated by native trees such as oak, ash, birch and willow. These woodlands are among Ireland's richest habitats, supporting a wide variety of plants, birds, mammals and insects.",
  WL1: "Hedgerows are linear strips of shrubs and trees along field boundaries. They act as wildlife corridors and provide food, shelter and nesting sites for birds, bats, mammals and insects.",
  DEFAULT: "This habitat was mapped as part of the ecological survey using the Fossitt habitat classification system, which is widely used to describe and assess habitats in Ireland."
};
TD.FOSSITT_NAMES = { GS1: "Improved grassland", GS2: "Dry calcareous grassland", GS3: "Dry-humid acid grassland", GS4: "Wet grassland", HD1: "Dense bracken", WD1: "Broadleaved woodland", WD4: "Conifer plantation", WS1: "Scrub", WL1: "Hedgerows", FW1: "Eroding / upland rivers", FW4: "Drainage ditches" };
TD.LINE_NAMES = { FW1: "Eroding / upland rivers", FW4: "Drainage ditches", WL1: "Hedgerows" };

/* ---------- Species images (existing files in /assets) ---------- */
TD.BIRD_PICS = {
  "blackbird": "Blackbird - Image - Saxifraga - Merel bij Garderen.jpg",
  "blackcap": "Blackcap - Image - Saxifraga - Mark Zekhuis.jpg",
  "blue tit": "Blue Tit - Image - Saxifraga.jpg",
  "buzzard": "Buzzard - image - saxifragia - theotherkev-buzzard-6980727.jpg",
  "chaffinch": "Chaffinch - image - Saxifraga-Piet Munsterman.jpg",
  "chiffchaff": "Chiffchaff - image - hapr80-bird-7897032.jpg",
  "coal tit": "Coal Tit - image - saxifragia - erik_karits-bird-8312424.jpg",
  "common whitethroat": "Common Whitethroat - Image - Saxifraga - Bart Vastenhouw.jpg",
  "eurasian jay": "Eurasian Jay - Image - Saxifraga.jpg",
  "goldcrest": "Goldcrest - Image - Saxifraga - Bart Vastenhouw.jpg",
  "goldfinch": "Goldfinch - Image - Saxifraga - Mark Zekhuis.jpg",
  "great tit": "Great Tit - image - saxifragia - jggrz-great-tit-7948318.jpg",
  "hooded crow": "Hooded Crow - image - saxifragia - Orna.jpg",
  "jay": "Jay - image - tomaszproszek-jay-548381.jpg",
  "long-tailed tit": "Long-Tailed Tit - image - theotherkev-long-tailed-tit-4769449.jpg",
  "mistle thrush": "Mistle Thrush - image - theotherkev-mistle-thrush-4743360.jpg",
  "red kite": "Red Kite - Image - Saxifraga - Mark Zekhuis.jpg",
  "robin": "Robin - image - terbe_rezso-robin-9419575.jpg",
  "siskin": "Siskin - Image - Saxifraga - Theo Verstrael.jpg",
  "snipe": "Snipe - Image - Saxifraga - Luc Hoogenstein.jpg",
  "song thrush": "Song Thrush - image - theotherkev-thrush-5897868.jpg",
  "sparrowhawk": "Sparrowhawk - image - josepmonter-sparrowhawk-5592388.jpg",
  "swallow": "Swallow - Image - Saxifraga.jpg",
  "treecreeper": "Treecreeper - Image - Saxifraga - Mark Zekhuis.jpg",
  "willow warbler": "Willow Warbler - Image - Saxifraga - Luc Hoogenstein.jpg",
  "woodpigeon": "Woodpigeon - image -Saxifraga-Rudmer Zwerver.jpg",
  "wren": "Wren - image - Saxifraga-Iztok Skornik.jpg",
  "whitethroat": "Whitethroat - image pevank01-warbler-5216084.jpg",
  "dunnock": "Dunnock - image - theotherkev-dunnock-on-a-fence-4857419.jpg",
  "jackdaw": "Jackdaw - image - inspiredimages-bird-445290.jpg",
  "pheasant": "Pheasant.jpg",
  "bullfinch": "Bullfinch.jpg"
};
TD.BAT_PICS = {
  "nyctalus leisleri": "Stock-Nyctalus leisleri-Image-Saxifraga-Jeroen Willemsen.jpg",
  "pipistrellus pipistrellus": "Stock-Pipistrellus pipistrellus-Saxifraga-Rudmer Zwerver.jpg",
  "pipistrellus nathusii": "Stock-Pipistrellus nathusii-Image-Saxifraga-Mark Zekhuis.jpg",
  "pipistrellus pygmaeus": "Stock-Pipistrellus pygmaeus-Image-Adria Baucells.jpg"
};
TD.AMPH_PICS = { "rana temporaria": "Stock-Rana temoraria-Image-Mike Brown.jpg", "bufo bufo": "12.08.2025-Bufo bufo.jpg" };
/* Record-specific media: "date_scientific name" -> file (images or .mp4) */
TD.AMPH_DATE = {
  "01.08.2025_rana temporaria": "01.08.2025-Rana temporaria.jpg",
  "12.02.2026_rana temporaria": "12.02.2026-Rana temporaria.jpg",
  "11.04.2026_rana temporaria": "11.04.2026-Rana temporaria.mp4"
};
TD.INV_PICS = {
  "pararge aegeria": [{ stage: "Adult", file: "Stock-Pararge aegeria-Image-Bob Eade.jpg" }],
  "anthocharis cardamines": [{ stage: "Adult Male", file: "Stock-Anthocharis cardamines-Male-Image-Adam Gor.jpg" }, { stage: "Adult Female", file: "Stock-Anthocharis cardamines-Female-Image-Tamas Nestor.jpg" }],
  "pieris napi": [{ stage: "Adult", file: "23.05.2025-Pieris napi.jpg" }],
  "aphantopus hyperantus": [{ stage: "Adult", file: "24.06.2025-Aphantopus hyperantus.jpg" }],
  "zygaena filipendulae": [{ stage: "Adult", file: "04.06.2025-Zygaena filipendulae-Adult.jpg" }, { stage: "Cocoon", file: "23.05.2025-Zygaena filipendulae-Cocoon.jpg" }],
  "tyria jacobaeae": [{ stage: "Caterpillar", file: "01.08.2025-Tyria jacobaeae-Caterpillar.jpg" }],
  "aglais io": [{ stage: "Adult", file: "Stock-Aglais io-Adult.jpg" }, { stage: "Caterpillar", file: "24.06.2025-Aglais io-Caterpillar.jpg" }]
};

/* ---------- Tree planting (images: assets/tree-pics/<file>) ---------- */
TD.TREES = {
  Birch:  { sci: "Betula sp.",        file: "birch.jpg" },
  Alder:  { sci: "Alnus glutinosa",   file: "alder.jpg" },
  Oak:    { sci: "Quercus sp.",       file: "oak.jpg" },
  Willow: { sci: "Salix sp.",         file: "willow.jpg" },
  Rowan:  { sci: "Sorbus aucuparia",  file: "rowan.jpg" },
  Holly:  { sci: "Ilex aquifolium",   file: "holly.jpg" }
};

/* ---------- Wildlife cameras ---------- */
/* Clips per camera. Species key must match TD.CAM_SPECIES. */
TD.CAM_CLIPS = {
  "Cam 1": [
    { file: "Cam 1 - Badger.MP4", sp: "Badger" }, { file: "Cam 1 - Badger 2.MP4", sp: "Badger" },
    { file: "Cam 1 - Deer.MP4", sp: "Sika deer" }, { file: "Cam 1 - Deer 2.MP4", sp: "Sika deer" },
    { file: "Cam 1 - Fox.MP4", sp: "Red fox" }, { file: "Cam 1 - Fox 2.MP4", sp: "Red fox" },
    { file: "Cam 1 - Robin.MP4", sp: "Robin" }, { file: "Cam 1 - Sparrowhawk.MP4", sp: "Sparrowhawk" }
  ],
  "Cam 2": [
    { file: "Cam 2 - Deer.MP4", sp: "Sika deer" }, { file: "Cam 2 - Deer 2.MP4", sp: "Sika deer" },
    { file: "Cam 2 - Pheasant.MP4", sp: "Pheasant" }
  ],
  "Cam 3": []
};
/* Cut-out images: assets/camera-species/<file>. Notes are DRAFTS for review. */
TD.CAM_SPECIES = {
  "Badger":      { sci: "Meles meles", file: "badger.png",
    note: "A stocky, powerful member of the weasel family. Badgers live in family groups in underground setts and are mostly active at night, feeding largely on earthworms. They are protected under the Wildlife Acts." },
  "Sika deer":   { sci: "Cervus nippon", file: "sika-deer.png",
    note: "Introduced to Ireland at Powerscourt, Co. Wicklow, in 1860, sika deer are now widespread across the Wicklow and Dublin uplands. They use conifer plantations for cover and graze on open ground." },
  "Red fox":     { sci: "Vulpes vulpes", file: "red-fox.png",
    note: "A highly adaptable predator found in almost every Irish habitat. Foxes are most active at dusk and through the night and have a varied diet of small mammals, birds, insects and fruit." },
  "Robin":       { sci: "Erithacus rubecula", file: "robin.png",
    note: "A familiar resident songbird, present all year. Robins are strongly territorial and one of the few birds that sing through the winter." },
  "Sparrowhawk": { sci: "Accipiter nisus", file: "sparrowhawk.png",
    note: "A small, agile bird of prey of woodland and woodland edges. Sparrowhawks hunt small birds by surprise, flying fast and low through cover." },
  "Pheasant":    { sci: "Phasianus colchicus", file: "pheasant.png",
    note: "A large gamebird originally from Asia, introduced to Ireland centuries ago. Pheasants feed on the ground on seeds, shoots and insects, often along woodland edges." }
};

/* Birds: BTO breeding codes counted as confirmed breeding */
TD.CONFIRMED_BREEDING = ["DD", "UN", "ON", "FL", "FS", "NE", "NY", "FF"];
