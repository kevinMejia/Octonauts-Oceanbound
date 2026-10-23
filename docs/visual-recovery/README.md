# Visual fidelity recovery

## Scope and comparison

This pass improves the actual Three.js render rather than adding gameplay. The earlier supplied artistic underwater concept was used as the target; the two new TARGET/CURRENT attachments described in the task were not delivered in this turn. No claim is made to have inspected a new iPhone screenshot or to match the concept exactly.

[Diagnosis before implementation](DIAGNOSIS.md) records the initial issues. The fixed opening comparison uses submarine (180,20,195), heading PI, the same 16.8 m / 6 m chase offsets and 65-degree FOV. The submarine spawn, camera, controller and input files were preserved. Compare [before](before-desktop.png) and [after](after-desktop.png); [mobile before](before-mobile.png) and [mobile after](after-mobile.png) use the same 844 x 390 game viewport. These are browser screenshots of the running game, not concept images or Blender renders.

## Visible changes

Terrain uses domain-warped coherent noise at broad, medium and dune scales throughout the world, replacing the primary repeating sine ridges. A roughly 240 m opening showcase around (180,205) blends smoothly into that global terrain. Shaped side banks and a sandy navigation valley give the opening a readable cross-section; height sampling, normals, scenery, collisions and sediment all use the same height function. The base remains on a flat 30 m radius footprint, with a smooth blend out to 70 m instead of the previous 34/90 m clearing. The change reduces the oversized empty bowl while keeping the 49.4 m wide base clear of terrain and scenery.

The old sand normal had approximately 40 cm corrugations at strength 0.8. Its replacement has warped, variable-strength ~7.5 cm ripples, band-limited fine grain, unstriped sand albedo and roughness variation. The tile is 2.4 world metres and 512 px. Normal strength is 0.4; explicit mipmap filtering, linear magnification and 4x anisotropy reduce oblique aliasing. The unfiltered per-fragment hash grain was removed. Color/normal/roughness together are smaller downloads than before.

The showcase contains 21 reusable foundation placements, roughly 1,256 total scenery records and 96 simple foundation proxies. This is one concentrated composition, not a new map-wide dense scatter. Foreground gardens, a coral-covered bank, low embedded shelves, mid-distance outcrops and taller distant buttresses frame the sandy route. Placement uses deterministic surface anchors and terrain height surveys; below-sand anchors are rejected and slope-side foundations are embedded. Legacy scatter inside the showcase is replaced, preventing double population. The original dense habitat remains explorable and also benefits from the global material, terrain and lighting updates. Outside the showcase, global coherent relief, sand, fog, reflections and lighting are updated; the whole world does not retain the original flat-looking material/terrain system.

Sunlight now reaches camera-facing surfaces; a balanced hemisphere and one tiny prefiltered environment lift dark rock faces and add cockpit/enamel highlights. Directional intensity is 3.5 and hemisphere 0.9. The 128 x 64 generated lighting environment is prefiltered once, shared by materials and never captured each frame. It is optional and skipped if the floating-point render-target extension is unavailable. The GUP-B geometry, animation and movement are unchanged; hull roughness and canopy reflection strength are tuned in its existing loader.

Fog density decreases from 0.0072 to 0.0054, retaining more middle-distance color and silhouettes. Existing depth attenuation remains. Caustics use the shared shader and 512 px texture, now with curved domain-warped cells, broken intensity and smaller world scale, instead of a sharp straight web. A faint background-dome shaft approximation remains inexpensive, including a reduced mobile version; it is not volumetric light between objects.

## Editable Blender source

- `assets/blender/showcase-rocks.blend`: three named collections and 15 individually editable limestone ledges/boulders.
- `assets/blender/scripts/create-showcase-rocks.py`: deterministic custom mesh generation, vertex crevice shading, coral surface anchors, GLB/metadata export and actual preview render.
- `assets/models/showcase-rocks.glb`: about 441 KB, three foundation modules plus reduced LODs, shared vertex-color palette and no new texture downloads.
- `assets/models/showcase-rocks.json`: anchors and bounded foundation ellipsoids.
- `blender-rock-library.png`: an actual Blender preview, deliberately separate from gameplay evidence.

The project was generated and reopened successfully in Blender 4.5.3 LTS. `blender-source-check.log` confirms the three collections, 15 meshes and vertex colors. Runtime export temporarily joins one reusable module at a time; editable source components remain separate. The existing branching, brain, tube, rounded coral, kelp, seaweed, grass and shells are reused from `underwater-environment.blend` and its retained generator rather than duplicated. Existing reef formation source files are preserved.

Regenerate with Blender's `--background --python assets/blender/scripts/create-showcase-rocks.py`. Generate the sand/caustic textures with a Python environment containing NumPy and Pillow using `tools/create_fidelity_sand.py`. Build the site with `python tools/build.py`.

## Visual iteration log

