# Marine animal discovery

Four independent procedural discovery animals now inhabit the ocean. Ambient wildlife and GUP fleet discovery are unchanged. Open **Creature Collection** beside the settings badge: four hidden model silhouettes become named, illustrated fact cards as species are discovered. Clicking an unlocked card shows its scientific name and details. Proximity automatically saves, pauses, emits the existing bubble burst, and opens the Octopod scanner. Continue Exploring resumes the same player pose. Animals stay in the world after discovery.

## Configuration and locations

`src/marine/AnimalRegistry.js` owns stable IDs, names, exact supplied facts, visual source, scale, discovery radius, habitat center, and movement parameters. Routes are small ellipses around these X/Z centers:

| ID | X | Z | Habitat / movement |
| --- | --- | --- | --- |
| octopus | -45 | 66 | Rocky reef, 5m slow route with near-pauses and gently moving arms |
| bottlenose-dolphin | 110 | 215 | Accessible open water near the start, 19m arcs and playful vertical motion |
| whale-shark | -230 | -120 | Spacious water away from the showcase, 28m slow wide turns |
| giant-manta-ray | 65 | 110 | Reef edge, 14m banked glide with flapping wings |

Y is a preferred depth; initialization samples each whole route against terrain and existing static scenery. A fixed clearance floor keeps movement smooth and protects the complete model. Animals never register solid collision bodies or modify existing surfaces. The whale shark is substantially larger. Nearby animation runs in the existing unpaused loop; distant animals update at most four times per second and models hide beyond 240m.

## Replace visuals later

`createAnimalVisual(definition)` returns `{group,animate(time,dt),dispose()}`. All model internals stay in `AnimalVisual.js`; `MarineAnimals.js` controls habitats and motion independently of representation. To replace a procedural animal set `visual: {source:'glb',modelPath:'./assets/models/your-animal.glb',thumbnailPath:'./assets/img/your-animal.png'}`. Keep its ID, facts, position and behavior. Optional orientation `{x,y,z}` is in radians; `animation: {clip,speed}` selects an imported clip. The GLB adapter uses the existing Draco-capable loader, preserves textures/materials, and applies registry scale. Add future supplied assets to the production build copy manifest.

Thumbnails use the existing game WebGL renderer and a temporary 256px render target once at startup; the target is disposed immediately and the resulting PNG data URL stays in memory. No extra WebGL renderer, downloads, generated assets or persistent thumbnail pipeline is introduced. Supplied thumbnail paths take precedence for future models. The exported `loadMarineAnimal` remains available as an explicit standalone integration helper; the game uses the common visual factory for its managed animals.

Progress uses localStorage key `oceanbound.marine-discoveries.v1` with `{version:1,ids:[]}`. Stable IDs survive visual replacement and registry additions. Invalid or denied storage is safe; unavailable writes retain progress for the dive and show a status. Unknown saved IDs remain for future registry additions but never count or trigger. GUP unlock data is separate.

## Validation and limitations

`node --test tests/*.test.js` covers registry validation, proximity, pause blocking, moving centers, saving and reloading, unknown IDs and existing gameplay systems. `tests/marine-animals-browser.cjs` covers all four encounters, matching model thumbnails, collection unlocks, refreshing progress, model retention, mobile viewport bounds and browser errors; it uses the existing local development server at port 5173. Procedural models are temporary low-poly representations. Physical iPhone Safari performance and future GLB asset quality still need device validation.
