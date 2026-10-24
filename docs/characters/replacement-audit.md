# Imported character replacement audit

Eight existing crew entities now use the supplied models. Frown Fish has no existing character identifier and is exported for future use only. No new entity was registered. Original Blender files and companion textures remain in `assets/models/characters/new models/`.

## Model audit

Source counts below use evaluated meshes in the active Blender view layer, excluding the source’s excluded diving/accessory collections. Sizes are exact `.blend` bytes, excluding companion PNGs. Triangle counts are measured, not estimated. All sources are Blender Z-up with +Y facing front; glTF conversion produces Y-up with -Z facing front. Each existing character has a configured Y rotation of π, independent scale and offset.

| Character | Format / bytes | Source triangles → runtime | Source valid texture images | Actions | Optimization | Runtime path |
|---|---:|---:|---:|---|---|---|
| Barnacles | BLEND / 14,490,260 | 87,406 → 37,606 | 2 | 3 pose/clip exports | Subdivision, texture cap, rigid-part consolidation | `assets/models/characters/imported/barnacles.glb` |
| Dashi | BLEND / 13,857,104 | 90,844 → 46,940 | 2 | 2 pose/clip exports | Subdivision, texture cap, rigid-part consolidation | `assets/models/characters/imported/dashi.glb` |
| Frown Fish | BLEND / 8,351,963 | 41,056 → 20,176 | 1 | 2 pose/clip exports | Subdivision, texture cap, rigid-part consolidation | `assets/models/characters/imported/frown-fish.glb` |
| Inkling | BLEND / 5,578,452 | 62,304 → 20,768 | 0 | 6 pose/clip exports | Subdivision, texture cap, rigid-part consolidation | `assets/models/characters/imported/inkling.glb` |
| Kwazii | BLEND / 8,541,980 | 89,150 → 39,950 | 1 | 2 pose/clip exports | Subdivision, texture cap, rigid-part consolidation | `assets/models/characters/imported/kwazii.glb` |
| peso | BLEND / 12,778,532 | 54,980 → 28,116 | 2 | 2 pose/clip exports | Subdivision, texture cap, rigid-part consolidation | `assets/models/characters/imported/peso.glb` |
| Shellington | BLEND / 13,592,852 | 89,886 → 40,406 | 2 | 2 pose/clip exports | Subdivision, texture cap, rigid-part consolidation | `assets/models/characters/imported/shellington.glb` |
| Tunip | BLEND / 3,181,161 | 23,952 → 9,228 | 0 | 2 pose/clip exports | Subdivision, texture cap, rigid-part consolidation | `assets/models/characters/imported/tunip.glb` |
| tweak | BLEND / 9,867,938 | 114,892 → 42,628 | 1 | 2 pose/clip exports | Subdivision, texture cap, rigid-part consolidation | `assets/models/characters/imported/tweak.glb` |

## Geometry, materials, textures and rigs

Source bounds are evaluated X × Y × Z in Blender units; Z is height. Source vertices count evaluated mesh vertices; GLB vertices count exported primitive attribute entries, including UV/normal splits. Source material counts below count materials assigned to visible mesh slots. JSON also retains all file-level materials and actions.

