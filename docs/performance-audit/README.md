# Oceanbound performance audit

Audit date: 2026-10-25. Original revision: see `baseline-revision.txt`.

Latest targeted follow-up: [Starting-area terrain GPU warm-up](scenery-warmup.md).

Latest fleet investigation: [Parked-vehicle boundary residency](fleet-residency.md).

Texture follow-up: [Fleet texture storage audit](vehicle-textures.md) (no new safe deduplication candidates).

## Executive assessment

The game already has effective performance foundations: instanced reef/fish rendering, GPU vegetation and fish-tail animation, pooled effects, spatial collision queries, distant-animal throttling, bounded fish-school caching, shared reef textures, vehicle image deduplication, and GPU eviction for distant parked vehicles. A wholesale rewrite is unwarranted.

Rendering is the largest observed cost. Baseline render submission averaged 5.59 ms across eight scripted scenarios, compared with 0.044 ms for the vehicle update and 0.146 ms for discoverable animal updates. Dense scenes submitted up to 544 draw calls and 6.83 million triangles, including shadow work. Small fixes remove substantial redundant work, but do not remove this underlying geometry/draw-call burden.

Implemented four localized changes: unchanged compass writes are skipped; the body boosting class changes only on a boost transition; static reef instance slots are rewritten/uploaded only when their contents change; scene-memory diagnostics run only in inspect mode. No render settings, assets, visibility distances, culling thresholds, animations, collision algorithms, movement equations, or effects budgets changed. No dependencies were added.

The strongest measurements are work reductions: 84.6% fewer compass DOM mutations over all scenarios, and 73.2% fewer instance-attribute update requests in a desktop equivalence sequence (68.7% in the mobile profile). Measured mean compass update time fell from 0.175 to 0.120 ms. These are meaningful local improvements, not evidence of a large real-device FPS gain.

## System map and interactions

| System | Implementation and interaction |
|---|---|
| Startup/assets | `src/main.js`, `Game.start`: terrain/lights created first; vehicle, scenery, habitat, pickups and Octopod loaded concurrently; crew, interaction proxies, animals and discoveries follow; textures prepared and shaders compiled before play. `window.explorer` exposes the game for QA. |
| Main loop | `Game.start` installs `renderer.setAnimationLoop`. It clamps simulation dt to 50 ms, handles pause/context loss, reads input, advances vehicle/rescue/animals and discovery, updates HUD/camera/environment/effects, then renders the world and rescue arrow. Discovery can pause/exit the frame before rendering. |
| Camera | `ChaseCamera.update`, `CameraObstacles.limit`: smoothed vehicle follow, orbit/recenter, terrain clearance and spatially queried obstacle sweeps; collision shake applied after follow smoothing. Multiple consumers update camera matrices before frustum tests. |
| Vehicle/physics | `SubmarineController.update`, `TrackedGroundController`, `GroundRide`, `GupB.update`: movement integration, hull/terrain constraints, tracked substeps, visual ride motion, tracks and rotors. These remain untouched. |
| Collisions | `InteractionSurfaces` constructs compound static proxies in `SurfaceGrid`; `CollisionWorld.resolve` queries a swept broad phase, filters vertical overlap, sweeps hull lobes, resolves penetration/sliding and terrain contact. Camera, animal clearance and rescue share the grid. No triangle-mesh raycast loop was found in vehicle collision. |
| Environment | `OceanTerrain`: fixed geometry chunks, shared sand material, distance visibility. `OceanDecorations`: instancing by kind and LOD, distance/frustum selection at roughly 10 Hz. `ReefHabitat`: instancing by formation/layer/LOD with per-frame culling. Rock/coral caustics and vegetation bending run in shaders. |
| Marine life | `MarineAnimals`, `AnimalMovement`, `AnimalGroups`: discoverable animals update discovery positions; distant animation/movement is already accumulated and throttled. `ReefFish` selects bounded nearby schools, caches terrain clearance, and renders one instanced fish batch; visitors/turtle animate separately. |
| Effects | `EnvironmentalInteractions`: collision/terrain events emit pooled sediment, sand grains and fragments; translucent sediment sorted by distance. `PropulsionWater`: pooled bubbles, vents, flow streaks and discovery bursts. `AmbientWater` and `SunRays` animate in shaders. `LetterVisuals` animates small sparkle buffers. |
| Discovery/collection | `DiscoveryFleet` queries vehicle triggers and manages parked GPU residency; `MarineDiscovery`/`CrewDiscovery` manage animal/crew proximity and modals. `WordHunt.update` animates uncollected letters and sweeps collection segments. Turbo pickups retain respawn timers. |
| Rescue | `RescueSystem` updates towing motion, its own hull collision, rope, tow water, delivery and HUD. `OctopodCrew` handles visible crew mixers, home activities, helmets and tow poses. `RescueNavigation.render` renders an extra scene and copies its small canvas region to the HUD. |
| UI | Compass updates bearings every frame and measures layout only on size/viewport changes. TurboMeter already skips unchanged charge. WordHuntDisplay uses ResizeObserver and a body-class MutationObserver for notice placement; this makes repeated body class writes especially undesirable during collection notices. |
| Lighting/materials | `UnderwaterAtmosphere`: moving directional shadow light, hemisphere light, fog/depth color, reflection environment, surface layer, caustic time and particles. High profile has 2048 shadows; low profile already omits shadows. Existing choices were preserved. |
| Memory/cleanup | `VehicleImageCache` hashes encoded PNGs, shares sources, bounds decoded image residency and closes decoded images after upload. `releaseVehicleGPU` releases GPU resources while retaining reloadable CPU data. Letter collection disposes unique materials/sparkle buffers and reference-counts letter geometry. Animal/crew/rescue objects expose disposal paths. No session-long vehicle-switch leak has been established. |

