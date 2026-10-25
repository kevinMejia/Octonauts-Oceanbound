# Phase 2: rendering, shadows, GPU uploads and static transforms

## Executive summary

The Phase 1 optimizations are retained. This phase adds active-prefix uploads for dynamic fish/visitor/particle buffers and caches immutable local transforms for 256 terrain chunks and 11 Octopod structural meshes. No assets, material settings, lighting, shadow settings, object counts, animation rates, camera logic, physics, controls or render distances were changed. No dependencies or replacement rendering systems were added.

The strongest measured improvements are approximately half as many dynamic buffer-update bytes on the desktop profile, about 45% fewer on the mobile profile, and exactly 267 fewer local matrix compositions per world render. Draw submissions, submitted triangles, visible object transforms and active buffers match the baseline. Transfer counts and allocated GPU buffer capacities are not reduced.

Three uninstrumented timing repetitions show a small desktop replay improvement and essentially unchanged mobile-profile replay time. GPU timer results vary in both directions; there is no evidence here of a meaningful overall GPU-time or real-device FPS improvement. The deterministic reductions in unnecessary work are the reason to retain these small changes.

Two useful corrections/refinements to the previous audit:

1. This bundled Three.js renderer resets `renderer.info` **after** rendering shadows. The old counters excluded shadow draws/triangles, rather than including them. This phase observes actual submissions separately.
2. The imported active GUP's `Glass2 [Oceanbound]` material uses physical transmission (~0.377). Three.js captures the opaque scene into a multisampled transmission texture before drawing the main view. Much of the repeated submitted geometry belongs to this offscreen capture, rather than shadows. The pass is necessary for the existing appearance and remains intact.

## Baseline and measurement method

Read `README.md`, all Phase 1 measurements and both existing scripts before modifying production code. The local starting revision is `46b1ec2` (full SHA in `phase-2-baseline-revision.txt`): it contains the Phase 1 performance tree published as `b7ce24f`, plus a subsequent committed collision-shake fix. That camera fix is retained and is not part of this optimization.

Baseline collection completed before production edits. The existing verifier passed on high/desktop and low/mobile profiles, including collision, collection and escort smoke checks. `tools/performance-audit.cjs` was extended without changing its eight replay scenarios or their subsystem order. Existing Phase 1 output files were preserved; this phase writes under `phase-2-data/`.

Measurements use installed Edge 156 headless on Windows with an NVIDIA GeForce GTX 1080 Ti through ANGLE/D3D11. Desktop uses 1280×720, high quality, DPR 1; mobile emulation uses 390×844, low quality, DPR 1 with touch/coarse-pointer emulation. The low profile's pre-existing shadow policy remains unchanged. This is **not** physical mobile hardware. `quality`/`benchmark` keep adaptive resolution from affecting comparisons, without changing the game's graphics configuration.

Each scenario has 30 warmup and 120 measured fixed 1/60-second simulation steps, scheduled through requestAnimationFrame. Three separate fresh-browser runs per profile and stage collect timings without heavy probes. Instrumented runs are separate from those timing repetitions. All browser runs were sequential.

Measured quantities are deliberately distinguished:

- **CPU / host timing:** time spent in each timed subsystem, including render command submission, and elapsed time between replay callbacks. Summed timed subsystems exclude camera/vehicle-pose calls and harness overhead; this is not a full JS CPU profile. Render submission can include driver waiting and should not be treated as pure JavaScript execution.
- **GPU timing:** supported `EXT_disjoint_timer_query_webgl2` elapsed queries wrap `renderScene`, including transmission/shadow/main rendering and any rescue-arrow rendering. Results are polled asynchronously, associated with their sampling window and discarded on disjoint status. Approximately 118/120 final-window samples resolve before a scenario is recorded. These are elapsed GPU-query spans, not utilization or proof of a GPU bottleneck. GPU timing has one instrumented run per profile/stage; it does not have three-run confidence intervals.
- **Actual submissions:** wrapping `renderer.renderBufferDirect` and differencing renderer counters identifies shadow, offscreen transmission, main-framebuffer and HUD draws, classified by object/system. It counts real submissions, including transparent double passes. This is not an estimate based on mesh counts.
- **Actual update traffic:** wrapping `gl.bufferSubData` observes requested bytes and calls, including WebGL2 source-offset/length overloads. It excludes initial `bufferData` allocations, texture transfers, command-stream overhead and any driver-internal copies.
- **Transforms:** QA-only `Object3D.updateMatrix` counters measure local composition calls, not world-matrix multiplications. Production world-matrix propagation remains enabled.
- **Memory:** renderer geometry/texture counts and Chromium JS heap snapshots; GPU allocated bytes and long-session leak behavior are not measured.

