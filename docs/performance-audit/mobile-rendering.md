# Mobile rendering experiment: jellyfish batching and glass preview

## Result

Jellyfish opaque tentacles now use two instanced batches per animal instead of seven separate draws. The six-animal encounter drops from **108 to 48 submissions** when physical glass is visible (main plus transmission passes). Bells, individual tentacle rotations, encounter movement, discovery points and shadows are unchanged. Batching is enabled by default, with an original-rendering comparison available.

The mobile-glass alternative is **opt-in**. It removes physical transmission while retaining the original tint, roughness, environment reflections and authored facing-alpha shader. Reduced alpha makes the non-refracting approximation less visually heavy. Refraction is not reproduced exactly, so physical glass remains the default on desktop and mobile.

This is a measured rendering-work reduction, not a promised iPhone FPS result. Both profiles were tested in Edge on the desktop GTX 1080 Ti/ANGLE setup used by Phase 2, not an actual iPhone/Safari GPU.

## How to compare

Append these parameters to the game's normal URL:

- Normal game: `?glass=original` — batched jellyfish, original physical glass.
- Glass experiment: `?glass=mobile` — batched jellyfish, non-refracting glass preview.
- Original jellyfish comparison: `?glass=original&tentacles=original`.
- Explicit batching: `?tentacles=batched`.

These are reload-based, explicit comparisons. They do not change saved graphics settings, progress, physics or controls. Defaults live in `visualConfig.mobileGlass` and `visualConfig.marine`. No resolution, texture budget, environment density, light, shadow or particle quality setting was reduced.

## Measurement procedure

The starting source revision is recorded in `mobile-rendering-data/baseline-revision.txt` (`714f107`, the tested Phase 2 tree published as `e1c2c12`). The existing eight-scenario probe was captured for original source and default batching on both profiles. Baseline modules can be loaded through local Playwright routing without reverting working files.

`tools/mobile-rendering-audit.cjs` adds a focused view with all six jellyfish visible. It alternates three modes in rotated order across three repetitions, warming each mode for 30 frames and measuring 60 frames. Existing renderer/WebGL probes count real main, transmission and shadow submissions. The CPU measurement includes jellyfish animation updates, instance writes/bounds work, render submission and probe overhead; other scene simulation is held at a fixed pose. GPU timer query medians are recorded per repetition. These are focused instrumented render timings, not complete-game presented frame times.

### Focused draw submissions per rendered frame

| Profile / mode | Main | Transmission capture | Shadows | Total | Jellyfish portion |
|---|---:|---:|---:|---:|---:|
| Desktop original | 401 | 340 | 16 | 757 | 108 |
| Desktop batching | 371 | 310 | 16 | 697 | 48 |
| Desktop batching + glass preview | 371 | 0 | 16 | 387 | 36 |
| Portrait mobile original | 177 | 119 | 0 | 296 | 108 |
| Portrait mobile batching | 147 | 89 | 0 | 236 | 48 |
| Portrait mobile batching + glass preview | 147 | 0 | 0 | 147 | 36 |

Default batching saves **60 draws** when this group is visible: 55.6% of jellyfish submissions, 20.3% of the sampled portrait scene and 7.9% of the desktop scene. The glass preview additionally avoids capturing the opaque scene for transmission. Its benefit depends on whether a transmissive vehicle material is visible and on scene complexity.

### Three-repeat instrumented timing

Mean CPU time includes animation + render submission; parentheses show the range of repeat means. GPU columns show the range of repeat medians.

| Profile / mode | CPU mean ms (repeat range) | GPU median range ms |
|---|---:|---:|
| Desktop original | 6.869 (6.650–7.287) | 5.161–5.256 |
| Desktop batching | 6.660 (6.630–6.703) | 5.131–5.240 |
| Desktop batching + glass preview | 4.097 (4.088–4.108) | 4.148–4.215 |
| Portrait mobile original | 3.984 (3.898–4.117) | 4.168–4.191 |
| Portrait mobile batching | 3.809 (3.752–3.848) | 3.974–4.274 |
| Portrait mobile batching + glass preview | 2.654 (2.623–2.685) | 3.759–3.813 |

The batching timing benefit is modest and GPU ranges overlap. The preview has a larger CPU submission reduction in this scene, but changes the glass image. Neither number is a physical iPhone measurement or a real-world FPS guarantee. Initial/driver warmup variation is visible in the original mode's first repetition; raw per-run and per-frame-window percentiles remain in `focused-high.json` / `focused-low.json`.

