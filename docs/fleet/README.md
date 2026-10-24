# GUP discovery and fleet expansion

Implemented locally on 2026-10-23. Runtime exports and authoring downloads are deliberately ignored and have not been published. Existing A/B/R GLBs and PNGs are unchanged.

| GUP | Source | Runtime GLB | Thumbnail | Triangles | Materials / embedded textures | Integration / issue |
| --- | --- | --- | --- | ---: | --- | --- |
| A/B/R | Existing working imports | Existing exports reused | Existing PNGs reused | Unchanged | Unchanged | Shared discovery/home parking; B starts unlocked |
| C | `Gup-C/GupC.blend` | `assets/models/gup-c.glb` | `assets/img/vehicles/gup-c.png` | 660,728 | 59 / 21 | Playable, locked until found, dedicated home, 1 rotor |
| D | `Gup-D/GupD.blend` | `assets/models/gup-d.glb` | `assets/img/vehicles/gup-d.png` | 176,960 | 46 / 19 | Playable, discovery/home; no safely separable propeller, parts stationary |
| E | `Gup-E/GupE.blend` | `assets/models/gup-e.glb` | `assets/img/vehicles/gup-e.png` | 150,262 | 40 / 16 | Playable, discovery/home, 2 rotors |
| F | `Gup-F/GupF.blend` | `assets/models/gup-f.glb` | `assets/img/vehicles/gup-f.png` | 256,424 | 18 / 9 | Playable, discovery/home, 3 rotors; authored flat materials need no texture archive |
| Q | `Gup-Q/GupQ.blend` | `assets/models/gup-q.glb` | `assets/img/vehicles/gup-q.png` | 739,772 | 144 / 93 | Playable, discovery/home, 1 rotor; assembled source used |
| X | Empty `Gup-X/` | None | None | — | — | Incomplete; excluded without a placeholder |

The duplicate C source in Q's folder is not another vehicle. `GupQsplit.blend` is a separated variant, not a second playable Q. Authoring paths in the table are relative to `assets/models/`.

## Files and architecture

- `tools/import_fleet.py`, `tools/blender/prepare_vehicle.py`, and `tools/fleet-import.json` generalize the established Blender preparation workflow. Blender 5.0.1 was used once discovered/downloaded locally. Source hashes, script and scale determine the cache; a second batch run reused all five successful exports. Per-job failures continue to the next model, with logs in `.local-assets/fleet-import/`.
- `src/config/importedVehicles.js` contains generated per-vehicle data; `vehicleConfig.js` remains the registry consumed by the controller, carousel, HUD, loader, discovery and parking. `tools/build.py` includes runtime models from that registry and excludes source folders.
- `VehicleUnlocks.js` persists stable unlocked IDs under `oceanbound.fleet.v1`, ignores obsolete IDs, preserves audio/settings, and falls back to this session when storage is blocked. Only B defaults unlocked. `?discoveryDebug` enables the explicit development reset hook.
- `DiscoveryFleet.js` and `fleetPlacement.js` reuse the collision grid, swept hull math and cached model groups. Each group is either active or parked; no model clone or second controller is created. Locked models stay at discovery locations; discovered inactive models use configurable Octopod-relative homes. Placement checks terrain, structures, other fleet slots and the returning vehicle's slot.
- `DiscoveryModal.js` / `discovery.css` share the Control Panel's physical bezel, CRT screen and scanlines through `settings.css`. The large actual-model thumbnail switches vehicles. Close preserves the unlock/current vehicle. Generation guards protect retry, cancellation and repeated taps; the modal releases only its own pause token.
- `Game.js`, the selector and `PropulsionWater.js` connect discovery to existing startup, HUD, input, audio and pooled bubbles. Only celebration bubbles animate during the discovery pause; simulation and turbo timers stop. No discovery sound is added.
- The three-lobe collision proxy now supports a separate fore/aft extent for wide vehicles such as D. Existing A/B/R proxy behavior is preserved. High-resolution meshes are not colliders.

## Asset validation

Every exported triangle count equals the evaluated source count, with no decimation. Original files/archives were hash-checked unchanged, all GLB headers/lengths validated, and every image embedded. Each new 640×448 PNG is transparent and rendered from the actual model with consistent lighting/framing. All five thumbnails and all five runtime models were visually inspected for complete geometry, upright/forward orientation, recognizable materials, windows and cropping. Authored movie displays become static frames, and procedural colors are baked to textures using the established workflow; Blender-only shaders cannot be copied literally into glTF.

