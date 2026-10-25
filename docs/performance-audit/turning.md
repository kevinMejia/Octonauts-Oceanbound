# Turning pop-in and first-use hitch investigation

## Findings and changes

OceanDecorations used a 0.1-second visibility-selection throttle based on time and GUP position, ignoring camera rotation. Turning could leave objects required by the new view out of the instance batches until the timer expired.

Selection now also refreshes after more than one degree of camera rotation since the previous selection. Stable views retain the existing throttle. Culling bounds, distances, LOD thresholds, object counts, transforms and lighting are unchanged. Tiny turns can still wait for the timer; this does not eliminate every kind of pop-in.

Decoration instance colors were also created only as objects first became visible, after startup compileAsync had prepared the shader without instance colors. Batches now allocate their existing color attribute during loading (count remains zero) so startup can compile the correct variant. Active tints are still written normally. No objects are drawn just to warm them up.

## Method

Baseline: local 62699ed, published as 7f4820856cf5deca3c4f1e0acee2e05b0004737b. Baseline data was collected before production edits.

The full game loads, then the replay stops the animation loop and runs three 360-degree camera sweeps each near Octopod, reef and showcase. Each sweep has 120 three-degree steps. Decorations and habitat update, and the scene renders; other simulation stays fixed. It yields to requestAnimationFrame every 20 steps. High is 1280x720; low is touch/mobile emulation at 390x844, both on desktop Edge hardware.

An independent calculation compares the current frustum/range requirements against selected decoration slots. Missing selections use the existing conservative culling spheres; they are not counts of visually distinguishable missing objects or pixels. WebGL hooks count compilation, buffer allocations/updates and texture uploads.

Timings are instrumented CPU selection and render submission/driver waiting, not GPU execution or iPhone frame cadence. Diagnostic visibility calculations add overhead. First sweeps include first-use work after startup, with only one cold sample per stage/profile; their spike changes must not be interpreted as repeatable FPS improvements. Later sweeps show warm behavior.

## Results

| Profile | Frames with missing selections before / after | Shader compile calls before / after | First Octopod sweep maximum render submission ms | Mean decoration selection ms |
|---|---:|---:|---:|---:|
| high | 885 / 1080 to 0 / 1080 | 26 to 4 | 682.0 to 64.3 | 0.207 to 1.085 |
| low | 800 / 1080 to 0 / 1080 | 6 to 0 | 224.0 to 11.8 | 0.155 to 0.852 |

The mobile replay no longer compiles shaders during these turns; desktop still compiles four when visiting the reef. First-use geometry allocations remain. Texture upload calls were zero in the measured sweeps, so texture reloading is not supported as the explanation for this replay.

Warm render submission below combines sweeps two and three at each location (240 samples). Driver waits are included.

| Profile | Region | Before mean / p95 ms | After mean / p95 ms |
|---|---|---:|---:|
| high | octopod | 8.52 / 18.50 | 8.49 / 18.40 |
| high | reef | 8.13 / 18.90 | 8.28 / 19.10 |
| high | showcase | 8.61 / 19.10 | 8.49 / 18.40 |
| low | octopod | 2.89 / 5.20 | 3.20 / 6.00 |
| low | reef | 3.31 / 6.70 | 3.07 / 6.30 |
| low | showcase | 2.96 / 5.50 | 2.98 / 5.50 |

## Tradeoffs and verification

Fast turns now require more CPU selection work and instance-buffer updates, about 0.7-0.9 ms extra per update in this aggressive replay on this machine. This is a visibility responsiveness correction, not a general reduction in steady rendering cost. Nothing beyond the existing current-view requirements is added. A 60-update stationary control requests zero bufferSubData uploads on both profiles.

Twelve settled orientations per profile match the original active instance matrices, colors and counts exactly. Three focused image comparisons per profile have zero changed channels on mobile; desktop has 226 changed channels in aggregate and is not pixel-perfect. The same geometry/materials and exact active buffers are retained.

All 268 Node tests and production build pass. Desktop/mobile browser verifiers pass 66 scenery cases, 40 compass DOM cases, movement input, collection, rescue escort and collision resolution per profile. No page errors were recorded.

## Remaining opportunities and limits

- Distance/LOD boundary popping still exists. Fading would be an intentional visual/shader change needing separate evaluation.
- Desktop reef shader compilation and first-use geometry allocations remain. A targeted startup warm-up may help but must be weighed against startup time and mobile memory.
- Parked vehicles load by distance and evict GPU resources at their boundary. Arrival/re-entry hitches need a separate measured residency investigation.
- Geometry complexity, density, particle counts, quality settings, shadow quality and draw distances are unchanged.
- Actual iPhone FPS, thermal behavior and every region remain unmeasured. This supports specific visibility/work findings, not a whole-game FPS claim.

## Reproduction

With a local server on port 5173 and Playwright/Edge available through NODE_PATH:

    node tools/turning-audit.cjs docs/performance-audit/turning-data/optimized.json
    node tools/verify-performance-audit.cjs
    node tools/verify-performance-audit.cjs --mobile
    node --test tests/*.test.js
    python tools/build.py

The audit writes high/low JSON files. Settled-view verification imports the old update method via git show at 62699ed, which must exist locally. Full per-frame counters and timings, including unfavorable samples, are retained with the summary.
