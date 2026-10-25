# Starting-area terrain GPU warm-up

## Executive result

The startup path now prepares only existing terrain chunks inside the normal starting-area visibility radius. This shifts their first-use vertex/index buffer allocations behind the loading screen, without changing terrain geometry, distances, object density, lighting, camera or gameplay.

Repeated tests moved 140 terrain allocation calls / 3,732,176 bytes on high and 75 calls / 1,397,460 bytes on low out of the first starting-area turn. The first-turn terrain allocation count becomes zero in all three repetitions per profile. Warm-up itself took 21-33 ms on the test desktop, including frame yields. Render-time ranges overlap; there is no demonstrated iPhone FPS or whole-game latency improvement.

## Baseline and investigation

Baseline was collected before production edits, from local revision f80bf04ed4aa0f846594c57901560433b97e0e45. Its tree equals published 6fc2b7efeb26009627078a401c5c9416e873dea7. The benchmark now uses that published baseline; the Game.js Git blob is identical (b3c567ec42648ffd65c2043ce1f575b5f17608e1). baseline.json preserves the original capture metadata.

The original investigation proposed nearby scenery generally. Instrumentation showed no first-turn decoration/habitat geometry allocations: those batches' geometry was already uploaded during startup, even with zero instance counts. The remaining starting-area environmental bufferData allocations were terrain, so no decoration/habitat warm-up was added.

Three initial baseline runs per profile were followed by three alternating original/current comparisons per profile (12 comparison starts). High uses 1280x720; low uses 390x844 with mobile/touch emulation, both on desktop Edge. Each run stops the animation loop at ready, applies normal terrain distance visibility, then performs two 120-step horizontal camera sweeps around the actual initial camera pose. Scenery selection and rendering run; other simulation is held fixed. Each 20 steps yields to requestAnimationFrame. The starting camera poses match across all compared runs.

WebGL bufferData calls are attributed by typed-array identity to terrain, decoration, habitat or other buffers. Initial buffer allocations and startup/warm-up/turn phases are separated. A live-buffer map tracks requested buffer storage sizes and deletes. These are known WebGL buffer storage bytes, not total VRAM, driver overhead, textures or process memory. Renderer geometry/texture/program counts are also recorded.

Selection and rendering timers are CPU-side instrumented replay timings, including driver waits, not GPU execution or delivered frame cadence. No GPU timers were used. Geometry uploads are not evidence by themselves of a GPU execution bottleneck.

## Implementation

SceneryWarmup.js uses OceanTerrain.update's existing visibility rule to select the starting-area chunks. It submits at most 12 chunks per pass, with a browser-frame yield between batches. Other scene objects are temporarily hidden, lights retain their visibility, and CPU frustum culling is bypassed only for those selected chunks during warm-up. The actual camera stays untouched.

Rendering is scissored to a tiny viewport on the existing canvas while startup CSS hides that canvas. This avoids a new render target and the different color-output/tone-mapping shader variants that this bundled Three.js uses for ordinary offscreen targets. No temporary textures, meshes or geometries are created. High submitted 47 terrain chunks in four passes; low submitted 24 in two.

Shadow updates are paused only during these hidden warm-up passes, then restored before the existing normal startup render. Shadow enabled state, type, quality, distances and later behavior are unchanged. Scene visibility, culling flags, render target/cube/mip level, viewport, scissor and shadow-update flags are restored in finally, including render failure and context-loss paths.

Game.start awaits warm-up after its existing compileAsync and before its normal initial render and ready flag. Loading progress, Play gating, audio restrictions and gameplay timing continue through the existing startup promise. Warm-up is not repeated every frame, on turns, or on graphics-context restoration.

## Before / after measurements

Counts/bytes are for the first 360-degree starting-area sweep. Allocation counts and sizes are identical across all three repetitions. Storage is MiB (2^20 bytes), original / current.

