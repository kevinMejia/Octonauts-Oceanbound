# Marine animal discovery

Eleven independent discoverable species (24 individual animals) now inhabit the ocean. Ambient wildlife and GUP fleet discovery are unchanged. Open **Creature Collection** beside the settings badge: eleven hidden model silhouettes become named, illustrated fact cards as species are discovered. Clicking an unlocked card shows its scientific name and details. Proximity automatically saves, pauses, emits the existing bubble burst, and opens the Octopod scanner. Continue Exploring resumes the same player pose. Animals stay in the world after discovery.

## Configuration and locations

`src/marine/AnimalRegistry.js` owns stable IDs, names, exact supplied facts, visual source, scale, discovery radius, habitat center, and movement parameters. Routes are small ellipses around these X/Z centers:

| ID | X | Z | Habitat / movement |
| --- | --- | --- | --- |
| octopus | -45 | 66 | Rocky reef, 5m slow route with near-pauses and gently moving arms |
| bottlenose-dolphin | 110 | 215 | Accessible open water near the start, 19m arcs and playful vertical motion |
| whale-shark | -230 | -120 | Spacious water away from the showcase, 28m slow wide turns |
| giant-manta-ray | 65 | 110 | Reef edge, 14m banked glide with flapping wings |

Y is a preferred depth; initialization samples each whole route against terrain and existing static scenery. A fixed clearance floor keeps movement smooth and protects the complete model. Animals never register solid collision bodies or modify existing surfaces. The whale shark is substantially larger. Nearby animation runs in the existing unpaused loop; distant animals update at most four times per second and models hide beyond 240m.

## Seven additional species

The original four entries, procedural models, sizes, animation, movement path, and spawn positions are unchanged. `ExpandedRegistry.js`, appended to the original registry, adds exactly seven species; no turtle or ambient animal is registered.

| Species | Count | Habitat center X, Z | Motion |
| --- | ---: | --- | --- |
| Hammerhead Shark | 3 | 70, -65 | Loose open-water school, broad turns and tail sweeps |
| Seahorse | 4 | -43, 12 | Sheltered coral/seaweed edge, upright hover and dorsal flutter |
| Jellyfish | 6 | -85, 190 | Quiet water, pulsing translucent bells and swaying tentacles |
| Spotted Eagle Ray | 2 | 90, 50 | Reef shallows, pointed spotted wings and banking glide |
| Moray Eel | 1 | -49, 102 | Rocky reef edge, short peeking route with jaw/head motion |
| Pufferfish | 3 | 44, 145 | Coral garden, fin flutter and brief subtle puff every 16 seconds |
| Humpback Whale | 1 | 350, -180 | Spacious ocean, wide 40m turns and slow horizontal tail strokes |

`AnimalGroups.js` adds formation offsets, modest size variation, phase offsets, smooth motion, and a conservative terrain/scenery clearance envelope for these new encounters only. All group members remain close without overlapping. The shared discovery controller accepts their current world-space centers; proximity to **any** member saves one stable species ID and uses the existing modal and bubble celebration. Previously discovered members never replay the unlock. Original single-animal proximity follows its unchanged path.

`ExpandedVisuals.js` supplies the seven procedural visuals through the existing factory. Each encounter shares geometry and materials between its members. Eagle-ray spots and pufferfish spikes are instanced; jellyfish use simple transparent/emissive materials with no bloom or post-processing. Animations only change pivots/scales, never geometry. Distant group updates are throttled to four per second and visibility follows the existing 240m distance. New-species thumbnails use the same temporary render-target pipeline, with camera fitting for tall silhouettes; original thumbnails keep their existing framing. No new assets or dependencies are required.

Existing saved IDs load unchanged: four original discoveries become **4 of 11**, a fresh player sees **0 of 11**, and a completed collection shows **11 of 11**. Replacing `visual.source` with `glb` preserves species IDs, group counts, behavior, facts, and progress. Named imported clips and material textures are prepared through the common visual/texture pipeline. Group-level shared resources are disposed together.

## Replace visuals later

`createAnimalVisual(definition)` returns `{group,animate(time,dt),dispose()}`. All model internals stay in `AnimalVisual.js`; `MarineAnimals.js` controls habitats and motion independently of representation. To replace a procedural animal set `visual: {source:'glb',modelPath:'./assets/models/your-animal.glb',thumbnailPath:'./assets/img/your-animal.png'}`. Keep its ID, facts, position and behavior. Optional orientation `{x,y,z}` is in radians; `animation: {clip,speed}` selects an imported clip. The GLB adapter uses the existing Draco-capable loader, preserves textures/materials, and applies registry scale. Add future supplied assets to the production build copy manifest.

Thumbnails use the existing game WebGL renderer and a temporary 256px render target once at startup; the target is disposed immediately and the resulting PNG data URL stays in memory. No extra WebGL renderer, downloads, generated assets or persistent thumbnail pipeline is introduced. Supplied thumbnail paths take precedence for future models. The exported `loadMarineAnimal` remains available as an explicit standalone integration helper; the game uses the common visual factory for its managed animals.

Progress uses localStorage key `oceanbound.marine-discoveries.v1` with `{version:1,ids:[]}`. Stable IDs survive visual replacement and registry additions. Invalid or denied storage is safe; unavailable writes retain progress for the dive and show a status. Unknown saved IDs remain for future registry additions but never count or trigger. GUP unlock data is separate.

## Validation and limitations

`node --test tests/*.test.js` covers registry validation, proximity, pause blocking, moving centers, saving and reloading, unknown IDs and existing gameplay systems. `tests/marine-animals-browser.cjs` covers the four original encounters, matching model thumbnails, collection unlocks, refreshing progress, model retention, mobile viewport bounds and browser errors; it uses the existing local development server at port 5173. Procedural models are temporary low-poly representations. Physical iPhone Safari performance and future GLB asset quality still need device validation.

`tests/marine-expansion-browser.cjs` checks all seven new encounters using the last member of each group, upgrading saved 4/11 progress to 11/11 and reloading, desktop/mobile layouts, a fresh iPhone Chrome emulation with the 512px vehicle texture budget, group counts, continued model retention, non-overlapping bounded routes, shared geometry identity across animation updates, and browser errors. Physical iPhone Safari/Chrome performance remains unverified.

## Creature HUD

The existing collection button is a compact orange-trimmed teal **CREATURES** capsule beside the original settings badge. Its fish icon is inline SVG and its counter reads current discovery count / registered species. The collection UI refreshes the counter on construction and when an encounter or collection opens, so the existing discovery callback updates it immediately without changes to persistence or proximity rules. Branding reflows separately at desktop and narrow portrait sizes, with safe-area offsets, focus/keyboard support and 44px touch targets. `tests/creature-hud-browser.cjs` verifies five viewport layouts, logo/settings behavior, keyboard and touch activation, counter changes, saved reload and full 11/11 sizing at 320px.