The eight scenarios retain the limitations documented in Phase 1. The animal pose is not a worst-case crowd route. Collision-area timing is mostly post-separation rather than sustained collisions. Discovery/modal dispatch, audio, turbo pickup updates and parts of the normal HUD loop are absent from replay. Normal-loop and direct gameplay smoke tests supplement the timing harness.

## Rendering breakdown and compatibility findings

The raw instrumented files contain per-object/per-pass totals for every scenario. The tables below average submissions over each scenario's 120 measured updates; they need not equal the last-frame counter.

<!-- GENERATED_RENDER_TABLES -->

High/desktop baseline; all corresponding after totals match exactly.

| Scenario | Main calls | Transmission calls | Shadow calls | Main triangles | Transmission triangles | Shadow triangles |
|---|---:|---:|---:|---:|---:|---:|
| octopod | 176.2 | 135.2 | 17.0 | 1,353,378 | 1,105,448 | 501,672 |
| reef | 294.7 | 232.1 | 16.0 | 3,257,300 | 3,005,837 | 626,370 |
| high-speed | 119.4 | 82.7 | 7.0 | 577,332 | 331,222 | 31,746 |
| animals | 303.0 | 241.0 | 15.0 | 2,348,812 | 2,096,940 | 474,738 |
| particles | 280.0 | 216.0 | 16.0 | 3,256,442 | 3,004,888 | 626,370 |
| collision | 291.0 | 227.0 | 16.0 | 3,513,794 | 3,262,597 | 657,279 |
| letter | 187.7 | 148.7 | 13.0 | 1,509,283 | 1,262,881 | 514,756 |
| escort | 187.4 | 147.0 | 13.0 | 1,334,077 | 1,087,293 | 414,180 |

The mobile/low profile has zero shadow submissions by its existing configuration. Transmission remains present. Rescue adds four HUD draws (192 triangles) per sampled escort frame.

| Representative view | System | Main + transmission calls/update | Main + transmission triangles/update |
|---|---|---:|---:|
| octopod | decor | 94.0 | 1,644,766 |
| octopod | vehicle | 79.0 | 448,096 |
| octopod | crew | 69.0 | 77,534 |
| octopod | terrain | 40.0 | 184,320 |
| octopod | unnamed/background/collectibles | 19.0 | 7,284 |
| reef | animal:jellyfish | 108.0 | 25,728 |
| reef | vehicle | 79.0 | 448,096 |
| reef | animal:pufferfish | 66.0 | 11,154 |
| reef | decor | 54.0 | 1,852,538 |
| reef | habitat | 42.0 | 3,562,592 |
| animals | animal:jellyfish | 108.0 | 25,728 |
| animals | vehicle | 79.0 | 448,096 |
| animals | decor | 74.0 | 1,418,770 |
| animals | animal:pufferfish | 66.0 | 11,154 |
| animals | terrain | 34.0 | 156,672 |

<!-- END_GENERATED_RENDER_TABLES -->

The main contributors are existing instanced decorations, repeated vehicle/crew geometry and multi-part procedural animals. Reef formations are already instanced by type/layer/LOD. Repeated decorations already share geometry/material within their batches. Expanded animal encounters already share generated resources through their resource map; drawing multiple meshes is not evidence of duplicate allocated geometry.

The Octopod GLB has only 11 meshes and seven unique materials: six opaque structures with distinct materials, plus five glass pieces sharing one transparent material. The opaque geometry is already grouped by material. Merging glass would change independent sorting and visibility/culling behavior. No compatible opaque same-material merge with a compelling return was identified.

