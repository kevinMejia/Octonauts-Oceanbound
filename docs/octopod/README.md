# Octopod headquarters and navigation

The existing game now loads an original-series-inspired Octopod exterior from an authored Blender GLB. This expands the current terrain, reefs, GUP-B, input, camera, fog and environmental effects rather than replacing them. The closed exterior is explorable around and underneath; there is no interior mission or docking gameplay.

## Source and visual verification

Editable source: `assets/blender/octopod/octopod.blend`; generator: `assets/blender/octopod/scripts/create-octopod.py`. It reopens successfully in Blender 4.2 and retains 184 separately named exterior components in seven meaningful collections, plus an imported native-scale GUP-B reference and clearly named non-exported preview aids. Runtime export temporarily merges opaque duplicates by palette; it does not merge editable source meshes. Five glazed domes remain independent for transparent sorting. There are seven shared materials, 11 runtime meshes, about 92,148 triangles, no texture downloads and no additional runtime lights. GLB size is about 2.3 MB.

[Reference notes and primary links](../../assets/blender/octopod/REFERENCE-NOTES.md) explain the official Disney Junior card, production-studio imagery and secondary licensed assembly views that were inspected. The model follows the central orange bowl, broad glazed bridge, shallow orange caps, four rooms at staggered heights, ribbed arms, circular windows and curled support silhouette. Room furnishings and some details are simplified interpretations. Native measurements were unavailable; the approximately 49.4 m span is a game-scale estimate, about 8.83 existing GUP-B lengths (GUP-B length 5.597 m). It is not an exact canonical replica or scale claim.

Actual Blender previews: `blender-front.png`, `blender-rear.png`, `blender-side.png`, `blender-top.png`, `blender-three-quarter.png` and `blender-scale-comparison.png`. Actual game screenshots are separately named `game-*.png` and `compass-west.png`. No AI-generated visuals were used. Inspection led to wider terrain blending, better phone framing, brighter material fill, corrected porthole embedding and removal of station self-shadow artifacts. The station still casts shadows onto the seabed in high quality; self-shadow reception is disabled on its meshes to avoid shadow-map striping. Existing world lighting/fog settings are unchanged.

## Placement and collision

The base is fixed at world (180, 0, 100), away from the demonstration reef. Only its 34 m radius footprint is leveled; a smooth 34–90 m transition blends back to the unchanged terrain function. Procedural scenery is excluded within a 39 m radius plus each decoration's footprint margin. Sandy materials/ripples remain the same. Low supports contribute to the existing terrain occlusion texture.

The GUP-B starts at (180, 20, 195), 95 m south of the hub, facing north. Its model and controller equations are unchanged. Exported ellipsoid proxies cover the hub, pods, arms and supports. Collisions reuse the existing hull expansion, then enforce terrain clearance and resolve overlapping supports horizontally if necessary, so the submarine cannot be pushed below the sand. A cheap 36 m scaled broad-phase skips all base collision work farther away. The detailed mesh is never raycast for physics.

## Compass and configuration

`src/config/octopodConfig.js` centralizes enabled, world position, scale, footprint/blend/scenery radii, collision switch, navigation marker switch, explicit spawn position/heading, compass enabled/size, cardinal visibility, marker/distance visibility and smoothing rate. Distances are in game metres. Keep the current scale unless also reviewing surface clearance and spawn placement; changing base position requires updating its explicit spawn settings too.

World north is −Z, east +X, south +Z, west −X. GUP-B's authored forward axis is local +Z. The compass obtains the vehicle's actual world quaternion, transforms +Z and projects it onto X/Z before `atan2(x, -z)`. Camera transform and physical-device sensors are never used. The circular dial interpolates the shortest angular path with an exponential response of 18/s; labels remain upright. The small gold house marker shows relative bearing to the actual base centre; its distance is horizontal game-world metres. It is distinct from the green north label and fixed white heading index. It continues updating while moving vertically or orbiting the camera. No location or orientation permissions are requested.

The widget tracks the depth card's measured bottom/right edges via ResizeObserver and window resize. This inherits the existing safe-area positioning and prevents overlaps as the depth card changes size. It is normally 86 CSS px, 68 px on short landscape screens. The surrounding HUD was not redesigned. `tools/mobile-preview.html` renders the actual game in a 375 × 667 iframe with existing touch controls enabled for layout inspection; this is a responsive-layout harness, not iPhone Safari emulation or a device performance benchmark.

## Tests and remaining limits

38 tests cover existing controls/camera/turbo/environmental effects and new cardinal headings, wrap-safe angle interpolation, relative bearings, vertical/camera independence, local clearing, scenery exclusion, external spawn, asset budgets and terrain-safe support collisions. Browser checks confirmed north remained unchanged during camera orbit and ascent, west appeared after turning, the base marker moved to the appropriate side, and the submarine could approach, collide with the hub and travel alongside it. The source Blender file reopened with its editable collections and GUP-B reference intact. Actual iPhone Safari performance, thermal behavior and physical-device multitouch remain unmeasured.

## Performance

Measured after Blender finished, desktop Chromium in-app browser, 1280 × 720, DPR 1, stationary at the same configured spawn and camera. `?inspect=1&base=off` hides only the model for a matched rendering comparison; placement, terrain, scenery clearing, compass and collision data remain identical. Normal play always shows the enabled base. Raw measurements are retained in `performance-*.json`.

| Profile / model | median / p95 frame ms | median FPS | CPU submit ms | GPU render ms | calls | triangles | active meshes |
|---|---:|---:|---:|---:|---:|---:|---:|
| High / hidden | 7 / 7 | 142.9 | 1.6 | 1.05 | 117 | 1,055,072 | 182 |
| High / shown | 7 / 7 | 142.9 | 1.6 | 1.04 | 129 | 1,147,552 | 193 |
| Low / hidden | 13.8 / 14 | 72.5 | 1.5 | 0.51 | 113 | 528,430 | 168 |
| Low / shown | 13.8 / 14 | 72.5 | 1.5 | 0.54 | 123 | 620,246 | 179 |

The small GPU-time difference is within normal timing variation, not evidence of a speedup. High and low sessions had different browser scheduling conditions; compare shown versus hidden within a profile, not the absolute FPS across profiles. These spot checks showed no significant frame-time regression, but are refresh/scheduling limited and do not establish phone performance or sustained thermal headroom. CPU submit includes all game and renderer work, not total browser CPU. GPU uses asynchronous disjoint queries. The base adds at most 11 main-render calls plus six opaque shadow batches when visible in the shadow camera; frustum culling reduces that in these samples. Its collision broad-phase and compass add no render passes.

Visible geometry buffers rose 8.17 → 10.37 MiB high and 5.03 → 7.23 MiB low. Texture counts stayed at 9 and 8 respectively. JS heap snapshots were 107.23 / 121.37 MiB high and 68.30 / 63.60 MiB low, affected by GC and shared browser work; they are not reliable asset memory deltas or full VRAM measurements. The responsive phone-size screenshot verifies layout only. Actual iPhone Safari testing remains required.