## Validation performed

- 131 Node tests pass. Coverage includes every registered vehicle's forward/reverse/turbo speed and swept turbo collision, wide hull clearance, persistence/corrupt storage, gating, asynchronous cancellation, shared identity, home parking, contact triggers, spatial-grid movement, lazy loading and GPU eviction.
- `python tools/build.py` passes GLB validation and creates versioned modules.
- `tests/fleet-browser.cjs` passes in headless Edge/Chromium: initial silent PLAY gate; eight fleet entries; only A/B/R preloaded; locked carousel; all seven discoveries and selections; thumbnail updates; gameplay movement/turbo; one group per vehicle; previous vehicle returning home; all parked positions clear; persistence after reload; no repeated per-session GLB downloads; failed shader preparation/retry; close without selection; cancel during preparation; independent pause ownership; portrait/landscape modal screenshots; real emulated touch hold; existing Audio tab; no page errors.
- `tests/fleet-production.cjs` passes against `dist/` in mobile touch emulation: silent startup, eight entries, C discovery/activation, running existing audio context after PLAY.
- Visual evidence remains local: `.local-assets/discovery-{desktop,portrait,landscape}.png`, `fleet-locked.png`, `fleet-home.png`, `playable-gup-{c,d,e,f,q}.png`, and `fleet-mobile-audio.png`.
- Physical iPhone Safari and real-device frame rates have not been tested. Chromium mobile emulation does not establish Safari compatibility or device performance.

## Performance and remaining work

New high-detail models load only within 95 m, one at a time; startup retains the existing A/R preload behavior. Load queries and distance checks are throttled. Parked models beyond 160 m become invisible and release renderer allocations once, retaining decoded CPU data/images for reuse without another download. Active models always stay visible. Hidden tabs stop game updates.

Measured in the Chromium low rendering profile at the fully unlocked base: 1,041 allocated geometries, 225 textures, 1,896 render calls and 7,921,040 submitted triangles including the surrounding world. After travelling away: 195 geometries and 23 textures. These are renderer counters, not phone frame-rate results; see `browser-results.json`. The fleet itself contains approximately 2.8 million source triangles. Q has 144 exported materials, so its many separate material draws are a particular optimization target. A future static same-material mesh batching/material-atlas pass could reduce draw submission while preserving geometry, independent rotors and transparent windows. No quality reduction or automatic decimation was applied.

Source hashes and detailed export dimensions/counts are in `imports.json`. Raw Blender files, archives, generated GLBs/PNGs and local preview evidence have not been pushed. Publishing the code together with the runtime exports requires a deliberate later publication step; deploying this commit alone without its local exports would leave the new model URLs unavailable.

## Reproduce locally

With compatible Blender, Python, Node and Playwright/Edge available:

```text
python tools/import_fleet.py --blender <absolute-blender-executable>
node --test tests/*.test.js
python tools/build.py
python -m http.server 5173
node tests/fleet-browser.cjs
node tests/fleet-production.cjs
```

## Publication approval

The user explicitly approved publishing the five runtime GLBs and thumbnails after local validation. These ten assets are now tracked for the GitHub Pages deployment. Original Blender files, texture archives, working copies and preview evidence remain local. This approval supersedes the earlier local-only publication status above.

## Collected fleet around the Octopod

`src/config/fleetParkingConfig.js` assigns the eight existing GUPs stable, outward-facing berths on a 24m arc around the central base, on its cleared level sand. Opposite left/right slots spread the fleet evenly and leave an open front approach. The current piloted GUP stays with the player; switching parks it in its own berth. Locked GUPs retain their original discovery locations. Unlocking moves the collected model home through the existing parking/proxy synchronization, and saved collections use the same berths on refresh without changing saved IDs.

The central runtime mapping in `vehicleConfig.js` overrides only parking spawn/heading, preserving each GUP's own ground clearance and all model, discovery, movement and audio configuration. Generated imports can be regenerated without overwriting the layout, and unknown future IDs keep their authored custom parking until assigned a berth. No additional models, clones or rendering loops are added. Existing collision-aware placement and GPU resource handling remain in use.

Validation includes all eight hulls against real Octopod collision data and one another, at least 14m between centers, relative-base positioning, unchanged discovery anchors, live saved-fleet loading, and repeated switches returning inactive models to their berths. The full Node suite has 171 passing tests; the live eight-model check reports no WebGL or page errors.