All currently registered discoverable marine animals use procedural visuals. The optional GLB adapter in `AnimalVisual` creates an AnimationMixer, but is not an active marine draw-call source in these scenarios. The loaded crew and vehicle GLBs are separate concerns. No animated GLB, bone, rotor or vehicle part was merged or frozen.

Jellyfish and pufferfish groups contribute many small draws relative to their triangle count. Jellyfish bells scale, tentacles rotate, puffer bodies inflate and fins move. Glass and transparent bells also depend on sorting/back/front passes. Reducing those calls safely would require an animation-aware batching or asset change, beyond a small proven-compatible merge.

Shadow submissions are much fewer than the combined main/transmission draws. Substantial caster triangles belong to decoration batches and authored Octopod structure; its warm-grey arm-rib mesh alone contains 56,240 triangles. This does not prove shadow execution dominates GPU time. Off-camera casters can still cast visible shadows, and the directional light follows the player. Freezing the shadow map, dropping off-camera casters, reducing resolution/distance or substituting proxy geometry would change behavior or fidelity. None was done.

## Changes implemented

### Active-prefix dynamic uploads

`src/environment/bufferUpdates.js` adds a small shared helper used by:

- `ReefFish.update`: instance matrices, instance colors and swim phases.
- `MarineVisitors.update`: ray/jelly visitor instance matrices.
- `PropulsionWater.update` and `TowWater.update`: packed position, bubble-shape and flow-direction attributes.
- `EnvironmentalInteractions.render/drawFragments`: sorted cloud matrices/attributes, sand grains, rock chips and coral branches.

Every caller already rewrites the entire active prefix before drawing it. The helper replaces any pending range with that latest prefix, marks it dirty, and leaves empty buffers alone. This remains correct when counts shrink/grow, pools empty/repopulate, objects are culled for several updates, or multiple updates precede a render: the next active prefix is rewritten completely. Ranges use **attribute components**, including 16 components per instance matrix, rather than bytes or vertex counts. The bundled renderer supports and clears these ranges after `bufferSubData`.

Simulation, pool reuse, particle ordering, fish phases/colors, draw ranges/counts, shader uniforms and buffer capacities are unchanged. Initial GPU allocation still uploads the full buffer. Unchanged phase/color caching was deliberately left for later; this change only narrows transfers.

### Immutable local transforms

`OceanTerrain` composes each chunk's local matrix after placement and disables its `matrixAutoUpdate`. Only chunk visibility changes during gameplay. `Octopod.load` does the same for the 11 existing structural mesh nodes after loading, before crew is attached. The headquarters root and structural parent groups remain dynamic; new crew objects, bones and animation roots retain automatic updates.

`matrixWorldAutoUpdate` and parent propagation are untouched. Explicit comparison verifies that the frozen meshes still inherit a moved headquarters parent identically. This saves 32,040 local compositions over each 120-update window (267 per world render) on both profiles. It does not remove scene traversal or world-matrix multiplication.

Future runtime editing of these structural/chunk local transforms must explicitly call `updateMatrix()` or re-enable automatic updates. Current gameplay has no such editing path.

## Before/after results and variance

<!-- GENERATED_BENCHMARK_TABLES -->

Three-run means; parentheses show min–max of the three run means, in milliseconds.

| Profile | Metric | Before | After |
|---|---|---:|---:|
| high | Elapsed replay callback | 7.277 (7.268–7.296) | 7.231 (7.209–7.245) |
| high | Sum of timed CPU subsystems | 6.393 (6.337–6.435) | 6.336 (6.297–6.381) |
| high | Render CPU submission | 5.506 (5.450–5.561) | 5.456 (5.429–5.493) |
| low | Elapsed replay callback | 7.057 (7.048–7.069) | 7.053 (7.048–7.055) |
| low | Sum of timed CPU subsystems | 4.600 (4.466–4.832) | 4.562 (4.549–4.582) |
| low | Render CPU submission | 3.588 (3.488–3.764) | 3.564 (3.548–3.573) |

