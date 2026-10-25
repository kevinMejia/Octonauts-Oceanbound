# GUP-X implementation

GUP-X uses a locally authored red placeholder GLB and thumbnail. No supplied third-party Blender files were opened, converted, uploaded, or transmitted. Rebuild the placeholder with `tools/create-gup-x-placeholder.py` (Python with Pillow).

## Integration and changed files

New runtime modules: `src/config/groundVehicleConfig.js`, `src/vehicles/TrackedGroundController.js`, `src/vehicles/TrackAnimator.js`.
New assets: `assets/models/gup-x.glb`, `assets/img/vehicles/gup-x.png`.
Modified runtime: vehicle registry/loader/model/controller, VehicleUnlocks, fleetPlacement, Game, ChaseCamera, Gameplay preferences/Settings, VehicleSelector, EnvironmentalInteractions, PropulsionWater, TurboEffects, and notice styling in style.css.
Tests: new ground-vehicle.test.js and gup-x-browser.cjs; updated discovery, fleet parking and gameplay preference expectations for the final reward.

## Configuration

`groundVehicleConfig.js` uses metres/seconds/radians: forward 10.8 m/s, reverse 3.8 m/s, acceleration response 1.6/s, braking 5/s, turn radius 5 m, maximum slope 32 degrees, ground clearance .65 m, and 120 Hz movement substeps. Turbo uses the existing TurboBoost: 1.9x maximum speed, 2.2x acceleration response, 8 charge/second drain (12.5 seconds), 4/second regeneration. Infinite turbo is the existing word-hunt reward, unchanged.

Swimming movement remains on the existing controller branch. Ground movement ignores rise/jump input, samples centre/front/rear/sides, smooths body pitch and roll, clamps height to terrain support, rejects steep changes, and invokes the existing swept CollisionWorld at each substep. Collision lift/drift is removed after resolution. Towing only affects the existing shared speed multiplier and rear attachment.

Camera distance is 1.4x, height 1.3x existing settings; orbit/reset/collision behavior remains shared. Sand emissions use the existing bounded pools (1.7x normal, additional steering response, 2.2x during turbo); bubbles use the existing pool at .3x swimming rate and a configurable rear exhaust point. Tracks use actual travelled distance and independent differential steering speeds; placeholder links are instanced into two draw calls.

## Availability

VehicleUnlocks evaluates all registry vehicles except final rewards and entries explicitly marked `requiredForFinal:false`. It saves earned GUP-X once those required GUPs are unlocked, including migration of complete older saves. A short non-modal status notice announces newly earned GUP-X. The gameplay `unlockGupX` preference is applied as an in-memory override; it never enters the saved earned ID set. Disabling it switches an unearned active GUP-X to GUP-B through VehicleFleet; on loading failure the override is restored with an explanatory settings status. Reset clears earned progress while preserving preferences.

## Final model replacement

Replace modelPath, scale, orientation, groundOffset, collision bounds, tracks, exhaust and towing attachment in vehicleConfig.js. Match local +Z forward, +Y up. `tracks.leftClip` and `tracks.rightClip` bind optional independent GLB animation clips; signed playback follows actual track speed. The authored placeholder uses `LeftTrackLink*` / `RightTrackLink*` meshes. Belt loop length and capsule dimensions can be configured in the track binding. Adjust ground clearance and collision centre for the replacement model. Creator license review and final appearance, dimensions, clips and material verification remain pending an authorized model.

## Validation

239 Node unit tests passed, including ground forward/reverse/braking, steering, slopes, support clearance, frame-rate independence (30 versus 120 Hz), turbo against swept obstacles, ignored lift input, infinite turbo, unlock/override/reload/reset, shared turbo state on switching and rear tow attachment. Existing swimming/discovery/camera/rescue/word-hunt/graphics tests also pass.

Headless Edge browser check passed startup, settings override, carousel model selection, ground turbo with zero vertical velocity, independently moving tracks, fallback to GUP-B, and reload with override disabled; no page errors. Production build passed and validated GLB headers/lengths.

Limitations: temporary track impressions are omitted (optional). Placeholder geometry is deliberately simple. Subjective driving feel, prolonged performance across devices, real touch hardware, complete in-game letter/creature collection and rescue delivery using GUP-X have not been manually verified; shared logic is covered by existing unit tests. Floating collectibles above terrain must be reached with swimming vehicles when outside the existing pickup range; GUP-X never gains vertical movement to reach them.
