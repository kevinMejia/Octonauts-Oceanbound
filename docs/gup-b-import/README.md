# Full-resolution GUP-B import

Keeks_Q's downloaded GUP-B replaces the playable vehicle by default, following the user's instruction to publish the model. Original downloads are preserved locally. The production GLB embeds all runtime textures; no external texture archive is needed to play.

- Runtime: `assets/models/gup-b-high.glb` (20,378,704 bytes).
- Editable derivative: `assets/blender/gup-b-high.blend`, with packed image textures.
- Original game vehicle remains selectable with `?gup=original`.
- Geometry: **221,592 triangles**, exactly matching the visible evaluated source. No decimation, remeshing or increased subdivision levels. The source's already-disabled bolt modifiers remain disabled rather than increasing geometry beyond its authored viewport.
- 29 source meshes / 39 material primitives; 26 used materials; 11 embedded textures.
- Original source forward +Y / up +Z converted to runtime forward +Z / up +Y, uniformly scaled to the existing vehicle length. Actual Three.js bounds: 2.9832 × 1.8383 × 5.5839 m; old model: 4 × 2.56 × 5.597 m. The existing conservative collision envelope, terrain clearance, camera composition, controller and physics remain unchanged.
- No separate propeller exists. The shark tail is preserved and not rotated. Motor audio, bubble audio and visual bubble effects retain their existing controller signals.

## Materials

Five packed image textures had broken external references; extracted archive images resolved them. Blender-specific decal color ramps were converted at their original image resolutions. Procedural/generated-coordinate details were baked onto additional 1024px UV textures without changing topology. The radar movie is represented by a baked still image because GLB does not embed video playback. The original movie remains in the local download.

The supplied canopy combines Principled glass with view-dependent transparency. The GLB carries its PBR properties plus an extra marking; Oceanbound recreates its facing-dependent alpha with a material adapter. Imported materials do not receive the old vehicle's material overrides. A standalone GLB viewer sees a constant-alpha approximation. Cycles and Three.js lighting are not pixel-identical.

Images: three 1440², four 2560² and four 1024². Estimated RGBA8 storage with full mip chains: **186.3 MiB**, excluding geometry, render targets and driver overhead. No source decal downscaling or transmission removal was performed.

## Verification

Actual Blender 4.5.3 Cycles renders were generated and visually inspected from front, rear, left, right, front three-quarter and rear three-quarter angles. They are the `prepared-*.png` files in this folder. The actual exported GLB was inspected in the ocean; `game-side.png` shows the close-up. Close-up camera preferences were restored to their previous 16.8 m / 6 m values afterward. The original supplied Blender file's SHA-256 was unchanged.

Existing movement, camera/recenter, collision, touch and audio tests remain passing. All 88 tests and production build pass. Physical iPhone Safari, handset memory/thermal behavior and audible sound quality were not verified.

## Measured performance

Desktop Chromium, GTX 1080 Ti through ANGLE/D3D11. Same complete ocean/Octopod scene and starting camera. Desktop is 1152 × 648, high profile, DPR 1; mobile-size is 375 × 667, low profile, DPR 1 **on the same desktop GPU**. Each sample used 3 s warmup and 12 s capture; adaptive DPR was disabled only by the explicit benchmark query. Raw JSON and summaries are alongside this document.

| Measurement | Original desktop | Imported desktop | Original mobile-size | Imported mobile-size |
|---|---:|---:|---:|---:|
| Mean reporting-window FPS | 143.8 | 143.8 | 143.7 | 143.7 |
| Highest reported p95 frame time | 7.1 ms | 7.1 ms | 7.1 ms | 7.1 ms |
| Median CPU submission | 1.9 ms | 3.8 ms | 1.3 ms | 2.7 ms |
| Median GPU window | 5.53 ms | 5.50 ms | 3.72 ms | 6.18 ms |
| Whole-scene calls, all passes | 183 | 314 | 124 | 196 |
| Whole-scene triangles, all passes | 2,748,166 | 5,693,272 | 701,828 | 1,601,360 |
| Model load/decode | 54.1 ms | 341.6 ms | 45.9 ms | 341.7 ms |

The ~144 FPS ceiling masks workload changes. Transmission adds a scene-render pass, so scene triangle submissions do not equal unique model geometry. Texture memory and transmission are prospective mobile concerns; these measurements did not justify reducing the geometry. A separate forward/turn/ascent run averaged 143.7 FPS with p95 at most 7.1 ms as the view changed.

Load samples used localhost and mixed cache states, not comparable cold internet downloads. The imported first desktop sample fetched ~20.4 MB in ~76.7 ms and completed load/decode in 341.6 ms; the original was cached. Full-scene readiness and initial shader-compilation jank were not separately quantified. These short measurements are not sustained thermal tests or iPhone performance claims.