| Pass | Largest three differences observed | Response |
|---|---|---|
| Baseline | Weak relief; dominant diagonal sand stripes; tiny disconnected scenery around opening | Diagnose from source and actual fixed-camera render |
| `pass-1-terrain-sand.png` | Hills now readable but empty; rocks still dark; straight caustic web dominates | Author new foundations and clustered placement, then tune materials/light patterns |
| `pass-2-composition.png` | Slope-side platforms float; coral is too uniformly purple; middle distance is weak | Survey embed heights, decouple coral color variants and add taller composed landmarks |
| `pass-3-lighting.png` | Illumination too pale; valley too broad; foreground still sparse | Lower environment/sun fill, narrow banks and add low foreground gardens |
| `pass-4-refinement.png` / `pass-5-valley.png` | Overlarge base bowl; weak contact shade on mobile rocks; near/mid detail still unbalanced | Reduce local clearing, bake rock crevice color, improve foreground framing and cap distant small props |
| Final | Stylized geometry is simpler than the concept; distant relief remains gentler; lightweight light shafts are less rich | Retain efficient composition and readable navigation rather than adding costly volume/postprocessing or blanket density |

`game-approach.png`, `game-close.png` and `game-coral-detail.png` show actual driving from the normal chase camera, including a turn, descent, rising terrain, sediment and closer coral/rock surfaces. `mobile-driving.png` records the working Forward touch button. The opening camera and spawn were not moved to make the comparison look better; a development-only lower-view scenario exists for additional inspection.

## Performance and configuration

Instanced meshes, shared source geometry, palette reuse and existing spatial/culling systems remain in use. New foundation collisions use simplified ellipsoids through the existing resolver. No decorative mesh raycasts, additional gameplay entities or postprocessing passes were added. High quality keeps 1024 px local shadows. Mobile keeps the no-shadow path, baked/terrain contact shading and reduced meshes. Mobile terrain increases from 32 to 40 segments per 100 m chunk so the new slopes are not unnecessarily coarse; a 2.5 m sampling interval is still bounded.

`visualConfig.js` holds the showcase location/blend, sand world scale/normal strength, lighting and optional reflections. `environmentConfig.js` holds pixel ratios, chunk/detail budgets, coral and vegetation render distances. Mobile small coral is culled beyond 150 m and vegetation beyond 110 m while rock silhouettes remain to 220 m; high distances are 215/145/260 m. DPR caps remain 1.25 mobile and 1.75 high, with the existing sustained-slow-frame fallback down to 0.85. `waterConfig.js` controls fog and caustic intensity/scale/depth attenuation.

Matched performance samples and limitations are listed below. The old deployed commit `8c378cd` was restored into an ignored local test directory for the mobile baseline, because the first baseline telemetry was captured before resizing completed. The replacement samples verify identical viewport, DPR, spawn, heading and camera state. Raw JSON files retain the full data. Initial exploratory timing windows with resize/background gaps were superseded; they are not treated as benchmarks.

Actual iPhone Safari hardware, thermal behaviour and GPU memory were unavailable. Desktop Chromium at mobile dimensions is a layout/rendering check, not a phone performance measurement. No claim of achieved 60 FPS on iPhone is made. The final scene remains more stylized and less richly shaded than the artistic target; screenshots demonstrate a substantial environmental improvement, not an exact reproduction.

## Validation

59 tests pass, including existing controls/turbo/camera/sediment regressions plus showcase determinism, buried foundation roots, coral anchor validity, an unobstructed central hull passage, continuous terrain transition and rock LOD/source budgets. Production build validates GLB headers and all 45 production resource checks pass locally. The final standalone game reports no browser warnings/errors. Embedded harnesses have previously emitted an unattributed automation MutationObserver error; the application itself contains no MutationObserver. The physical-device limitation above remains.

### Matched desktop-browser samples

October 23, 2026, Chromium in-app browser, DPR 1. High samples are 1280 x 720; low samples use the exact 844 x 390 game viewport. Same configured spawn/camera, stationary after loading.

| Sample | median / p95 frame ms | CPU update+submit ms | GPU ms | Draw calls | Triangles | Visible geometry MiB |
|---|---:|---:|---:|---:|---:|---:|
| Before high | 7 / 7.1 | 1.5 | 4.15 | 165 | 1,572,908 | 19.34 |
| After high | 7 / 7 | 1.6 | 1.7 | 178 | 2,372,047 | 20.5 |
| Before low / 844 x 390 | 7 / 7.1 | 1 | 3.83 | 160 | 1,101,470 | 15.31 |
| After low / 844 x 390 | 7 / 7.1 | 1.2 | 4.49 | 164 | 1,900,458 | 16.66 |

FPS is refresh limited near 143 in these samples. GPU query times vary with clock state and scheduling; the high-quality timing decrease is **not** evidence of a GPU speedup. Low-quality GPU cost increased by about 0.66 ms in this sample, with CPU increasing 0.2 ms. More scenery is actually rendered, so triangle counts increase; the extra geometry is shared/instanced rather than many new objects or textures. Texture counts increase by one for the shared generated environment. Reported geometry is visible buffer storage, not total VRAM; heap samples depend on GC. Earlier exploratory windows with multiple previews/resizing had p95 around 14 ms, so the stable results are not a universal frame-time guarantee. Physical iPhone results remain unknown.

## Live deployment

GitHub Pages deployment for `bb26d5a` completed successfully. All 45 public production resources passed HTTP/content checks. `live-opening.png` is the actual deployed Three.js scene at the same comparison spawn and camera, with no browser warnings/errors reported during that check. Local test assets and the baseline reconstruction are not part of the deployed site.
