# Exploration camera upgrade

The existing chase/orbit camera was inspected before replacement. Previously it used a 55-degree FOV (62 on turbo), fixed distance/height, one follow rate, terrain endpoint clearance and no structure occlusion checks. Actual baseline screenshot: `before.png`.

## Framing and controls

The default is now 65-degree vertical FOV, 16.8 m behind (three measured 5.597 m GUP-B lengths), 6 m elevated, 10-degree side angle and approximately 15-degree downward framing. A small upward aim bias places the hull below screen centre. Default view: `final-default.png`. Narrow aspect ratios increase horizontal distance by up to 32%; landscape keeps the normal distance. The native model and all vehicle movement remain unchanged.

Position response is 7/s and rotation response 10/s, using exponential delta-time factors. World-up targeting ignores hull bank and pitch. The camera has its own smoothed orientation and aim point; it does not copy vehicle rotation. Height and aim are constrained to retain the hull when extreme custom offsets are selected.

Mouse/touch dragging still orbits on the canvas. Recentring waits 2.5 seconds after **release**, including a long stationary drag, then uses the shortest angular return at 1.8/s. Vertical orbit elevation is limited to -8..65 degrees. Forward/reverse buttons and analog steering/depth remain separate from orbit input.

Normal cruising makes almost no zoom change; speed framing ramps smoothly between 10 and 22 m/s, adding at most 10% distance and 3 degrees FOV. Frame-time tests check this is bounded. Near sand, the camera lifts up to 1.2 m without moving the vehicle or changing terrain. Boost capture: `boost.png` (about 67.7-degree FOV during the sampled pass).

## Collision architecture

`CameraObstacles` builds a spatial grid once from existing rock/coral interaction proxies and Octopod ellipsoids. It reuses cached bounds and the existing SurfaceGrid; it never traverses decorative meshes per frame. Oriented expanded-ellipsoid segment tests approximate a camera sphere of radius 0.65 m, with 0.18 m padding. Uneven terrain is sampled along the segment at up to 0.75 m intervals (96 maximum) and the first obstruction is refined. This is a conservative visual proxy system, not exact triangle/swept-volume physics.

The actual smoothed pivot-to-camera segment is checked on every update so smoothing cannot cut a reef corner. Obstructions pull the camera inward immediately; ordinary follow smoothing restores distance afterwards. A proxy already containing the vehicle pivot is skipped to avoid pulling deeper into it; normal vehicle colliders keep the pivot outside major structures. Decorative coral remains cosmetic. In extremely tight space the camera must accept a close view of the hull rather than enter the base; `octopod-occlusion.png` illustrates that constrained view. No meshes are hidden to disguise intersections.

An actual orbit beside the base reduced the camera distance to about 4.2 m with one nearby proxy, then recovered to 17.65 m with orbit angle effectively zero after release. Open-water queries returned zero candidates; the captured mobile reef orbit had 24. No new render passes or meshes are added by the camera.

## Settings

Menu > Settings retains Distance behind and Height above. Camera tuning adds side angle, downward aim angle, FOV, independent position/rotation response, orbit sensitivity, recenter delay, high-speed distance/FOV additions and an obstruction-avoidance toggle. Changes apply live and persist. Reset camera restores all defaults. Old `oceanbound.camera.v1` distance/height preferences migrate unchanged; use Reset camera to opt into the new distance and height if custom values were already saved.

`src/config/cameraConfig.js` centralizes these options plus vertical sensitivity, elevation limits, recenter rate, portrait distance cap, look-ahead, framing lift, speed ramp endpoints, floor lift, FOV response, collision radius/padding and terrain sample budget. Distances are world metres; angles are degrees except orbit input offsets (radians); response rates are per second. Settings validation clamps stored numbers and rejects non-finite or invalid types.

## Verification

53 tests pass, including existing gameplay, camera settings migration, 30/120 Hz exponential convergence, shortest recenter return, speed/aspect bounds, oriented collision entry and a terrain hill between otherwise clear endpoints. See `tests.log`. Production build and 39 local production-resource checks passed.

Actual rendered screenshots cover default/open water, reef passage, tight turn, near-floor travel, boost, Octopod obstruction, mobile landscape, mobile orbit and portrait. `tools/camera-preview.html` is a development-only harness that embeds the actual game, offers deterministic scenario starts, and resizes the viewport. It is not included in the production build. After a scenario start all travel/turning/orbit uses normal game controls. Ascending and descending were checked through Space and Shift; the observed depth changed smoothly from 26 to 20.2 to 26.1 m. Landscape checks used an 844 x 390 game viewport with working Forward and free-look; portrait used 375 x 667. Existing HUD safe-area CSS remains intact.

Desktop Chromium, 1280 x 720, DPR 1, low quality, stationary configured spawn:

| Metric | Previous camera | New defaults |
|---|---:|---:|
| Median / p95 frame ms | 7 / 7.1 | 7 / 7.1 |
| CPU update + submit median ms | 1.2 | 1.4 |
| GPU render median ms | 0.62 | 0.83 |
| Draw calls | 123 | 150 |
| Triangles | 620,246 | 1,017,697 |

Raw samples are `before-metrics.json` and `after-metrics.json`. The wider view exposes more existing scenery, so render totals differ; these are representative samples, not an isolated camera microbenchmark. FPS was refresh limited near 143. No steady frame-time regression was observed. Reef/mobile-sized passes also measured 7 / 7.1 ms; those are desktop measurements, not phone benchmarks.

The standalone game tab reported no warnings/errors. The embedded preview recorded an unattributed MutationObserver error during automation (also seen with the previous mobile harness); the application contains no MutationObserver and its source was not established. Gameplay continued, but no claim is made that the harness log is clean. Actual iPhone Safari frame pacing, thermal behaviour, notched safe areas and simultaneous multitouch remain unverified without a physical device.
