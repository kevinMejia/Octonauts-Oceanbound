# Single reef overpass prototype

One agent implemented and reviewed this work; no subagents or independent QA ran.
Branch `feat/reef-overpass`. User subsequently authorized delivery to main; commit, selective application to main and push proceed
under that instruction. Physical device verification remains outstanding.

## Placement and implementation

Current seeded world: center x=440, z=360. Placement reference y=15.1104231 is
maximum terrain height in the sampled approach footprint, not seabed height at
center. Span center rises 24–27 m above this reference; highest stone is about
45.6 m, just below mean sea level 46. Formation is approximately 74 m wide,
24 m deep and 31 m tall. Central opening has roughly 25 m horizontal clearance
between supports, with approximately 20 m vertical clearance (varies by contour
and seabed). Passage runs north/south. Approach from z=295 or z=425 along x=440;
GUP-X follows the original sand. Terrain is untouched.

`reefOverpassConfig.js` enables this single prototype by default. Set
`enableReefOverpass:false` or use `?reefOverpass=off` to instantiate zero new
meshes/colliders. No saved preference or player toggle. Placement searches a
bounded configured region, rejects existing solid scenery, checks terrain relief
and gradients over the approach, and excludes configured objective locations and
their direct corridors to the Octopod. Existing fleet anchor conversion, pickup
layout, terrain sampler and collision grid are reused. Failure returns no placement
instead of forcing an unsafe structure. Exclusions protect direct objective routes;
they cannot guarantee separation from every route a player may choose.

Two irregular, overlapping layered supports and a curved seven-piece crown are
merged into one static rock mesh, with shallow grooves, vertex tone variation and
the shared reef stone texture pair. Twenty-four static branching coral instances
reuse existing reduced reef geometry, with one owned color material. Existing
nearby sea plants remain; no new animated vegetation is added. Fifteen matching
ellipsoid solids enter the shared vehicle/camera grid. Existing collision response,
damage and camera handling apply. No dynamic lights, shadows casters, particles,
transparency or renderer settings were added. Ordinary mesh frustum culling and
bounded distance visibility are used. `dispose()` removes solids and owned GPU
resources idempotently; borrowed coral geometry and shared stone maps survive.

Relevant files: `src/environment/ReefOverpass.js`, `reefOverpassLayout.js`,
`src/config/reefOverpassConfig.js`, `src/game/Game.js`, and a source reference
export in `OceanDecorations.js`. `RenderMetrics.js` additionally exposes mean/max
frame intervals and frames over 50ms in its existing `?inspect` dataset. Existing
FPS, draw calls, triangles, geometry and texture counters remain available.

## Equivalent-view desktop measurements

Before implementation, inspected existing `RenderMetrics`, `PerformanceDisplay`,
adaptive resolution, quality profiles and prior collision/turning reports.
The original environment can be measured with the construction flag off.
Final measurements use actual headless Edge WebGL on this Windows host, 1280×720,
DPR 1, separate low/high profiles, fixed camera (448,28.1104,422) looking toward
(440,30.1104,360), fixed simulation, 60 warmup and 180 measured frames. Existing
benchmark override pins DPR equally in both cases; normal adaptation is unchanged.
`gl.finish()` synchronizes render completion. Frame intervals/FPS below describe
this controlled render loop, including synchronization, not normal gameplay FPS
or isolated GPU timings. All draw/triangle counters include existing multi-pass
rendering. Separate page loads and OS scheduling introduce variation; a lower
high-profile time is not an optimization claim. Raw samples summarized in
`metrics.json`; audit procedure in `tools/overpass-audit.cjs`.

All table pairs are disabled / enabled.

| Profile | Render-loop FPS | Mean ms | P95 ms | Maximum ms | Draws | Triangles | Geometries | Textures |
|---|---|---|---|---|---|---|---|---|
| low | 59.36 / 58.05 | 16.85 / 17.23 | 17.80 / 18.10 | 27.20 / 25.90 | 2259 / 2263 | 5,027,197 / 5,232,061 | 1190 / 1191 | 113 / 113 |
| high | 47.51 / 49.55 | 21.05 / 20.18 | 26.20 / 21.80 | 29.30 / 27.90 | 2291 / 2295 | 5,644,905 / 5,849,769 | 1241 / 1242 | 114 / 114 |

Low mean increases 2.25%; high mean decreases 4.12% within run variation. Both
meet the requested 5% target in this limited sample. High synchronized render
maximum rises from 29.1 to 33.7ms despite lower mean; no measured frame interval
exceeds 50ms. Other exploratory runs had larger variation, including a low-profile
outlier above target; these results do not establish a universal 5% bound.

## Verification and limits

- `node --test tests/*.test.js`: 378 pass. `npm` is absent in this shell; this is
  the exact test script's underlying command. No lint script is configured.
- `python tools/build.py`: pass, including GLB headers/length validation.
- `git diff --check`: pass.
- New tests cover deterministic single placement, blocked/unsafe rejection,
  disabled flag, all nine hulls in both directions above/below, solid support/span
  rejection, and actual controller GUP-X drives through both approaches.
- Actual Edge scripted camera checks cover 18 fleet/direction routes, including
  GUP-X following the original slope (about 3.75 degrees maximum pitch). Camera
  never enters a rock. Cleanup twice restores solid count without disposing
  shared geometry/material. Details in `gameplay.json`.
- Edge low/high enabled/disabled loads: ready, no page errors. Screenshots in this
  folder were inspected. Production enabled/disabled smoke is also run separately.

No physical iPhone/Safari validation, sustained gameplay performance, maximum
saved camera offsets/full orbit sweep, full mission/towing/turbo/docking playthrough,
or manual fleet switching at every contact has been established. Existing systems
were preserved, and protected placement reduces interaction risk. Collision follows
ellipsoid envelopes rather than small visual grooves/coral branches; decorative
coral stays passable. Visual approval remains a user playtest decision.

For iPhone: serve the same production build; keep identical saved settings,
vehicle, orientation, camera and day phase; enable existing Show performance display.
At x440/z360 compare enabled and `reefOverpass=off` after warmup for at least 60s
across three alternating runs. Record mean/P95/max and spikes using `?inspect`
renderMetrics dataset (Safari remote inspector), plus draws/triangles/geometries/
textures and DPR. Leave ordinary renderer settings untouched; record adaptive DPR
changes rather than attributing resolution changes to the overpass. Drive both
ways with GUP-X and largest hull, orbit below crown/around supports, test turbo,
towing and switching, then visit repair/docking and reload with the flag off.
Simplify if repeatable visible-view mean cost exceeds 5% on that device.
