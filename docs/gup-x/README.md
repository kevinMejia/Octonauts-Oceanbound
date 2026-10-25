# GUP-X implementation

GUP-X now uses the actual purchased Keeks_Q model from `assets/models/Gup-X/GupX.blend`, exported locally with the same Blender preparation workflow as the other imported GUPs. Its carousel thumbnail is rendered from that same prepared Blender scene. No model/texture files or rendered previews were sent to an AI service, and no deployment was performed. The source SHA-256 remains `49ae635758102fa5593e3d1509d0be5c00b0d00736d036752406b9da61b2f667`.

Export: `assets/models/gup-x.glb`, 41,611,284 bytes, 1,193,209 triangles, 62 embedded images. Original visible geometry is preserved, with viewport modifiers evaluated as in the established pipeline. Procedural/generated-coordinate colors and video instruments use the shared baked still-image material conversion. Blender curves, guides, cameras and the editing rig are omitted from the runtime export; their evaluated visible meshes remain.

Reproduce locally: `python tools/import_gup_x.py --blender path/to/blender.exe`. The job is `tools/gup-x-import.json`; the shared exporter is `tools/blender/prepare_vehicle.py`. Original `.blend` and texture archive hashes are checked. Working scene, texture bakes, reports and logs remain under `.local-assets/gup-x-import/`. Re-exporting needs Blender (verified with local Blender 5.0.1) and the existing `tar` archive tool. The placeholder generator has been removed so it cannot overwrite the real asset.

## Integration and changed files

Runtime modules: `src/config/groundVehicleConfig.js`, `src/vehicles/TrackedGroundController.js`, `src/vehicles/TrackAnimator.js`.
Runtime assets: `assets/models/gup-x.glb`, `assets/img/vehicles/gup-x.png`.
Modified runtime: vehicle registry/loader/model/controller, VehicleUnlocks, fleetPlacement, Game, ChaseCamera, Gameplay preferences/Settings, VehicleSelector, EnvironmentalInteractions, PropulsionWater, TurboEffects, and notice styling in style.css.
Asset integration changes: shared prepare_vehicle.py optional source tread morphs, tools/import_gup_x.py, tools/gup-x-import.json, vehicleConfig.js model dimensions, TrackAnimator morph binding, GLB and thumbnail; removed the placeholder generator. Tests include gup-x-asset.test.js, ground-vehicle.test.js and gup-x-browser.cjs; updated discovery, fleet parking and gameplay preference expectations for the final reward.

## Configuration

`groundVehicleConfig.js` uses metres/seconds/radians: forward 10.8 m/s, reverse 3.8 m/s, acceleration response 1.6/s, braking 5/s, turn radius 5 m, maximum slope 45 degrees, ground clearance .65 m, and 120 Hz movement substeps. Turbo uses the existing TurboBoost: 1.9x maximum speed, 2.2x acceleration response, 8 charge/second drain (12.5 seconds), 4/second regeneration. Infinite turbo is the existing word-hunt reward, unchanged.

Swimming movement remains on the existing controller branch. Ground movement ignores rise/jump input, samples centre/front/rear/sides, smooths body pitch and roll, clamps height to terrain support, rejects steep changes, and invokes the existing swept CollisionWorld at each substep. Collision lift/drift is removed after resolution. Towing only affects the existing shared speed multiplier and rear attachment.

Camera distance is 1.4x, height 1.3x existing settings; orbit/reset/collision behavior remains shared. Sand emissions use the existing bounded pools (1.7x normal, additional steering response, 2.2x during turbo); bubbles use the existing pool at .3x swimming rate and a configurable rear exhaust point. Tracks use actual travelled distance and independent differential steering speeds; actual source treads use independent source-derived morph targets.

## Availability

VehicleUnlocks evaluates all registry vehicles except final rewards and entries explicitly marked `requiredForFinal:false`. It saves earned GUP-X once those required GUPs are unlocked, including migration of complete older saves. A short non-modal status notice announces newly earned GUP-X. The gameplay `unlockGupX` preference is applied as an in-memory override; it never enters the saved earned ID set. Disabling it switches an unearned active GUP-X to GUP-B through VehicleFleet; on loading failure the override is restored with an explanatory settings status. Reset clears earned progress while preserving preferences.