### Existing eight scenarios

With original glass retained, desktop reef, animal, sediment and collision-area views each submit 60 fewer calls per frame. Other desktop views show no draw-count change. All original/default-batched triangle totals and shadow submissions match in all eight scenarios on both profiles.

The existing portrait replay does not put these jellyfish on screen; its eight draw totals are unchanged. The focused portrait test deliberately frames the encounter. This optimization helps when the jellyfish are visible, rather than making every mobile scene faster.

## Compatibility and implementation

`JellyfishTentacles` groups only the two repeated tube geometries sharing the same opaque material **within each jellyfish**. It does not merge transparent bells or batch across independently moving animals. Original pivot nodes and their animation equations remain in place; updated local pivot matrices populate the instance buffers. Dynamic conservative bounding spheres are recomputed so the new batches can be frustum-culled safely.

Original tentacle meshes retain their shared geometry/material references and can be switched back on for A/B. The batch owns only its instance resources; the existing encounter resource map still owns geometry and material disposal. No geometry copies or extra textures are created. The class falls back to original meshes for transparency, skinning/morphs, shadow flags, nondefault layers or nonidentity mesh-local transforms rather than attempting an unsafe batch.

The glass helper changes only transmissive materials in vehicle roots, stores their original transmission/opacity/pass flags in a WeakMap, and restores them on comparison switches. Existing facing-alpha shader callbacks, colors, textures and roughness are preserved. With the preview, facing-alpha glass uses opacity scale 0.65 and plain transmissive glass uses opacity 0.28; these are explicit approximation controls, not fidelity-equivalent physical parameters. The normal constructor path performs no glass replacement. Future vehicle loads and vehicle switches honor the URL choice as well.

No vehicle primitive merge was attempted. Animated/independently visible vehicle pieces require separate compatibility investigation. This experiment addresses the selected jellyfish encounter and glass pass.

## Verification

- **266 Node tests pass**; production build and `git diff --check` pass.
- **3,780 transformed tentacle-matrix comparisons per profile**, over three color variants and 180 animated poses each. Maximum element error is **3.88×10⁻⁸**, from float32 instance matrices. Bell scale animation matches exactly. Geometry and opaque material ownership are retained.
- Original/batched framebuffer captures were compared at the same scene state. Desktop differs in 442/3,686,400 channels, versus 541 channels on an unchanged repeated draw. Portrait differs in 27/1,316,640 channels, concentrated at subpixel edges; maximum channel delta 115, mean absolute delta 0.000237 on the 0–255 scale. Float32 transform order and raster differences prevent a pixel-perfect claim. Full-scene views were also visually inspected; no noticeable jellyfish shape/motion difference was found.
- Front, side, above, deep-water and inside-camera glass captures were generated for both profiles. Glass has a visible approximation tradeoff and remains opt-in. Full-resolution PNGs are generated locally under `.local-assets/mobile-rendering-captures/`; the raw comparison statistics and capture paths are committed, while large images are excluded from production artifacts.
- Original and preview startup paths work, including the explicit original-tentacle path. Each passed Play/forward input, letter collection, escort rendering, six-hit forced collision resolution, and switch to tracked GUP-X. Preview startup leaves zero active transmissive material references among loaded vehicles; original startup retains physical transmission.
- Unsafe transparent/offset tentacle sources fall back to original rendering; instance disposal events fire for both new batches.
- Phase 1 reef/compass compatibility checks pass on desktop and mobile profiles, including their gameplay smoke checks. No browser page errors were recorded.

Long-session thermal behavior, actual iPhone GPU/CPU timings, touch handling across Safari versions, every vehicle's glass appearance and subjective glass acceptance remain unverified. Physics, collision and discovery code was not changed.

## Reproduction

Start the local server on port 5173, configure the bundled Playwright runtime as in the previous audit, then run:

```powershell
node tools/mobile-rendering-audit.cjs
node tools/verify-mobile-rendering-gameplay.cjs
node --test tests/*.test.js
python tools/build.py
```

Run browser audits sequentially. The focused JSON contains all three repetitions, GPU query samples, pass/triangle totals, transform/image checks and local capture paths. The eight-scenario `baseline-*` and `batched-*` JSON files preserve the broader comparison. The glass experiment is suitable for review on an iPhone before making any decision to change the default.