## Top 10 opportunities, ranked by benefit / effort / risk

Impact refers to the affected workload; it is not a promised whole-game FPS improvement. Larger rendering items rank below smaller proven fixes because their regression/implementation costs are higher.

| Rank | Finding; file/function | Evidence | Impact | Effort | Risk | Recommended fix / disposition | Measured benefit? |
|---|---|---|---|---|---|---|---|
| 1 | Redundant static instance writes/uploads; `OceanDecorations.update`, `ReefHabitat.update` | Every selected record was copied; attributes marked dirty even when selection stayed identical. | Medium | Small | Low | Cache record identity per slot; dirty only changed ranges. **Implemented.** Shader animation continues every update. | Yes: update requests 8,466 → 2,272 in desktop transition sequence; exact visible buffers matched. GPU time/bytes not measured. |
| 2 | Redundant compass DOM mutations; `Compass.update`, `syncTargets`, `updateTargets` | 64,673 mutations across 1,200 baseline updates; repeated labels/data/visibility writes. | Medium | Small | Low | Compare values before writing; retain full-frequency bearing calculations. **Implemented.** | Yes: 9,975 mutations after, 84.6% fewer; compass mean 0.175 → 0.120 ms. |
| 3 | Body class writes trigger notice layout observer; `Game.start` boost HUD step, `WordHuntDisplay.position` | Body class toggled each gameplay frame; visible notice observes body class and reads/writes bounding rectangles. | Medium during notices | Small | Low | Toggle class only when boost state changes. **Implemented.** | Structural removal verified in code; collection smoke passes. Notice layout time reduction not benchmarked. |
| 4 | Diagnostic scene scan outside inspect mode; `RenderMetrics.beginFrame/update` | Every 2 seconds traversed visible scene, made geometry Set, summed buffers, built unused report without inspect output. | Low average / Medium periodic | Small | Low | Gate diagnostic scan/report and CPU timer behind existing inspect output; preserve adaptive frame samples. **Implemented.** | Unit test verifies zero diagnostic traversal with adaptive sampling intact. Time/spike gain unmeasured. |
| 5 | Per-kind invariant calculations in scenery selection; `OceanDecorations.update` | Regexes, distance limits and repeated distance/frustum work; baseline scenery mean 0.207 ms, p95 up to ~1.3 ms. | Low–Medium | Small | Low | Precompute kind limits/radii; benchmark squared-distance rejection before replacing distance math. Recommendation only: incremental gain likely small after caching. | Hypothesized. |
| 6 | Full-capacity dynamic uploads; `ReefFish.update`, `PropulsionWater.update`, `EnvironmentalInteractions.render/drawFragments` | Dynamic matrices, phases, colors and particle attributes marked dirty without active-prefix ranges; pools commonly partially occupied. | Medium | Small–Medium | Low–Medium | Add active-prefix upload ranges, then consider slot-aware caching for immutable fish phase/color data. Preserve simulation and ordering. | Hypothesized; actual transfer bytes and GPU stalls need tracing. |
| 7 | Repeated local transform composition for immutable meshes; `Octopod.load`, `OceanTerrain` construction | Three.js default matrixAutoUpdate remains enabled for static geometry; world render traverses many meshes. | Medium | Small–Medium | Medium | Count/CPU-profile updateMatrix calls; freeze only confirmed immutable local transforms after initialization. Exclude crew, rotors, animated bones and moving roots. | Hypothesized; intentionally not frozen without per-node ownership proof. |
| 8 | Hundreds of draws from authored/static assets; `Octopod.load`, `MarineAnimals.create`, asset primitives | Up to 544 calls with instanced reefs already present; render submission dominates measurements. | High | Medium–Large | Medium | Attribute calls to assets with a browser trace; offline merge compatible immutable primitives by material. Keep glass sorting, shader hooks, animation and shadow ownership intact. | Workload measured; improvement hypothesized. |
| 9 | Dense-scene triangle/shadow workload; habitat/terrain/assets, `UnderwaterAtmosphere` shadow light | 6.26M triangles in reef, up to 6.83M in collision-area pose; moving light requires current shadow data. | High | Medium–Large | Medium–High | Profile main versus shadow passes on real GPU; evaluate equivalent shadow caster proxies or asset topology optimization with image comparisons. Keep resolution/shadows/LOD distances unchanged by default. | Workload measured; GPU bottleneck and improvement unconfirmed. |
| 10 | Vehicle residency churn near visibility boundary; `DiscoveryFleet.update/restoreVisible`, `releaseVehicleGPU` | 500 ms checks evict beyond 160 m and prepare again on reentry. Texture source caching is already present. | Medium on boundary crossings | Small–Medium | Medium | Trace repeated crossings/switches; consider small hysteresis or time grace, with a bounded GPU budget and mobile memory tests. | Hypothesized; no leak or measured upload hitch established. |

