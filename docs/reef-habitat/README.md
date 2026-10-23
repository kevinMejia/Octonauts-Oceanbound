# Demonstration reef habitat

One bounded reef valley near the starting submarine replaces scattered scenery only inside x=-55..58, z=-18..137. The rest of the world retains its existing scenery. Four complete reusable formations create connected banks, a large outcrop, ledges, coral gardens and low transition patches along a winding sandy passage. Terrain generation, camera, lighting and input remain unchanged.

## Assets and rendering

`assets/blender/reef-formations.blend` contains editable linked parts reused from the original underwater environment library. Run `assets/blender/scripts/create-reef-formations.py` with Blender 4.2 to rebuild it, the four GLBs, collision manifest and preview renders. Coral roots are raycast onto exposed foundation surfaces. Existing branching-coral low meshes preserve their silhouettes; denser parts are simplified. Each GLB has three palette layers and reduced LODs, compressed with Draco. Combined download is about 5.5 MB. Local decoder and license are in `vendor/draco`.

The runtime shares three palette materials and rock textures. Instances are grouped by formation, layer and LOD: at most 24 batches in high quality, 12 in low. Each formation is independently distance/frustum culled before insertion into a batch. Only nearby high-quality formations use detailed geometry. Vegetation has small root-weighted shader movement. Simplified ellipsoids constrain the submarine against foundation rocks; decorative corals have no physics meshes.

`src/config/habitatConfig.js` controls density, scale, spacing, render distance and detail distance. Seeded variation stays within authored passage banks. Placement samples the existing terrain over each footprint to embed the foundation. Density changes transition patches only. To expand later, add bounded habitat regions with their own authored passage layouts and spatial collision lists; reuse these four modules/materials. Do not apply a map-wide scatter loop. Revalidate passage clearance after scale/spacing changes.

## Measured comparison

October 22, 2026, desktop Chromium in-app browser, 1280x720, DPR 1, default chase camera at spawn. Baseline was recorded before implementation and repeated with the final instrumentation using `?inspect=1&habitat=off`; ordinary play always enables the habitat. Final samples were taken after Blender finished and shader compilation settled. Raw JSON files accompany this report.

| Metric | Original high | Reef high | Original low | Reef low |
|---|---:|---:|---:|---:|
| Median FPS | 142.9 | 142.9 | 142.9 | 142.9 |
| Median / p95 frame ms | 7 / 7.1 | 7 / 7.1 | 7 / 7.1 | 7 / 7.1 |
| CPU submission median ms | 1.2 | 1.5 | 0.9 | 1.0 |
| GPU render median ms | 1.05 | 1.41 | 1.07 | 1.26 |
| Draw calls | 141 | 135 | 116 | 125 |
| Triangles | 1,381,114 | 2,502,386 | 956,622 | 1,909,966 |
| Active meshes | 201 | 195 | 170 | 179 |
| Geometry buffers MiB | 9.81 | 27.87 | 5.14 | 17.49 |
| Textures | 9 | 9 | 8 | 8 |
| JS heap MiB | 72.65 | 124.20 | 75.43 | 73.48 |

GPU measurements use asynchronous disjoint timer queries when supported. CPU submission includes game update and renderer submission, not total browser CPU usage. Geometry memory estimates count visible unique attribute/index buffers, not full VRAM. JS heap is a browser snapshot affected by GC and decoder workers; it is not a stable per-asset allocation measurement. Refresh-rate-limited FPS does not prove equivalent headroom: geometry and GPU work increased. Near the main structure a spot check reached 2.72M triangles, 131 calls and 1.47 ms GPU. No significant desktop frame-time regression was observed. Actual iPhone Safari FPS, thermal behavior and multitouch remain unmeasured; low quality is the practical fallback and should be tested on the target phone before expansion.

## Visual and gameplay verification

Actual game captures: `baseline-chase.png`, `first-composition.png`, `final-entrance.png`, `final-interior.png`, `final-close.png`, `final-wide.png`. Blender previews are separately named `blender-*.png`. Iteration replaced tidy rows with staggered angles/bends, moved the main outcrop nearer the route, added coral to rock faces, and corrected simplified branch tips. Screenshots show cohesive colonies and connected foundations while preserving sand and visibility. The result remains stylized and more open than the cinematic reference; it is not a match to its photorealistic atmosphere.

Keyboard driving through the passage, ascent and camera orbit were exercised in the browser with no console errors. All 24 automated tests pass, including deterministic layout, low/cruise-depth route clearance, simplified rock collision, compressed GLB architecture and existing movement/touch/turbo regressions. Static HTTP validation checks 23 production resources. No new gameplay features or menus were added.