| Character | Source vertices / meshes / assigned materials | Source bounds X × Y × Z | Runtime vertices / meshes / primitives / materials | GLB image sizes | Skins |
|---|---|---|---|---|---|
| Barnacles | 44,135 / 32 / 14 | 0.458373 × 0.372312 × 0.734850 | 23,192 / 21 / 34 / 14 | Image: 1², Compass: 1024², OctoBlue: 1024² | 1 |
| Dashi | 46,151 / 44 / 26 | 0.529500 × 0.378901 × 0.745088 | 28,097 / 30 / 49 / 26 | Image: 1², OctoBlue: 1024² | 2 |
| Frown Fish | 21,449 / 24 / 18 | 0.602252 × 0.602320 × 0.810643 | 11,935 / 14 / 27 / 18 | OctoBlue: 1024² | 1 |
| Inkling | 31,485 / 18 / 14 | 0.701150 × 0.671553 × 0.871679 | 11,592 / 11 / 18 / 14 | Image: 1² | 1 |
| Kwazii | 45,234 / 29 / 12 | 0.445009 × 0.420281 × 0.744797 | 23,629 / 23 / 30 / 12 | Image: 1², OctoBlue: 1024² | 1 |
| peso | 27,720 / 23 / 12 | 0.401694 × 0.370250 × 0.619318 | 17,315 / 20 / 23 / 12 | Image: 1², OctoBlue: 1024², OctoPlaster: 1024² | 2 |
| Shellington | 45,348 / 30 / 15 | 0.421212 × 0.376236 × 0.753544 | 22,778 / 23 / 28 / 14 | Image: 1², OctoBlue: 1024² | 2 |
| Tunip | 12,489 / 12 / 9 | 0.294702 × 0.228753 × 0.517849 | 6,414 / 10 / 13 / 9 | Image: 1² | 1 |
| tweak | 57,857 / 31 / 15 | 0.422058 × 0.376433 × 0.853643 | 25,017 / 23 / 30 / 15 | Image: 1², OctoBlue: 1024² | 1 |

All valid source images are packed 2560 × 2560 PNGs. Supplied external PNG copies remain beside the sources; the Blender packed images were used, so broken original author paths do not affect those textures. Several files also reference an unavailable `Fabric_Burlap_004_Normal.jpg` with zero dimensions; it was not supplied. The exporter produces neutral 1 × 1 images where applicable. Missing fabric detail cannot be restored from the supplied files. All runtime image bytes are embedded; no runtime texture requests depend on original filesystem paths.

The per-file texture declarations, rig names, modifier lists, action names, source bounds and original SHA-256 hashes are in [source-audit.json](source-audit.json). Final primitive counts, image dimensions, embedded image byte sizes, skins and clip durations are in [runtime-audit.json](runtime-audit.json).

## Conversion and visual behavior

- Used the existing Blender → GLB / GLTFLoader architecture, without new dependencies or Draco requirements. All originals remain read-only.
- Capped authoring subdivision at one, retaining smooth shading, skin weights and skeletons. Consolidated only compatible rigid parts sharing a parent/bone binding; animated objects, constrained objects, shape-key objects and armature-modified meshes are kept separate.
- Capped packed color/decal images at 1024². Original PNGs remain 2560². This reduces decoded pixel storage by 84% per resized image before sharing.
- Routed offline Light Path shader switches to their visible Principled shader, as in the existing vehicle preparation pipeline. Preserved UVs, base colors, roughness, metallic and available maps. Helmet glass uses two-sided alpha at 0.25 rather than a costly full-scene transmission pass; this is an approximation of the offline shader.
- Enabled opaque backface culling and moved thin shrinkwrapped solidify shells outward to remove face/decal overlap observed in browser previews. No light, world-scale or camera configuration changed.
- Shared embedded PNG sources by SHA-256 within the crew loader. Each asset is requested once in startup validation; separate materials retain their own sampler and UV settings. Shared resources remain alive for the existing crew lifetime, including discovery, towing and home reparenting. No replacement/rebuild occurs during those transitions.
- Failed replacement loads fall back to the original GLB with its original transform and idle. This path was tested by aborting the Barnacles replacement request.

## Poses and animation

The source actions are predominantly single-frame poses, despite names such as Idle or Wave. Source keyframe ranges are recorded explicitly in the audit. Barnacles’ `Hear hands` spans frames 0–1; empty Frown Fish actions contain no keys. There are no newly authored animation systems. Single-frame poses receive a one-frame GLB export interval so named poses are retained rather than discarded. Every nonempty source crew action is verified present in its GLB by an automated test. Existing mixers select the named idle where available; Inkling retains its static authored pose instead of automatically looping a gesture. Entity movement, rescue motion and towing remain controlled by the existing game systems.