High profile: elapsed mean and average per-run p95 from three uninstrumented runs; update bytes and GPU median/p95 from the separate final probe pair.

| Scenario | Elapsed mean before → after ms | Elapsed p95 before → after ms | Update KiB/step before → after | GPU median before → after ms | GPU p95 before → after ms |
|---|---:|---:|---:|---:|---:|---:|
| octopod | 7.050 → 7.090 | 8.367 → 8.567 | 25.88 → 13.58 | 4.695 → 4.594 | 5.900 → 6.065 |
| reef | 7.505 → 7.359 | 8.367 → 8.267 | 22.26 → 12.74 | 5.796 → 5.663 | 6.495 → 6.321 |
| high-speed | 7.199 → 7.184 | 7.467 → 7.367 | 25.93 → 14.79 | 3.944 → 4.777 | 6.568 → 5.820 |
| animals | 7.436 → 7.335 | 8.267 → 8.133 | 25.88 → 13.10 | 5.501 → 5.462 | 6.144 → 6.219 |
| particles | 7.434 → 7.325 | 8.333 → 8.233 | 47.50 → 20.80 | 5.597 → 5.383 | 6.105 → 6.009 |
| collision | 7.659 → 7.627 | 8.700 → 8.533 | 47.54 → 20.78 | 5.842 → 5.778 | 6.436 → 6.242 |
| letter | 6.984 → 6.982 | 7.733 → 7.667 | 25.09 → 13.02 | 4.813 → 4.684 | 5.788 → 5.566 |
| escort | 6.951 → 6.945 | 7.733 → 7.833 | 27.59 → 14.64 | 4.397 → 4.863 | 5.007 → 7.042 |

Total measured updates: **30,433,256 → 15,168,252 bytes (50.2% fewer)** across 960 sampled steps; **26,043 requests both before and after**. Local compositions decrease by exactly 32,040 in every 120-step scenario window.

Low profile: elapsed mean and average per-run p95 from three uninstrumented runs; update bytes and GPU median/p95 from the separate final probe pair.

| Scenario | Elapsed mean before → after ms | Elapsed p95 before → after ms | Update KiB/step before → after | GPU median before → after ms | GPU p95 before → after ms |
|---|---:|---:|---:|---:|---:|---:|
| octopod | 6.954 → 6.952 | 7.100 → 7.100 | 15.53 → 7.93 | 3.824 → 3.882 | 4.695 → 4.447 |
| reef | 7.727 → 7.727 | 7.333 → 7.100 | 13.66 → 7.38 | 3.519 → 3.424 | 4.010 → 4.209 |
| high-speed | 6.954 → 6.973 | 7.100 → 7.067 | 15.54 → 9.11 | 4.224 → 4.436 | 5.187 → 5.098 |
| animals | 6.954 → 6.954 | 7.100 → 7.100 | 15.53 → 7.66 | 3.653 → 3.496 | 4.154 → 4.084 |
| particles | 6.954 → 6.954 | 7.100 → 7.100 | 24.34 → 14.71 | 1.772 → 3.397 | 3.723 → 4.099 |
| collision | 6.973 → 6.954 | 7.400 → 7.100 | 24.34 → 13.50 | 3.316 → 3.331 | 4.005 → 4.030 |
| letter | 6.973 → 6.953 | 7.100 → 7.100 | 15.00 → 7.52 | 3.468 → 3.557 | 4.023 → 4.058 |
| escort | 6.972 → 6.954 | 7.533 → 7.100 | 16.59 → 8.91 | 3.467 → 3.109 | 4.321 → 4.532 |

Total measured updates: **17,269,288 → 9,425,540 bytes (45.4% fewer)** across 960 sampled steps; **25,801 requests both before and after**. Local compositions decrease by exactly 32,040 in every 120-step scenario window.

<!-- END_GENERATED_BENCHMARK_TABLES -->