| Profile | First-turn terrain allocation calls | First-turn terrain allocation bytes | Warm-up stage ms (range) | Buffer storage at ready MiB | Buffer storage after turn MiB |
|---|---:|---:|---:|---:|---:|
| high | 140 / 0 | 3,732,176 / 0 | 28.8-33.0 | 121.47 / 125.02 | 126.14 / 126.14 |
| low | 75 / 0 | 1,397,460 / 0 | 21.1-26.2 | 79.65 / 80.99 | 89.11 / 89.11 |

The explicit tradeoff is earlier residency: approximately 3.56 MiB on high and 1.33 MiB on low at ready. After the full turn, tracked buffer storage matches the baseline exactly. Peak residency for a player who never turns is therefore higher; this does not imply all memory usage decreased.

Ready geometry counts changed from 1,202 to 1,230 high and 997 to 1,012 low, matching the newly resident terrain. After the turn both paths have 1,249 high / 1,150 low geometries. Texture and shader-program counts are unchanged (114 textures / 107 programs high, 112 / 73 low). The warm-up stage compiles zero new shaders in every repetition.

CPU render submission mean/max values below show each of the three runs, in ms. They include all scene rendering, not just terrain.

| Profile | Original mean ms | Current mean ms | Original maximum ms | Current maximum ms |
|---|---|---|---|---|
| high | 12.53, 10.06, 10.44 | 12.64, 9.59, 9.67 | 61.50, 29.80, 30.80 | 39.30, 29.90, 29.60 |
| low | 6.52, 4.29, 3.70 | 3.86, 5.49, 3.87 | 22.70, 18.40, 12.50 | 15.40, 19.70, 16.00 |

The timing ranges overlap and vary substantially. Startup readiness also varies with cached assets/driver work: original high 6.18-14.24 seconds versus current 6.41-8.25; original low 5.56-8.72 versus current 6.03-6.50. Those ranges are not evidence of a faster loader. The separately instrumented 21-33 ms warm-up stage includes both newly advanced work and work otherwise done in the existing initial render; it is not a clean measurement of net added loading time.

## Verification

- All 272 Node tests in the shared working tree pass, including three new warm-up tests for nearby-only selection, bounded batching/yields, resource reuse, and restoration on both render failure and context loss.
- Production build and git diff checks pass. A concurrent collision-recoil change was committed separately as local 281ec9f / published f30f9e7 during this work; it is preserved. Our production diff adds only the warm-up module and its awaited startup call.
- Browser startup checks pass on both profiles: camera/sub/scene transforms, visibility/culling and renderer state are restored exactly; the canvas remains hidden during every warm-up pass; Play remains gated and audio inactive.
- A repeat warm-up with the game loop stopped preserves state. Same-state framebuffer comparison has zero changed channels on mobile. Desktop has 79 changed channels, while an unchanged repeated draw has 196; a pixel-perfect desktop claim is not made.
- Forward input, letter collection, rescue escort and collision resolution pass on both profiles with no page errors.
- Existing scenery/compass compatibility and gameplay checks run on both profiles; their results are retained separately.

## Remaining limits and next steps

This is a first-use work scheduling change, not a reduction in steady-state triangles, draw calls, density or resolution. It does not remove distance/LOD transitions. New areas still allocate their terrain buffers on first use, and other first-turn buffers remain (roughly 1.11 MiB high and 8.12 MiB low in this replay), not yet attributed to specific non-environment objects. Avoid broad whole-world or fleet warming without measuring memory and startup cost.

Actual iPhone timings, thermal behavior and hardware GPU memory remain unmeasured. A future graphics-context restore clears GPU residency as usual; this startup-only warm-up intentionally does not extend recovery behavior.

## Reproduction

With a local server on port 5173 and Playwright/installed Edge available via NODE_PATH:

    node tools/scenery-warmup-audit.cjs docs/performance-audit/scenery-warmup-data/optimized.json
    node tools/verify-scenery-warmup.cjs
    node --test tests/*.test.js
    python tools/build.py

Set WARMUP_STAGES=reference for the baseline-only path. The published baseline Git object must be available locally for git show. Initial baseline, alternating comparison results, individual frame timings/counters, memory counts, browser verification and regression results are preserved under scenery-warmup-data/.