## Gameplay compatibility

The previous implementation measured collision and placement dimensions from each visual. The replacement now pins the eight legacy envelopes measured in [gameplay-bounds.json](gameplay-bounds.json), so different replacement proportions cannot alter spawn resolution, discovery centers, collision proxies, rope heights or towing clearance. Visual transforms live under the same gameplay roots. Registry IDs, messages, home slots, discovery anchors, save keys and gameplay callbacks were preserved. RescueSystem, TowMotion, vehicle movement/speeds, marine behavior, compass implementation and UI code were not edited.

## Validation

- `node --test tests/*.test.js`: 200 passed, including legacy fallback asset rig checks and new imported rig/action/budget checks.
- `python tools/build.py`: passed GLB header/length checks and module/asset versioning. Source models are excluded from the production copy; nested runtime GLBs are included in the build hash.
- `tests/crew-replacement-browser.cjs`: eight imported visuals confirmed, exact legacy gameplay envelopes and resolved spawn heights retained, one model request per character, no browser errors, and missing-asset fallback passed.
- Real production `dist` served locally: eight imported crew loaded from versioned nested asset URLs with no failed requests or page errors. GitHub Pages subpath resolution is also covered by the URL unit test; no remote deployment was performed.
- `tests/rescue-browser.cjs`: discovery, portrait, towing, moving rope endpoints, obstacle passage, all eight GUP switches, delivery and saved rescue state passed.
- `tests/rescue-mobile-browser.cjs`: touch-forward escort, moving passenger, connected rope, mobile HUD and unfinished progression passed in desktop Edge mobile emulation.
- Compass and marine-animal browser regressions passed: markers, persistence, responsive layouts, animal discovery/models/movement and reload behavior.
- Actual underwater lighting screenshot was inspected in [crew-underwater.png](crew-underwater.png). A separate nine-model front/rear preview was also inspected during export refinement. Final gameplay captures validate the selected authored idle poses.
- There is no lint script in package.json. Physical iOS/Android browsers and long-duration GPU-memory profiling were not tested.

## Performance

The benchmark renders all eight crew in the same isolated 1280 × 800 scene in desktop headless Edge. It uses ten warm-up submissions and sixty measured submissions. CPU submission times measure JavaScript/WebGL submission, not GPU completion or game FPS. Repeated runs varied with host contention; these are the final recorded values, not a mobile guarantee.

| Metric | Legacy | Imported |
|---|---:|---:|
| Draw calls | 8.000 | 227.000 |
| Rendered triangles | 121324.000 | 266794.000 |
| Resident geometry buffers | 8.000 | 225.000 |
| Resident GPU textures | 8.000 | 21.000 |
| Median CPU submission (ms) | 0.200 | 3.800 |
| p95 CPU submission (ms) | 0.300 | 4.800 |

The imported crew have a material/draw-call cost substantially above the simple placeholders. Subdivision and texture reductions make them usable in the tested desktop scene, but a claim of no frame-rate regression or confirmed mobile performance would be unsupported. The existing per-character render-distance culling remains unchanged. Physical mobile profiling, particularly with all eight crew together at the Octopod, remains the main performance follow-up. Raw measurements: [performance.json](performance.json).

## Rebuild

From the repository root, use Blender 5.0 with `--background --factory-startup --disable-autoexec --python tools/blender/audit_crew.py`, then the same flags with `tools/blender/prepare_crew.py`. The conversion accepts optional normalized IDs after `--`, for example `-- peso dashi`. Generated GLBs are separate from the sources and published by atomic replacement with a short retry for transient Windows file locks. Run `python tools/audit_crew_glb.py`, the Node tests, browser regressions and production build after regeneration. Update measured visual transforms when changing source dimensions; keep legacy gameplay envelopes stable.
