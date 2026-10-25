# Reef fish static attribute caching

## Result and scope

A localized change in ReefFish.update skips CPU color conversion, color writes and swim-phase writes/uploads when the corresponding packed instance slot still holds the same value. Matrices continue updating every frame. Fish counts, selection, motion, animation equations, materials and visibility rules are unchanged.

The measured benefit is a 19-20% reduction in this fish batch's dynamic bufferSubData bytes and roughly 64-67% fewer upload requests. It is not a 19-20% reduction in all game uploads or an FPS improvement claim. CPU savings are small in absolute terms (tens of microseconds per update on this desktop machine).

## Baseline and measurement

Baseline production revision: local 9014d409b706e7141ac949fd8d6398cf7e95ea82, equivalent source tree published as 8e3df78f268d354e1f21d4da046e1081bb42456b. baseline.json was collected before the production edit. optimized.json compares original and changed code in the same browser, alternating order across three repetitions per profile.

The focused browser replay uses bundled Three.js and the real ReefFish, MarineVisitors and SeaTurtle code in an isolated scene. It uses deterministic school selection and flat empty rock queries; it does not run vehicle physics or the whole game. Each run warms up 60 updates then measures 600 fixed 1/60-second updates at a stationary reef location or along a traveling path, yielding to requestAnimationFrame every 30 updates. These timings are subsystem replay measurements, not frame cadence. High is 1280x720; low is 390x844. Both run on desktop Edge hardware, not an iPhone. No GPU execution-time queries were made.

WebGL bufferSubData calls are counted against the actual fish matrix, instanceColor and swimPhase typed arrays. Initial bufferData allocations and unrelated visitor/turtle attributes are excluded. CPU update timings include visitor/turtle updates and instrumentation overhead; render submission timings are recorded separately in the raw JSON. Three repeats expose timing variance.

## Before / after

Each bytes and requests cell covers 600 measured updates. CPU columns list the three run means in milliseconds, original / optimized.

| Profile | Scenario | Upload bytes before / after | Bytes saved | Requests before / after | CPU update means before / after (ms) |
|---|---|---:|---:|---:|---|
| Desktop/high | stationary | 6,144,000 / 4,915,200 | 20.00% | 1800 / 600 | 0.0897, 0.0808, 0.0815 / 0.0522, 0.0483, 0.0472 |
| Desktop/high | travel | 6,054,400 / 4,884,928 | 19.32% | 1800 / 643 | 0.0797, 0.0802, 0.0823 / 0.0470, 0.0497, 0.0447 |
| Mobile/low | stationary | 2,880,000 / 2,304,000 | 20.00% | 1800 / 600 | 0.0440, 0.0423, 0.0430 / 0.0310, 0.0277, 0.0292 |
| Mobile/low | travel | 2,822,400 / 2,277,440 | 19.31% | 1800 / 642 | 0.0430, 0.0417, 0.0413 / 0.0282, 0.0295, 0.0273 |

Holding position eliminates measured post-warmup color/phase uploads. Traveling still uploads attributes as school selection and packed slot assignments change. Matrix bytes remain identical. Cache storage adds 9 bytes per capacity slot (1,440 bytes high; 864 bytes low), plus two typed-array objects; existing GPU capacities are unchanged.

## Correctness and deferred rendering

Phase cache values retain JavaScript precision (Float64) to avoid repeated float32-rounding comparisons. Palette indices use an Int8 cache; the four-entry palette is fixed. NaN and -1 sentinels force first writes. Comparisons are value-based, so reshuffling or replacing fish cannot retain incorrect slot contents.

Dirty-prefix marking preserves the maximum pending range rather than dropping earlier dirty tail slots after a temporary shrink. No new dirty request is made for unchanged attributes, so pending uploads remain intact across skipped renders. Context restoration recreates GPU buffers from the complete CPU arrays as before.

The browser verifier compares all active matrices, colors and phases exactly against the original across 720 traveling updates per profile. It reads real GPU buffers back and checks them against CPU arrays across deferred draws, plus a forced high-slot phase/color edit followed by shrink, empty and grow without intermediate draws. Same-state framebuffer comparisons report zero changed channels for the focused scenes on both profiles. The existing gameplay verifier covers reef/compass equivalence, movement input, letter collection, rescue escort and collision resolution on both quality profiles.

268 Node tests and production build pass. This optimization is scoped to redundant fish attributes; draw calls, geometry complexity, pixel workload and other animal systems remain unoptimized.

## Reproduction and limitations

Start the local server on port 5173 and make Playwright with installed Edge available via NODE_PATH, then run:

    node tools/fish-upload-audit.cjs docs/performance-audit/fish-upload-data/optimized.json
    node tools/verify-performance-audit.cjs
    node tools/verify-performance-audit.cjs --mobile
    node --test tests/*.test.js
    python tools/build.py

The audit loads original ReefFish.js through git show at the baseline local revision; that Git object must be present to replay. The report/raw artifacts preserve measured results. Focused pixel equality and GPU readback do not prove every possible device/camera state; actual iPhone frame-rate, thermal behavior and whole-game speedup remain unmeasured.
