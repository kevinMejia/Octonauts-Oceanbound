# Animated underwater atmosphere

## Architecture and appearance

This extends the existing Three.js r168 scene, ACES/sRGB renderer, underwater fog, sunlight and sand caustics. There is one atmosphere controller; the old 60 m snapping/rotating particle field was removed. GUP-B movement, turbo behavior, camera, HUD, Octopod and sediment/coral effects remain intact.

Propulsion bubbles emit from local (0, −0.32, −2.55), just aft of the existing propeller at approximately local Z −2.35. The vehicle's full matrix transforms each emission into world space. Existing bubbles then retain their own positions: they decelerate out of the jet, rise with buoyancy, drift, shrink/fade and recycle. Forward and reverse motion both influence the jet. Emission stops below 0.35 m/s, builds through cruise and increases on boost; boost also adds lateral turbulence. Bubbles use small analytic point sprites with a translucent centre, soft rim and pale highlight, not individual reflective sphere meshes. No separate image assets are needed.

The same pooled point draw contains up to 12 optional soft world-space flow streaks. They appear only above 14 m/s (boost speeds), have short lifetimes, and fade. Their projected direction comes from their stored world direction; they are not a full-screen overlay. Ambient water does not accelerate when the submarine does.

Ambient particles use one static GPU buffer. A stable world lattice wraps around the camera, split between 12 m near and 32 m far volumes for useful parallax. Each layer fades to zero before its wrap boundary, hiding recycling. Slow independent shader drift, small size/brightness/color variation, depth attenuation and a surface fade keep the specks subtle. Existing field snapping, whole-field rotation and fixed world-height particle bounds are gone. No per-frame ambient position uploads or object creation are needed.

Sand, repeated reef rocks and coral share one caustic texture and shader helper. World-space projected coordinates follow the actual terrain and instanced formation transforms, with upward-facing weighting and attenuation from the established water surface at Y=46. High quality blends two gently warped samples; low uses one and excludes coral caustics. Existing normal maps, vertex colors, rock tint, foliage sway, material hooks, grain and reef occlusion are preserved. No extra geometry, lights, passes or shadow maps are introduced by caustics. Captured original shader cache keys are preserved when composing hooks.

The existing fog receives a small depth tint and at most 8% density gain. Sunlight loses at most 6% intensity with depth; reefs remain colorful. Faint surface-light bands are integrated into the existing sky dome in high quality. These are background cues, not volumetric shafts. Low quality skips their shader work. No post-processing or volumetric simulation is used.

All custom fog uniforms own their color copies, avoiding mutation of the scene's fog color during Three.js color conversion. Transparent effects retain depth testing, do not write depth, and maintain useful dynamic sort bounds. Small translucent bubbles can overlap without costly per-particle sorting; this remains an approximation around complex glazing and rock silhouettes.

## Configuration

`src/config/waterConfig.js` is the single tuning location. Distances are game metres, lifetimes seconds and rates per second. Rendering quality follows the existing high/low profile and coarse-pointer default. Old duplicate ambient particle and sand caustic intensity settings were removed from `environmentConfig.js`.

| Category | Settings and meaning |
|---|---|
| bubbles | enabled; emissionRate 10 at cruise; minSize/maxSize .035/.14 radius; buoyancy .85 target rise speed; lifetime 4.5 base with variation; speedMultiplier 1; boostMultiplier 1.35 emission gain; maxParticles/lowParticles 160/64; renderDistance 65 recycling/fade bound |
| ambient | enabled; density 0–1 fraction of budget; opacity .30; driftSpeed .035 current-amplitude reference; renderDistance 32 far half-extent; nearDistance 12; nearFraction .45; maxParticles/lowParticles 800/320; minSize/maxSize .018/.045 radius |
| motion | enabled; speedThreshold 14; streakIntensity .12 maximum alpha; maxStreaks/lowStreaks 12/0; lifetime .75 |
| caustics | enabled; intensity .34 sand baseline; animationSpeed 1; scale .075 texture repeats per metre; depthFalloff .006 attenuation rate; reefIntensity .4 multiplier for rock/coral surfaces |
| atmosphere | fogDensity .0072 baseline; fogColor #087a9e; depthTint #086e91; depthTintStrength .12; depthRange 46; lightShaftIntensity .025 high-quality background light-band strength |

