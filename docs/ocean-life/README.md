# A more populated ocean

Replaced the single localized school with deterministic authored and cell-based schools across the explorable world. The fixed pool selects nearby groups with a preference for the view ahead: eight groups of 16 fish on high, six groups of 10 on low. Fish use one shared instanced draw with varied proportions and colors. Additional shared ray and jellyfish batches add independent slower movement, capped at eight/four combined visitors. Animals keep world-space paths rather than following the vehicle. Selection refreshes every 0.6 seconds; distant metadata is discarded. Cached school-level terrain/rock samples replace individual fish rock queries.

Existing kelp and seaweed geometry now forms taller groups around reef formations and sparse deterministic meadows elsewhere. Existing vegetation shader sway is clearer. Reef bubbles come from authored openings and separated rock clusters, selecting only the nearest eight/five vents. They share the propulsion bubble pool, capped at 240/128, and have stronger soft highlights. The engine still emits according to actual movement; hovering does not create a propulsion stream. Existing ambient particles, caustics, controls, camera, terrain and sediment remain in place.

## Tuning

- `src/config/marineLifeConfig.js`: group sizes, total fish budget, active school slots, cell spacing, render distances, authored anchors, visitor caps, height and movement.
- `src/config/waterConfig.js`: shared bubble budgets, reef vent emission/range and propulsion appearance.
- `src/environment/marineLayout.js`: deterministic school cells and sparse kelp meadows; excludes the headquarters clearing.
- Existing decoration chunks retain distance/frustum culling. No new material family is needed for kelp. Fish, rays and jellyfish add three shared batches total, versus the prior one fish batch. No per-animal physics or independent mesh objects.

## Measurements and verification

Sequential local Chromium checks, same normal spawn, 1280x720, DPR 1, high quality. Baseline runtime restored from commit `7f82eed`. Other task test scenes were closed. These are short samples, not a guarantee for all devices. GPU timers and JS heaps vary with scheduling/collection.

| Metric | Previous single-school scene | Expanded scene |
|---|---:|---:|
| Median / p95 frame time | 7 / 7 ms | 7 / 7 ms |
| Median FPS | 142.9 | 142.9 |
| CPU submission median | 1.7 ms | 1.9 ms |
| GPU timer median | 5.26 ms | 4.84 ms |
| Draw calls | 180 | 182 |
| Triangles | 2,381,355 | 2,455,915 |
| Active meshes | 226 | 228 |
| Geometry buffers | 20.52 MiB | 20.55 MiB |
| JS heap snapshot | 107.84 MiB | 118.03 MiB |

The added triangle cost is about 3.1%; GPU timing variation does not establish a speedup. Actual iPhone Safari is unavailable here. An 844x390 low-quality browser viewport was verified with touch HUD visible. A separate distant-ocean scenario at x450/z435 confirmed six groups/60 fish, two rays and two jellyfish, kelp and a propulsion trail outside the opening region. Its recorded median was 7 ms, 136 draws and 401,269 triangles on this desktop browser; this is not an iPhone benchmark.

Actual screenshots: `before.png`, `after.png`, `mobile.png`, `distant-ocean.png`. The distant-before-refinement image records why nearest-only school selection was replaced with view-prioritized selection. Broad sandy gaps remain intentional; life is clustered rather than uniformly covering every view. Mobile and distant screenshots include the test harness around the running game. Raw metrics are alongside these files.

Validation: 64 tests pass, production build passes, all 50 production HTTP resources return valid content, and the standalone final game reports no browser warnings/errors during the check. Tests cover deterministic coverage and kelp grounding as well as existing controls, camera, effects, turbo and world systems.
