# Underwater environmental interactions

## Implementation

The submarine's existing three-point terrain clamp now reports clearance, pre-clamp downward impact speed, contact and sampled floor height. The equations controlling movement are unchanged. Sediment uses those values, horizontal speed and signed heading: no wake above 2.8 m hull clearance, none below 0.45 m/s, progressively stronger near the floor. A contact transition emits one impact-scaled puff, with a 0.6-second guard against repeated dune bumps. Scraping uses continuous rate accumulation, not per-frame explosions. Signed velocity puts reverse wakes behind the direction of travel too.

Four fixed instanced batches render clouds, grains, chips and branching fragments. Idle batches draw nothing. Clouds use a small procedural noisy silhouette, soft edges, layered opacity, smooth expansion, underwater drag/current, lift and settling. Their instances are sorted back to front. Single-pass transparent planes write no depth, retain depth testing, inherit scene fog, and fade near their sampled floor. This is an inexpensive approximate intersection fade, not a full scene-depth soft-particle pass; intersections with complex rock silhouettes can remain. No post-processing, render targets, textures, fluid simulation or rigid bodies were added.

Particles use preallocated reusable records and fixed typed GPU buffers. Fragments share faceted chip geometry; a small three-branch mesh distinguishes branching coral. Their colors come from the impacted authored coral's linear vertex colors. Underwater drag slows falling/tumbling pieces. They settle on terrain or nearby simplified rock tops and shrink away near expiry. These are temporary visual fragments; formations are never destroyed.

`assets/blender/scripts/export-interaction-surfaces.py` exports bounding proxies, type and color from the existing editable Blender assemblies into `assets/models/reef-formations/interactions.json`. Run it with Blender after rebuilding the formation library. No duplicate environment geometry is exported. The runtime transforms the proxies with the same module placements and indexes them in an 8 m spatial grid. Nearby coral contacts use a swept three-sphere hull approximation, not triangle raycasts. Rock effects consume existing foundation collision corrections; loose scenery outside the habitat uses cached bounds for cosmetic contact. Surface proxies are intentionally approximate, particularly around intricate branches.

Nearby vegetation bends through shared shader uniforms with root weighting and smoothly damped movement strength. It produces no chips. Existing scenery sway, camera, lighting, controls and collision constraints remain in place. Rock-only dust and coral particulate use much smaller clouds than sand impacts.

## Central tuning

All tuning lives in `src/config/interactionConfig.js`; no new player menu was added.

| Parameter | Meaning / default |
|---|---|
| enabled | Master switch, true |
| qualityLevel | auto follows existing quality, or high / low effects-only override |
| renderDistance | recycle effects farther than 65 m from sub; batches also frustum culled |
| sediment.enabled | sand wake and impact switch |
| proximityDistance | 2.8 m above the actual hull floor constraint |
| proximityIntensity / speedInfluence | emission multipliers, both 1 |
| impactIntensity | touchdown severity multiplier, 1 |
| density | continuous wake emission multiplier, 1 |
| cloudLifetime | 5.5 s base, modest randomized variation |
| cloudExpansion | 0.65 m/s radius growth before billboard scale |
| settlingSpeed | 0.06 downward acceleration after initial lift, with water drag |
| maxClouds / lowClouds | hard pool limits 96 / 40 |
| maxParticles / lowParticles | heavy sand grain limits 160 / 64 |
| debris.enabled | rock/coral fragments and fine contact dust switch |
| coralFragmentCount / rockFragmentCount | full-severity counts 5 / 4, fewer for light contact |
| fragmentLifetime | 6 s base, randomized slightly |
| collisionThreshold | minimum contact movement speed 0.65 m/s |
| contactCooldown | at least 0.24 s between reef emissions during sustained scrapes |
| maxFragments / lowFragments | shared rock/coral hard limits 48 / 20 |

When a pool is full, new particles are skipped. All particles expire, so effects cannot accumulate indefinitely. High quality caps total records at 304; low caps them at 124. The existing coarse-pointer default chooses low quality. Configured visual density does not change gameplay physics.

## Verification and measurements

Desktop Chromium in-app browser, October 22, 2026, 1280x720, DPR 1. Raw JSON and real gameplay PNGs are beside this report. Baseline was captured before implementation. Additional `?inspect=1&effects=off` comparisons disable cosmetic updates while retaining the same build and terrain. Hidden `#interactionMetrics` reports active counts, contact state and cumulative emission events only in inspect mode.

| Sample | median / p95 frame ms | median FPS | CPU submit ms | GPU render ms | calls | triangles |
|---|---:|---:|---:|---:|---:|---:|
| Before, idle at spawn | 7 / 7.1 | 142.9 | 1.2 | 1.90 | 135 | 2,502,386 |
| After, idle at spawn | 7 / 7.1 | 142.9 | 1.4 | 1.52 | 135 | 2,502,386 |
| High, route effects off | 7 / 7.1 | 142.9 | 1.5 | 1.99 | 135 | 2,616,720 |
| High, active sand wake | 7 / 7.1 | 142.9 | 1.6 | 1.18 | 136 | 2,552,513 |
| Low, route effects off | 7 / 7.1 | 142.9 | 1.1 | 1.17 | 125 | 1,911,577 |
| Low, active sand wake | 7 / 7.1 | 142.9 | 1.3 | 0.95 | 125 | 1,906,070 |

Route samples use the same 1.7-second descent and 2.2-second forward/down input sequence. Browser timing slightly changes final positions and scenery LOD/frustum counts; total calls/triangles therefore are not a pure effect delta. GPU frequency and sampling variation are substantial: lower sampled GPU time does not mean the new effects improve GPU performance. FPS was refresh limited; these are spot checks, not a sustained thermal benchmark. The final cloud material additionally uses single-pass double-sided rendering, limiting all effect batches together to four main-render calls (sand normally two). No extra effect shadow passes are enabled.

Visible geometry buffers remained 27.87 MiB idle; active route samples were 32.12 MiB high and 17.49 MiB low including scenery LOD changes. Texture counts stayed 9 / 8. Browser JS heap snapshots varied roughly 65–222 MiB across tabs/GC and are retained in JSON, not interpreted as an allocation delta or full VRAM. CPU submit includes game and renderer work, not total browser CPU. GPU uses asynchronous disjoint timers. Low active mean FPS was 137.3 despite 142.9 median, including occasional transition/compilation frames. No significant steady frame-time regression appeared here. Actual iPhone Safari performance, thermal behavior and touch verification remain outstanding; desktop low quality is not an iPhone benchmark.

Observed in the actual game:

- At spawn, 5.45 m clearance: zero clouds, grains and fragments.
- Touchdown: one sand event, 8 clouds and 17 grains; holding still did not continuously burst.
- Moving along dunes: continuous layered trail, 36 clouds and 39 grains in one high-quality sample.
- Main outcrop collision: rock event with 4 fragments and small dust, with existing rock constraint still active.
- Brushing a coral patch: colored chips/branch pieces and small particulate; 15 active fragments in the captured pass.
- After movement stops and lifetimes expire: all three pools return to zero active records.
- Camera orbit, forward movement and descent remain functional; browser checks reported no warnings/errors.

31 automated tests pass, covering existing controls/turbo/camera, sand emission/intensity gating, actual terrain contact telemetry, local swept surface lookup, pool exhaustion/recycling, underwater settling and authored type/color metadata. Static HTTP validation checks 26 production resources. Screenshots were used to strengthen the initially faint wake and fix an aliased fog-color uniform that had washed out distant terrain. Final screenshots retain the original turquoise fog.
