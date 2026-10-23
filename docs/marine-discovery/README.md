# Marine animal discovery

The shipping registry is empty. Ambient wildlife, fleet discovery, and animal assets are unchanged. Open **Creature Collection** beside the settings badge. The shared Octopod frame, scan lines, modal focus isolation and pause tokens work in portrait and landscape. Escape or close resumes the same player pose; Continue Exploring closes celebrations. The empty registry skips proximity work and loads no models, particles, or thumbnails.

## Register future assets

Add definitions to `marineAnimals` in `src/marine/MarineDiscovery.js`. Required fields: stable `id`, `commonName`, `scientificName`, `modelPath`, `thumbnailPath`, short accurate `fact`, `habitat`, `position: {x,y,z}`, and positive `discoveryRadius` (world units). Optional: `additionalFacts`, `scale`, `orientation: {x,y,z}` in radians, `animation: {clip,speed}`, `behavior` configuration, and `updateDistance` (default 100). IDs must never be recycled. Discovery state is queried via `isDiscovered(id)`, never stored in asset definitions. Use direct local asset URLs.

`loadMarineAnimal(definition,{scene,discovery})` is an opt-in GLB adapter using the existing Draco-capable loader. It preserves GLB materials, applies transforms, and plays a named imported clip. Keep returned instances and call their `update(dt,playerVector3)` in the unpaused loop when models are introduced. Optional `behavior({group,dt,config})` implements species-specific motion; no ambient movement code is involved. Updates are distance gated. Dispose owned assets on removal. Registered proximity spheres are logical only, with no solid physics. Moving instances publish centers through `setPosition`; static encounters use configured positions. Only explicitly registered IDs are accepted.

The game checks registry proximity after GUP movement and before world updates. The first undiscovered encounter is recorded and saved before opening its modal, acquiring a pause token, and emitting the existing lightweight bubble burst at the encounter position. Only bubble celebration rendering continues during pause. No extra audio is introduced.

Progress uses localStorage key `oceanbound.marine-discoveries.v1` with `{version:1,ids:[]}`. Malformed data and denied storage are safe; failed writes retain progress for the dive and show a storage status. Unknown saved IDs remain for later registry additions but never count or trigger encounters. Fleet unlock data is separate.

## Future import phase

Supply real GLBs and model-rendered thumbnail PNGs, author child-friendly facts, verify Safari materials/animation and scale in the existing Blender pipeline, choose safe encounter positions and radii, and wire the explicit model adapter lifecycle into scene loading and updates. Export thumbnails offline from Blender; collection uses normal images and never creates a WebGL renderer. Add assets to the production build copy manifest when provided. No model adapter is invoked before actual assets are supplied.

## Verification

`npm test` covers the empty registry, first-only forgiving proximity, pause blocking, moving centers, save/reload, invalid storage, stable IDs and unknown ambient IDs. Existing control, wildlife, camera, audio, fleet and collision regression suites are also run. Manual iPhone Safari device validation remains necessary.