## Benchmarks and methodology

`tools/performance-audit.cjs` uses the already bundled Playwright package and installed Microsoft Edge 156, headless, at 1280×720 / device scale 1, high quality with unchanged antialiasing/shadows. `quality=high&benchmark` fixes the quality/pixel ratio at 1 for comparisons; adaptive resolution does not influence results. `inspect` diagnostics are enabled consistently in both timing runs. This matches a DPR-1 display; no source setting was reduced.

The harness waits for startup, stops the ordinary animation callback, then calls the main simulation/render subsystems with deterministic 1/60 s steps and requestAnimationFrame scheduling. Each scenario has 30 warmup and 120 measured updates. Mutation counts cover all 150 updates. It times CPU calls with performance.now, records inter-callback elapsed time, final renderer counters, collision metrics and Chromium heap estimates. Baseline was recorded before source changes; staged `after-ui.json`, `after-instances.json` and `final.json` preserve intermediate results. The final run was repeated without another browser audit running concurrently.

These are **subsystem replay measurements, not full-game FPS benchmarks**. Input/audio/discovery/modal dispatch, pickup updates, some HUD and RenderMetrics work are excluded from the timed replay. Camera/vehicle pose updates are included in elapsed frames but not separate cost columns. Several authoring positions are selected by teleport; that is a QA operation, not a gameplay change. The animals pose is anchored to one discoverable animal, not a worst-case crowd. The collision-area replay reports zero final contact hits after initial separation and is not a sustained collision stress benchmark. Letter animation/collection and direct escort updates are exercised, but modal discovery and full rescue delivery cycles were not benchmarked. Separate normal-loop smoke and forced collision checks supplement this coverage.

| Scripted scenario | Baseline mean / p95 elapsed ms | Final mean / p95 elapsed ms | Baseline calls | Baseline triangles |
|---|---:|---:|---:|---:|
| Near Octopod | 7.35 / 10.0 | 6.94 / 7.4 | 309 | 2,458,824 |
| Dense reef | 7.81 / 9.1 | 7.42 / 8.3 | 513 | 6,262,638 |
| High-speed drive | 7.17 / 7.9 | 7.30 / 8.1 | 176 | 791,938 |
| Animal-area pose | 7.67 / 8.9 | 7.28 / 8.1 | 544 | 4,445,752 |
| Repeated sediment bursts | 7.64 / 9.0 | 7.28 / 8.3 | 496 | 6,262,172 |
| Collision-area pose | 7.73 / 9.2 | 7.39 / 8.3 | 518 | 6,828,518 |
| Letter-area pose | 7.22 / 8.9 | 6.95 / 7.5 | 337 | 2,772,164 |
| Direct escort | 7.13 / 8.5 | 6.95 / 7.5 | 338 | 2,420,418 |

All eight final draw-call and triangle counts equal baseline exactly. Mean elapsed time across the eight scenarios was 7.465 → 7.189 ms (3.7% lower in this run). This small, uncontrolled single-run difference is **not a reliable FPS improvement**: the high-speed scenario regressed slightly and staged means varied from 7.399 to 7.553 ms. Headless scheduling is not display presentation timing; no displayed FPS claim is made.