The small aggregate elapsed-time change should not be advertised as an FPS gain. Desktop scenario results include slight regressions near the Octopod; GPU medians also move both ways. CPU clocks, scheduling, driver state and GC are uncontrolled. The reductions in transfer bytes and local matrix work are much stronger evidence than timing deltas.

Actual `bufferSubData` request counts remain the same: partially occupied active buffers still update once each rendered frame. Their payloads are smaller. This is distinct from the Phase 1 static-slot optimization, which avoids dirtying unchanged placements altogether. No Phase 1 optimization was repeated or removed.

Renderer resource counts match baseline at every corresponding scenario: desktop progresses from 1,224 to 1,243 geometries with 114 textures; mobile from 1,002 to 1,020 geometries with 113 textures. The increases arise as new content becomes resident. Allocated capacities are unchanged, and GC-dependent heap samples do not establish a memory improvement or leak. Full values are retained in the raw JSON and summary.

## Regression verification

- **262 Node tests pass**, including new component-range, shrink/empty/grow, deferred upload and bounded pending-range tests. Existing physics, camera, animal, collection, rescue and Phase 1 tests remain intact.
- **Production build passes**, including GLB header/length checks and versioned module graph generation. `git diff --check` passes.
- The original verifier passes before and after on both profiles: 66 reef buffer/count cases, 40 compass DOM cases, normal Play/forward-input loop, letter collection, escort rendering and forced collision resolution with six hits. No browser page errors.
- `verify-rendering-phase-2.cjs` compares baseline and current fish, visitor, propulsion, sediment, fragment and passenger-water outputs over **960 paired system updates per profile**. It compares full attribute arrays, visibility, counts and draw ranges. Tests include bursts, branch fragments, celebration-only bubbles, changing speed and distant-camera clearing.
- All eight scenarios on both profiles retain identical visible-node/world-transform hashes, active-buffer hashes, main/transmission/shadow/HUD submissions, triangle totals and resource counts.
- Frozen terrain matrices match explicit recomposition; structural meshes retain identical world matrices after parent motion; **zero crew nodes are frozen**.

### Framebuffer comparison

Framebuffer samples were read directly with WebGL `readPixels`, covering the rendered lighting, shadows, animals and particles. Cross-browser-launch hashes are not consistently identical even when CPU state/buffers match. A second check therefore renders the **same scene at the same simulation time in the same renderer**, comparing optimized uploads/cached locals against full dynamic uploads with automatic local recomposition. Unchanged repeated draws are also compared as a control.

<!-- GENERATED_IMAGE_RESULTS -->

| Profile | Maximum differing channels in optimized/full-upload A/B | Maximum in baseline A/B control | Maximum in unchanged final-repeat control | Maximum A/B channel delta (0–255) |
|---|---:|---:|---:|---:|
| high | 208 / 3,686,400 | 119 | 168 | 2 |
| low | 1 / 1,316,640 | 1 | 2 | 1 |

<!-- END_GENERATED_IMAGE_RESULTS -->

The nonzero raster differences also occur with the baseline and unchanged repeat draws. They are retained in the evidence, not silently called exact screenshot equality. CPU transforms/active buffers and draw/pass inputs do match exactly. No noticeable visual regression was identified in these sampled comparisons; physical-device and extended gameplay checks remain outside this audit.

## Top 10 remaining opportunities

These are recommendations, not claimed improvements. Rank considers benefit, effort and risk. Confidence refers to evidence for the workload, not certainty of a speedup.

