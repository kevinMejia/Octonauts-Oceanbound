# Seamless ocean surface

Surface movement was subsequently constrained by the [surface settling fix](../surface-settling/README.md). The original 35 m hovering allowance described below is historical; swimming GUPs now breach briefly and settle at the waterline.

The old controller ceiling was sea level (46 m) minus hull clearance; the chase
camera also clamped to 45 m. `worldConfig.surface` remains the shared mean sea
level. Swimming controllers now allow 35 m of air exploration, while tracked
GUP-X and seabed/solid collision remain unchanged. Safe swimming fleet placement
accepts above-water poses; parked fleet placement keeps its underwater limit.

The existing atmosphere owns the same scene, lights, dome and surface mesh.
Camera height against a small analytic wave drives a smoothstep blend across
3.2 m: blue sky/horizon, fog density/color, light intensity, ambient particles,
propulsion effects and sun rays. Depth tint now also follows the camera. The dome
follows the camera in all axes. No movement mode, renderer, scene or control is
added. Below water the surface retains its original translucent cyan caustics;
above it gains a blue distant-ocean tint and near-opaque coverage.

The existing two-sided surface uses two sine waves and one existing caustic
texture sample. Camera-centered coverage extends beyond the far clip at every
map position. Waves use world coordinates so the pattern does not follow the
GUP. Low uses 8,192 triangles, high 18,432, in the existing one surface draw with
forceSinglePass. Surface rendering precedes transparent hull glazing/effects.
No render target, new texture, dependency or per-frame mesh allocation is added.

Crossing hysteresis rejects wave chatter. A short ballistic spray shares the
existing 128/240 particle pool and draw call; a dive adds buoyant bubbles. Counts
remain bounded and teleport/switch resets avoid false crossing bursts. Existing
underwater-only bubble/streak/ambient/ray visibility fades with camera medium;
ambient particles also retain their spatial waterline clipping.

## Verification

Node 24: `node --test tests/*.test.js` passes 340 tests, including updated ceiling,
repeated swimming crossings, local-wave camera blending and existing gameplay
regressions. `python tools/build.py` passes. `npm` is absent from PATH; these are
the exact commands used by its scripts. `git diff --check` passes.

`tests/surface-browser.cjs` exercises the production build in actual headless Edge
at 390x844 low and 1280x800 high. It covers four deep-to-air/dive legs, camera above
while hull below and vice versa, reverse/cruise/high speed near the waterline,
orbit across water, swimming fleet switches above water, bounded splash emission,
real Space/Shift input and real pointer drag/recenter. No page/console/WebGL errors
were observed. The scripted hovering ascent's maximum camera Y step was 0.0834 m
at 60 Hz. Both above-water switches retained y=55. Crossing bursts were 10/18
particles. Captures are actual gameplay, not generated art.

Implementation ran in the main session; a real independent qa_engineer reviewed
the diff and ran all Node tests/build. Its transparent sorting finding was fixed
and independently re-reviewed. No merge, push or deployment was performed.

## Remaining limits

Physical iPhone Safari, actual touch input, sustained FPS/thermal performance and
full manual rescue/discovery playthrough remain unverified. Phone-sized desktop
Edge is layout/WebGL evidence, not a phone benchmark. Camera reset's existing
settings path is unchanged and covered by existing tests; this task does not
claim a new manual settings-reset test. Existing underwater transformation bubble
shells expire in air; their core vapor remains. No buoyancy or flight physics is
added. Waves are a visual approximation: mesh interpolation differs slightly from
the analytic camera blend, masked by the transition band. Water has no refraction,
real reflections or per-pixel clipping of partially submerged transparent hulls.