| More directly attributable metric | Before | After | Change |
|---|---:|---:|---:|
| Total compass mutations / 1,200 updates | 64,673 | 9,975 | −84.6% |
| Stationary Octopod compass mutations / 150 updates | 7,534 | 119 | −98.4% |
| Mean compass CPU call time, eight scenarios | 0.175 ms | 0.120 ms | −31.7% in sampled run |
| Static instance attribute version increments, desktop equivalence sequence | 8,466 | 2,272 | −73.2% |
| Static instance attribute version increments, mobile equivalence sequence | 4,323 | 1,353 | −68.7% |

Attribute version increments measure dirty/update requests, not bytes transferred or completed GPU work. The equivalence sequence includes camera turns, stationary repetitions, near/far LOD transitions, disappearing batches and reentry. It compares original and optimized code in the same browser with exact active-buffer equality. It differs from the timed replay and should not be combined into a whole-game speedup percentage.

Renderer geometry counts progressed from 1,224 to 1,243; textures stayed at 114 in both baseline and final. GPU resources initialize lazily as new views become visible, so that increase alone is not a leak. Heap was ~224 MiB at baseline start/end versus ~316 → 222 MiB in final; garbage collection/startup timing makes these non-comparable for leak conclusions. GPU elapsed time, GPU memory, actual upload bytes and mobile hardware power/thermal behavior were not measured.

## Implementation and verification

Production changes:

- `src/environment/staticInstances.js`: shared immutable-record slot cache, dirty range tracking and count updates; compact helper with no rendering policy changes. Assumes placement matrices/tints remain immutable, as they currently do. Future runtime placement editing must invalidate cached slots.
- `src/environment/OceanDecorations.js`, `src/environment/ReefHabitat.js`: use the helper; selection, ordering, LOD and shader uniform updates remain unchanged.
- `src/navigation/Compass.js`: compare DOM values before writing, hoist attribute writer, stop reassigning immutable target IDs.
- `src/game/Game.js`: boost-class transition guard prevents repeated body mutation events.
- `src/environment/RenderMetrics.js`: gate diagnostic traversal/CPU timing on inspect mode while retaining resolution sampling.

Verification completed:

- `node --test tests/*.test.js`: **258 passed**, no failures. New tests exercise unchanged slots, reorder/removal/reentry, matrix-only batches, pending upload ranges and non-inspect diagnostic gating with adaptive sampling.
- `python tools/build.py`: passed, including production GLB header/length validation and module versioning.
- `git diff --check`: passed.
- `tools/verify-performance-audit.cjs`: 66 exact instance-buffer/count comparisons and 40 original-versus-current compass DOM comparisons, on both high desktop and low mobile-emulation profiles. No browser page errors.
- Both profiles run the real Play/animation loop with forward input before equivalence checks. Direct escort renders, letter collection succeeds and forced Octopod overlap resolves with six recorded collision hits. These are smoke tests, not comprehensive control/mobile-touch/rescue-delivery tests.
- Staged browser timing runs produced no page errors, with all final calls/triangles equal baseline.

## Reproduction

From the repository root, run `python -m http.server 5173` in a separate terminal. The bundled runtime provides Playwright; no npm install or browser download was required. In this environment:

```powershell
$env:NODE_PATH='C:/Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
node tools/performance-audit.cjs docs/performance-audit/repeat.json
node tools/verify-performance-audit.cjs
node tools/verify-performance-audit.cjs --mobile
node --test tests/*.test.js
python tools/build.py
```

Run timing scripts sequentially, with other browser/CPU work idle. The verifier loads original modules from the saved revision via local Playwright routing; it does not revert or alter working files. The scripts require the original Git revision to remain available. Benchmark JSON records user agent, viewport, pixel ratio, counters and per-system mean/median/p95 costs.

## Remaining work and limits

The highest potential larger win is reducing measured draw/triangle load without changing appearance. Start with a real hardware browser CPU/GPU trace that attributes main/shadow calls to individual assets, then investigate offline compatible-mesh merges and equivalent caster geometry. Follow with actual buffer transfer profiling before optimizing dynamic fish/particle attributes. Do not change animal update rates further without movement/discovery tests: those systems already throttle and share physics state.

Use longer real gameplay routes on desktop and physical mobile devices for sustained collisions, packed moving groups, modal discoveries, notice placement during boosting, vehicle residency boundaries, repeated vehicle changes, escort delivery and context restoration. Capture GPU timers and presented frame percentiles where supported. No Safari/iOS, Android GPU, touch interaction, long-session leak, thermal, or screenshot/pixel comparison has been completed. Exact instance buffers, DOM comparisons and existing tests provide strong evidence for the localized changes, but do not replace those device checks.
