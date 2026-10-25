# GPU texture estimate in the performance display

Settings > Graphics > Show performance display now adds a third line: GPU textures ~N MiB. It uses the existing toggle and saved preference, with no new graphics settings or asset changes.

This is a partial resident texture payload estimate, not total GPU/device VRAM or a percentage of available memory. Ordinary browser WebGL APIs do not expose the game's complete physical GPU allocation. Geometry/index/instance buffers, renderbuffers, driver overhead, browser compositing and unreachable internal render targets (including transmission capture) are excluded. This HUD number also covers more than the vehicle-only memory budget used in the fleet audit; do not compare it directly against that 192 MiB vehicle target.

## How it works

A CPU-only scan collects scene/material textures, shader material uniforms, available terrain uniforms/occlusion maps, environment/reflection textures, light shadow targets, bone/morph textures and cached parked-vehicle groups. It counts only textures with live handles in this bundled renderer's properties, deduplicating identical native handles. Hidden grace-held vehicles remain included; disposed/nonresident textures are skipped. No WebGL state queries, uploads, downloads, rendering hooks or new GPU resources are used.

Payload sizes use image dimensions, pixel channel/type widths, actual mip dimensions, cube faces and array layers; compressed mip data uses its stored byte lengths when available. Unsupported formats/dimensions contribute an unknown count, shown as + ?. Exact driver allocation sizes and all backend-specific internal formats are not covered.

The scan runs on a normal HUD refresh at most once per two seconds of active gameplay, so readings can lag changes by roughly two seconds plus the HUD refresh interval. No scanning runs while disabled, paused, backgrounded or in menus. No periodic timer is created. Sets/maps containing handles are local to the scan; only numeric results persist, so eviction/context recovery is reflected on the next sample.

The estimator uses the bundled Three.js properties.has/get and __webglTexture metadata. It must be revalidated if that renderer is upgraded. The existing FPS/frame timing display is retained.

## Validation

All 280 Node tests and production build pass. New coverage includes exact mip counts, NPOT images, half/float/packed formats, cube/array/compressed textures, handle deduplication, hidden cache entries, disposal, uniforms/shadows/bone textures and disabled/throttled sampling.

Desktop and mobile browser UI checks pass for immediate toggling, menu exclusion and reload persistence. The portrait screenshot was inspected; the third line remains readable below the existing HUD. Dedicated browser tests confirm no game-state changes, zero GL errors, and lower tracked bytes after real GUP-A GPU release with exact restoration after preparation.

Measurements below run on desktop Edge hardware, not a physical iPhone. Each timing set contains 40 consecutive CPU scans after five warm-up calls; production scans run only about every two seconds. These are diagnostic CPU costs, not FPS benchmarks.

| Profile | Before MiB | After GUP-A release MiB | After preparation MiB | Scan median / p95 ms |
|---|---:|---:|---:|---:|
| high | 761.50 | 609.50 | 761.50 | 2.60 / 3.00 |
| low | 141.86 | 117.86 | 141.86 | 2.60 / 3.10 |

Desktop GUP-A's reduction is smaller than its standalone texture footprint because native handles shared with other models are counted once and can remain resident. No unknown formats were observed in these sampled scenes. The sampling work itself adds roughly 2.6 ms on this test machine when enabled; actual iPhone overhead is unmeasured.

## Reproduction

Start the local server on port 5173 and provide Playwright/installed Edge through NODE_PATH, then run:

    node tools/verify-performance-display.cjs
    node tools/verify-gpu-memory-display.cjs
    node --test tests/*.test.js
    python tools/build.py

The dedicated verifier writes gpu-memory-display-data/verification.json. Large UI screenshots remain in ignored .local-assets/. No visual quality, gameplay, controls, physics or resource residency policy changed.
