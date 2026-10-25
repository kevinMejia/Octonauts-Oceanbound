# Parked-vehicle boundary residency

## Result

A controlled boundary replay confirmed repeated GPU disposal/re-preparation at the existing 160 m visibility boundary. Six short excursions from 159 m to 161 m caused six evictions and six re-preparations of GUP-A per repetition, including 40,663,488 bytes of geometry uploads and 126 texture sub-image uploads.

A small time-and-distance grace band removes that churn: vehicles still hide at 160 m, but GPU allocations are retained inside 180 m until they have stayed outside view for three seconds. Returning into view resets the timer. At 180 m or farther they release immediately at the existing visibility poll. Active vehicles never evict.

The change removes repeated preparation work for short returns; it does not improve first arrival, change rendering distance or establish an FPS gain. Temporary memory residency is higher. The existing full-fleet mobile texture-budget test also fails on the original policy and remains a known limitation.

## Investigation and method

Baseline: published beffc11bc6e969359b350dc919565cc00a703693, equivalent to the starting local f95f993 tree. Baseline captures preceded production edits. The first baseline counted texImage2D; a second pre-edit probe added WebGL2 texSubImage2D and texStorage2D, which are the operations actually used here. The first artifact's counter is explicitly named texImage2DCalls, not total texture uploads.

The focused browser replay loads the full game, stops its animation loop, and uses a blocked DiscoveryFleet clone containing the real GUP-A record. Production GPU release, image decoding, texture preparation, shader compilation and rendering run normally; discovery/physics do not run during these samples. Controlled performance.now values advance only during each visibility update, by 601 ms per step; real async preparation timers use the original clock. The actual 500 ms poll and all resource operations are retained.

Three alternating original/current repetitions run on high desktop (1280x720) and touch/mobile low emulation (390x844), on desktop Edge hardware. Each performs six brief 159/161 m cycles, a sustained 161 m wait, and a departure to 181 m. It awaits pending preparation before measuring settled states. This deliberately isolates resource churn; it is not representative gameplay cadence or a GPU execution-time measurement.

GPU geometry allocation calls are attributed by actual target typed-array identity. Texture sub-image/storage calls are counted during that vehicle's preparation. Async preparation elapsed time includes decoding, compileAsync waits and driver work; it is not a single frozen-frame duration, pure JavaScript time or GPU query.

## Before / after

Each row represents six brief boundary excursions. Counts/bytes are identical across all three repetitions. Time is the range of original run means; no preparation occurs in the optimized short-return phase.

| Profile | Evictions before / after | Preparations before / after | Geometry buffer allocations before / after | Geometry upload bytes before / after | Texture sub-image uploads before / after | Original async prepare mean ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| high | 6 / 0 | 6 / 0 | 2,628 / 0 | 40,663,488 / 0 | 126 / 0 | 460.4-469.7 |
| low | 6 / 0 | 6 / 0 | 2,628 / 0 | 40,663,488 / 0 | 126 / 0 | 435.0-453.1 |

Texture storage allocations likewise fell from 108 to zero in each short-return replay. The original repeat means are roughly 0.44-0.47 seconds per preparation; individual samples vary. Avoiding these calls is a measured reduction in work, not proof that every call formerly froze the UI for that duration.

Visibility matches the original at every sampled distance: visible at 159 m and hidden at 161 m. Sustained waits evict at the first poll after the grace expires (3.005 seconds after leaving in this controlled 601 ms cadence); departing to 181 m evicts on that update. Both cases still require normal preparation when returning.

## Memory tradeoff and existing budget failure

One retained GUP-A has approximately 196 MiB of texture storage on high, or 28 MiB on low, plus about 6.46 MiB of geometry buffers. The texture estimate deduplicates renderer texture handles and uses image dimensions, RGBA bytes and a mipmap factor; it is not hardware VRAM accounting. Shared textures and driver overhead need separate accounting. After timer expiry/departure, the target's resident texture handles drop to zero as in the original. No decoded CPU images remain after preparation.

To check wider effects, the existing full-fleet test was run unchanged and then an instrumented copy captured both policies. The unchanged 192 MiB vehicle-texture assertion fails on BOTH the original and modified policy: each peaks at about 208 MiB after the entire fleet returns home. The assertion was not raised, deleted or changed in the repository.

On one approach sample the grace policy holds 173.33 MiB versus the original's 141.33 MiB; this demonstrates the intended transient retention. The all-fleet peak remains 208 MiB in both traces. This is not proof of universal mobile safety: the existing budget excess needs separate investigation, and actual device memory/context pressure is unmeasured.

The grace ends at the next existing visibility check after expiry, normally within another 500 ms of active play. During a game pause, cleanup waits until normal updates resume. There is no new timer, background loader or permanent radius-only residency band.

## Implementation

- fleetParkingConfig.js: existing 160 m visibility value, 180 m hard-release distance and 3,000 ms grace are explicit fleet policy values.
- DiscoveryFleet.update: tracks when each parked record leaves visibility; keeps it hidden during grace, releases on expiry/far departure, resets on return. Active selection clears the timer. Loading radius, collision proxies, unlock triggers, positions, scale and control behavior are unchanged.
- Game.restoreGraphics: hidden grace-held records are marked evicted after context loss/recovery so their next re-entry runs texture preparation. Without this, a hidden retained record could incorrectly be treated as GPU-ready after the context discarded its resources. This also preserves its hidden state until preparation completes.

## Verification

All 275 Node tests and production build pass. Three new unit cases cover repeated short crossings, exact expiry, far departure, active-vehicle protection, timer reset and a pending restore that leaves the view again.

A dedicated browser verifier passes on both profiles: retain a hidden vehicle in the band, force actual WEBGL_lose_context loss/restoration, preserve another pause owner, confirm hidden resources are invalidated, re-enter, keep the model hidden while preparing, then check restored texture handles, unchanged model position and collision proxy flags, one scene copy and zero decoded-image residue. No page errors were recorded.

The full-fleet 192 MiB assertion is a reproducible baseline failure, not a passing test. Independent checks after that assertion are exercised separately by a local diagnostic continuation; their results must not be represented as the unchanged budget test passing. That continuation passed context recovery/retry, the simulated older-Safari HTMLImage fallback, one navigation, no crashes/page errors, one request per model and no decoded-image residue. The unchanged saved-selection cancellation test also passed. Results are recorded separately in remaining-checks.json.

## Reproduction

With a local server on port 5173 and Playwright/Edge available via NODE_PATH:

    node tools/fleet-residency-audit.cjs docs/performance-audit/fleet-residency-data/optimized.json
    node tools/verify-fleet-residency.cjs
    node --test tests/*.test.js
    node tests/fleet-memory-browser.cjs
    node tests/fleet-saved-memory.cjs
    python tools/build.py

The published baseline object must be present for git show; RESIDENCY_REPEATS can shorten diagnostic repetitions. The existing fleet-memory test is expected to expose the documented budget failure. Initial captures, WebGL2 probe, three-repeat comparison, context recovery, full-fleet memory samples and summary are retained under fleet-residency-data/.

## Remaining work

Investigate the 208 MiB full-fleet footprint without reducing visual quality; review exact texture sharing/duplicate allocations before proposing asset changes. First-load preparation and distant arrivals remain unchanged. The current grace is intended for short boundary returns, not broad fleet preloading. Physical iPhone FPS, Safari GPU behavior, thermal conditions and real VRAM remain unmeasured.