## Actual model configuration and treads

Blender source is Z-up and +Y forward; the shared exporter rotates 180 degrees around Blender Z and exports glTF Y-up, +Z forward. Source unit scale is baked at 1.1362949904916015 to produce an 8 m long model (6.01608 m wide, 3.442 m tall). Registry scale is 1, orientation 0. The model offset is +1.141 m relative to the existing controller origin, placing the lower treads approximately .07 m above flat ground at the existing .65 m controller clearance. Collision radius is 3.07 m, half-length 4.04 m, half-height 1.78 m, centre Y 1.141 m. Rear tow attachment is [0,.3,-4.2], exhaust [0,.3,-3.9]. Camera, ground controller and turbo tuning are unchanged.

Source inspection found no saved actions. Each tread consists of one original mesh (`Cylinder.012` / `Cylinder.020`), a 54-link Array, and a closed Curve modifier. The exporter shifts the original link mesh along its local Y axis and evaluates the existing stack at eight intervals across one .154063814 source-unit link pitch; it does not reconstruct a belt or curve. The two resulting meshes are named `LeftTread` and `RightTread`, each with eight `TreadPhase` morphs (two material primitives each). TrackAnimator interpolates those samples independently, using actual signed ground travel and the runtime .1750619398 m link pitch. Direction -1 makes the bottom tread run rearward during forward travel. At wrap, identical successive source links exchange places. Reverse retraces the cycle and stationary speed freezes it. Legacy clip/link bindings remain available for other models.

The original file and archive are never saved or overwritten. The user requested local processing of their purchased copy. Creator terms and any separate permissions still govern redistribution; no publishing permission is inferred from purchase.

## Validation

246 Node unit tests passed, including ground forward/reverse/braking, steering, slopes, support clearance, frame-rate independence (30 versus 120 Hz), turbo against swept obstacles, ignored lift input, infinite turbo, unlock/override/reload/reset, shared turbo state on switching and rear tow attachment. Existing swimming/discovery/camera/rescue/word-hunt/graphics tests also pass.

Headless Edge browser check passed startup, settings override, carousel model selection, ground turbo with zero vertical velocity, independently moving tracks, fallback to GUP-B, and reload with override disabled; no page errors. Real-model provenance, all 1,193,209 triangles, both morph bindings, freeze/reverse, and 100% infinite charge were verified in the browser. Production build passed and validated GLB headers/lengths.

Limitations: temporary track impressions are omitted (optional). The model retains the source's full 1.19 million triangles and is approximately 39.7 MiB; sustained mobile performance is unverified. Subjective driving feel, prolonged performance across devices, real touch hardware, complete in-game letter/creature collection and rescue delivery using GUP-X have not been manually verified; shared logic is covered by existing unit tests. Floating collectibles above terrain must be reached with swimming vehicles when outside the existing pickup range; GUP-X never gains vertical movement to reach them.

## Hill climbing, escape steering and berth fix

Starting-biome sand slopes reach about 41.4 degrees, exceeding the old 32-degree ground limit. The configurable limit is now 45 degrees; sharper cliffs still stop travel and turbo cannot bypass that check. Differential pivot steering (.8 rad/s before input smoothing at rest) lets the tracks turn in opposite directions even when forward travel is blocked. Moving-speed steering reduction remains active. Regressions cover the actual 41-degree hill near (136,127), 40-degree ramp collision sweeps, steeper cliff rejection and pivoting away from a wall.

GUP-X now parks 25 metres behind the Octopod at world (180,75), facing outward, within the level sand clearing. The full hull clears the real Octopod and every other vehicle. Ground parking samples the terrain using the existing tracked alignment logic, applies pitch/roll to the parked model and positions its collision lobes using that same orientation. Swimming berths remain unchanged. Browser validation verifies the installed parked model and proxies after switching back to GUP-B.