| Rank | Opportunity / location | Expected impact | Effort | Risk | Evidence / confidence | Next action |
|---|---|---|---|---|---|---|
| 1 | Cache unchanged fish phase/color slots, `ReefFish.update` | Low–Medium | Small | Low | High: those values remain fixed per fish while matrices move; prefix narrowing implemented, value caching not implemented. | Measure avoided bytes/calls against cache overhead; invalidate on school-slot changes. |
| 2 | Precompute scenery kind/radius/limit invariants, `OceanDecorations.update` | Low | Small | Low | Medium: repeated classification/distance work remains at selection updates. | Benchmark locally; do not change culling or LOD boundaries. |
| 3 | Merge compatible immutable pieces inside a procedural animation pivot, `ExpandedVisuals`/`AnimalVisual` | Medium–High near animals | Medium | Medium | High workload: jelly/puffer groups have many low-triangle draws; improvement unproven. | Start with one opaque, fixed-material subset; preserve independent animated pivots and exact normals. |
| 4 | Offline compatible opaque primitive consolidation in imported GUP assets | Medium–High | Medium | Medium | High: active vehicle contributes many draws, including transmission capture. | Attribute material/primitive ownership; exclude rotors, glass, independent visibility and tracked parts. |
| 5 | Stage distant hidden crew rig/world updates, `OctopodCrew`, Three scene traversal | Medium | Medium–Large | Medium–High | High transform workload, but dependency-safe savings unproven. | Profile bones/world queries and attach/tow transitions; do not blindly freeze bones or moving parents. |
| 6 | Light-aware partitioning of instanced shadow caster batches | Medium | Large | Medium–High | High: observed shadow decoration triangles; GPU payoff unmeasured. | Inspect light frustum coverage; a separate compact caster path needs shadow-image equivalence. |
| 7 | Equivalent authored shadow proxies for arm ribs/complex scenery | Medium | Medium–Large | High | High geometry evidence, low equivalence confidence. | Prove silhouette/depth equivalence under moving light before considering deployment. |
| 8 | Transmission capture cost / glass asset review | Potentially High | Medium–Large | High | High: actual offscreen pass measured. | Profile capture/resolves/mipmaps on hardware. Keep transmission, refraction and quality unless an equivalent asset/material solution is demonstrated. |
| 9 | Transparent bell/glass double-pass and overdraw review | Medium | Medium | High | High structural evidence; benefit depends on camera/device. | Pixel/profile test author-approved alternatives; do not set forceSinglePass or transparency flags globally. |
| 10 | Parked-vehicle GPU residency hysteresis, `DiscoveryFleet` | Medium for hitches | Small–Medium | Medium | Medium: boundary eviction/reupload path exists; hitch frequency unmeasured. | Trace repeated boundary crossings and long-session mobile GPU budgets before adding a grace band. |

## Changes deliberately avoided

No glass meshes were merged; no material was replaced; no procedural animated group was collapsed; no shadow caster was removed or simplified. Shadows, transmission, resolution, AA, fog, lighting, terrain/reef density, particle counts, visibility ranges and animal update rates remain unchanged. Vehicles, crew, bones, camera, moving animal roots and dynamic effects were not frozen. No attempt was made to infer a GPU bottleneck simply from triangles or to skip world updates based only on camera visibility.

The extra transmission capture is a substantial finding, but deleting it would violate the appearance constraint. Shadow proxies, global double-pass changes and broad scene-graph freezing have meaningful fidelity/behavior risks and remain proposals.

## Reproduction and next steps

Start `python -m http.server 5173` separately, then from the repository root:

```powershell
$env:NODE_PATH='C:/Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
node tools/run-performance-phase-2.cjs baseline
node tools/run-performance-phase-2.cjs final
node tools/verify-rendering-phase-2.cjs
node tools/verify-rendering-phase-2.cjs --mobile
python tools/summarize-performance-phase-2.py
node --test tests/*.test.js
python tools/build.py
```

The runner loads baseline source from the saved Git revision via local Playwright routing; it does not revert files. For existing compatibility checks, set `AUDIT_OUTPUT` to a fresh path and run `tools/verify-performance-audit.cjs` with/without `--mobile`. `AUDIT_PROBES=1` enables pass/transfer/matrix/GPU/framebuffer probes in the existing benchmark; leave it off for timing repetitions. Raw files, verification logs and `summary.json` are committed with this report.

Next, collect real presented-frame CPU/GPU traces on a physical mobile device and desktop during sustained collisions, many moving animals, discovery dialogs, repeated vehicle changes and full escort delivery. Separate transmission capture, shadow maps, main shading, resolves and driver waiting. Current evidence supports localized work reductions, not a blanket FPS promise, a GPU-bound diagnosis, touch/Safari compatibility certification or a long-session memory conclusion.