Bubbles and streaks use the existing preallocated particle-pool infrastructure but dedicated motion rules; they do not inherit sediment settling or debris physics. Ambient GPU motion is separate again. High quality is bounded at 800 static ambient points, 160 bubbles and 12 streaks. Low caps those at 320, 64 and zero. Full pools skip new emissions, expired particles are recycled, bubbles fade/recycle before the water surface, and distant bubbles are culled. Water effects add at most one draw call during propulsion, while replacing the existing one-call ambient field. One shared caustic texture replaces duplicate GPU texture loads.

## Verification

47 tests pass, including all existing gameplay regressions plus speed/boost/reverse emission, bubble rise and expiry, surface recycling, stable world wrapping, depth attenuation and quality caps. Actual browser checks cover idle, cruise, a curved turn and boost (three active flow streaks in the captured pass). The low preset disables streaks. The real chase-camera screenshots are named `calm-water.png`, `cruise-bubbles.png`, `turning-bubbles.png` and `boost-flow.png`; `before.png` is the original atmosphere. No generated concept images substitute for gameplay captures.

The first pass was too sparse near the camera, so the fixed ambient budget was split into near/far layers rather than increasing it further. Surface fades and transparent sort bounds were refined after rendering checks. Shader compilation and browser logs were inspected. Actual iPhone Safari FPS, thermal behavior and multitouch remain unmeasured; testing the low preset on desktop is not a physical-device benchmark.

## Performance samples

October 22, 2026, desktop Chromium in-app browser, 1280 × 720, DPR 1. Baseline was captured before implementation. Idle uses the unchanged configured spawn; cruise holds forward for 3.3 seconds from that spawn. Raw JSON files retain additional memory and geometry statistics. These are representative samples during final tuning, not a controlled hardware or thermal benchmark.

| Sample | median / p95 frame ms | median FPS | CPU submit ms | GPU render ms | calls | textures |
|---|---:|---:|---:|---:|---:|---:|
| Before idle high | 7 / 7.1 | 142.9 | 1.4 | 3.85 | 129 | 9 |
| After idle high | 7 / 7.1 | 142.9 | 1.6 | 1.58 | 128 | 8 |
| Before cruise high | 7 / 7.1 | 142.9 | 1.5 | 3.90 | 131 | 9 |
| After cruise high | 7 / 7.1 | 142.9 | 1.6 | 1.38 | 132 | 8 |
| After cruise low | 7 / 7.1 | 142.9 | 1.2 | 0.84 | 126 | 7 |

GPU timings vary with clock state, browser scheduling and sampling; their decrease is not evidence of a GPU speedup. FPS is refresh limited. Total scene calls include culling/shadow variation; the water system itself replaces one existing ambient draw and adds one shared propulsion/flow draw while active. Visible geometry buffers changed 10.37 → 10.39 MiB idle and 14.63 → 14.93 MiB cruising, including scenery visibility/LOD variation. Heap snapshots ranged roughly 82–125 MiB with GC and are not per-feature allocations or total VRAM. CPU submit includes game updates and renderer submission, not overall browser CPU usage. No significant steady frame-time regression was observed in these samples.

Low-quality compatibility capture `bubbles-and-sediment-low.png` had 18 bubbles, zero flow streaks, 320 ambient points, 25 sediment clouds and 19 grains. Sand remained a separate warm cloud, bubbles used buoyant motion, and no browser warnings/errors were reported. Reef captures preserve the purple/pink coral and green vegetation under the shared animated lighting.
