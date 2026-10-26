# GUP-X terrain-aware chase camera

## Root cause (investigated before implementation)

The existing chase camera already constructs its offset from vehicle heading and
manual orbit, with world-up as the look reference. It does not inherit hull pitch,
roll, or render-only tread suspension. Those transforms are not the fault.

GUP-X previously only multiplied the shared chase distance by 1.4 and height by
1.3. Its roughly 24 m arm remained almost flat relative to world-up on a descent,
intersecting the higher slope behind it. `CameraObstacles.limit` then pulled the
camera toward a low hull pivot instead of elevating the arm. At existing terrain
position (132,132), downhill heading 2.1663852594 radians, the planner reproduced a
36.62 degree slope: a 24.90 m arm was reduced to 1.665 m by `terrainEntry`, before
collision padding. This is a numerical reproduction, not a rendered observation.

The hard terrain endpoint-height clamp after smoothing and quaternion snap when
the obstruction limit fell below .98 amplified the collapse/recovery at slope
transitions. The fixed 1.5 m look-ahead and fixed vertical target also ignored
terrain ahead. There is one camera controller, so competing controllers were not
the cause.

Independent QA then identified a separate missing visibility condition in the
first implementation: a clear hull-to-camera arm does not ensure that the road
beyond a convex slope is visible. At the same (132,132) downhill pose, 2–10 m
forward ground points projected inside the image while their eye-to-ground rays
still passed through the intervening hill. Focus/frustum checks alone missed it.
Focused failing line-of-sight tests were added before addressing this finding.

The tracked movement controller remains ground-bound and sets vertical velocity
to zero. Airborne camera tests use synthetic trajectories; this change does not
add jumping or alter driving physics.

## Implementation and verification

Only GUP-X opts into `gupXCamera` through its existing vehicle camera profile.
`ChaseCamera` remains the sole controller. Its existing underwater branch retains
its previous position, target, collision, FOV, and orbit behavior.

The ground branch elevates the heading/orbit arm until its sampled segment clears
terrain, rather than shortening that arm into the hull. It checks both desired
and final smoothed segments. A short prediction along signed travel reserves
height before a crest reaches the pivot. Solid structures still use the existing
expanded-ellipsoid sweep and immediate contraction; fixing terrain does not allow
the camera through the Octopod or rocks. Terrain clearance takes priority if a
steep slope requires more height than the ordinary water-surface camera cap.

The final ground solve also samples near/far forward-road sight lines before and
after position smoothing. Its visual lift is separate from hull safety: a 50°
ground-preview angle bound and 10 m/s lift-bias rate prevent the mathematically
unbounded response when a far point first crosses behind a sharp ridge. Immediate
terrain safety remains independent. After solid contraction, vertical road-view
recovery is accepted only if both its movement and the new hull arm clear solid
proxies. Extreme manual views or blocking structures can still hide distant road;
the camera preserves safety and hull framing instead of crossing solids or
forcing an overhead view. Far terrain beyond an unseeable crest opens as the
vehicle approaches; it is not made visible by hiding scene geometry.

Horizontal position, camera height, and terrain/steering aim biases have separate
exponential response rates. Ground orientation derives from that smoothed pose
with world-up; it does not add the old second quaternion lag or obstruction snap
for normal terrain adaptation. The target follows actual hull elevation while
the bounded terrain bias is damped, including synthetic flight and landing.
Manual orbit and the existing delayed critically damped return remain shared.

GUP-X tuning is in `src/config/cameraConfig.js`: 1 m terrain clearance plus .15 m
sampling padding, 1.7 m pivot/aim height, 3.5–5 m terrain look-ahead, .7 s travel
prediction capped at 6 m, at most 1.4 m steering prediction, and at most 8% extra
speed distance. Distance and height preferences retain their existing multipliers;
a 14 m minimum ground arm before aspect adjustment protects hull framing at the
closest saved setting. The original common defaults are unchanged.

No meshes, physics, assets, additional render passes, or dependencies are added.
New vectors are constructor-owned. The frame path uses scalar math and bounded
terrain samples with no new arrays/objects. Hull-arm solves use at most 64
samples, road-view solves at most 24. Normal moving follow is capped at three
arm solves, four view solves, and five other height samples (293 total).
Stationary follow is capped at 228 samples. A solid-constrained recovery adds
one arm and two view solves (405 maximum total). These are tested worst-case
budgets, not device benchmarks; there are no unbounded terrain iterations.

A local Node camera-only timing probe used the real terrain near (132,132), an
empty solid grid, 2,000 updates per round, five measured rounds after warmup,
and no rendering. Median update cost was approximately .082 ms for the new
ground branch versus .015 ms for the previous shared chase. The extra sampled
visibility work has measurable CPU cost; this container microbenchmark does not
predict iPhone frame pacing, GPU load, or full-game frame rate.

Developer verification:

- `node tests/gup-x-camera.test.js`: 15 focused cases passed. They exercise the
  production `ChaseCamera` and vendored Three.js using a test-only module URL
  adapter, not a replacement camera implementation.
- Coverage includes gentle/40° climbs and descents; the actual (132,132) slope and
  (136,127) starting-biome hill; sharp crests/deep valleys; stopping/reverse;
  turning; synthetic flight/landing; manual orbit/recenter; fixed 30/60/120 Hz and
  mixed 20–120 Hz frames; saved distance/height extremes; landscape/portrait
  geometry; total frame sample budget; and solid-structure contraction/recovery.
- The curved real-terrain regression checks forward ground at 2/3.5/5/10 m,
  plus a 1.5 m wide corridor at 5/10 m, in three aspect ratios and moving turns.
  Dense independent ray samples verify terrain visibility in the final pose,
  including after solid contraction. Default viewing pitch stays below 50°.
- Turbo sharp-crest/valley trajectories run at 20/30/60 Hz. The 60 Hz crest probe
  peaks at about .82 m vertical change and .028 radians per frame; at 30 Hz,
  about 1.65 m and .051 radians. These deliberately discontinuous synthetic
  support profiles also test frame-time-scaled motion/rotation bounds.
- Geometry assertions project all eight oriented hull collision-box corners,
  check terrain clearance densely along the camera arm, and bound consecutive
  crest/valley movement and rotation. Fixed-frame moving-trajectory differences
  remain under .2 m / .015 radians; mixed-frame differences under .25 m / .02
  radians. These are explicit test tolerances, not measured hardware performance.
- Six pre-change production snapshots (GUP-B/A/R with and without manual orbit,
  including terrain/solid collision code) match resulting camera positions,
  quaternions, targets, and FOV to 1e-12. The fixture was captured from the original
  `ChaseCamera` before editing it, on base commit `c614331`.
- `npm test`: all 55 test files passed (the existing runner reports file-level
  results). `npm run build`: passed, including GLB validation and production
  module versioning. `git diff --check`: passed.

## Independent QA and rendered checks

Real subagents performed planning (`gup_x_project_manager`), implementation
(`gup_x_game_developer`), and independent review (`gup_x_qa_engineer`). They read
the project role instructions explicitly; the host did not select named TOML
roles automatically. QA found the initial forward-terrain visibility gap, then
independently verified the fix, all 55 test files, 15 focused cases, build, and
exact regeneration of the six underwater fixtures. Additional independent probes
covered 80 actual-terrain sightlines, 30 planar sightlines, and 64 orbit/frustum
cases. No blocking camera-code findings remain.

The coordinator ran actual local Chromium with the real game, model, terrain,
and collision systems at 844 × 390. Scripted uphill/downhill driving, reversing,
turning, orbit, and return-to-follow poses passed hull-frustum and terrain-ray
checks. A real mouse drag updated the orbit, retained manual control through
release, and returned to zero after the delay and damped return. No page errors
were observed. These are desktop Chromium results, not iPhone tests.

Final captures explicitly waited for the startup overlay to detach and for two
animation frames after rendering. No scenery was hidden or modified:

- [Clear downhill view](rendered-clear-downhill.png), on a 28.86° slope at
  (122,119), shows the vehicle and terrain ahead. The uphill view was inspected too.
- [Very steep uphill view](rendered-steep-uphill.png), at (136,127) on a 41.42°
  slope, shows the vehicle and upcoming grade.
- [Existing reef overlap](rendered-reef-overlap.png), at the original (132,132)
  downhill location, records the remaining partial decorative occlusion rather
  than concealing it. The terrain-induced collapse is gone, the camera arm is
  about 29.46 m, and forward terrain sightlines are clear. Some rendered coral
  and vegetation are not represented by the existing simplified solid proxies,
  so the entire hull is not guaranteed unobstructed by decorative scenery.

[Scene diagnostics](browser-scenes.json) and [very-steep diagnostics](browser-steep-scenes.json)
record final poses and center-ray mesh hits. All tested static poses had zero
physics-overlap hits; the original location must not be described as an invalid
spawn. Center rays hit vehicle meshes first, which does not prove every hull
pixel is unobstructed. An earlier capture attempt included the startup overlay
and was rejected; it is not used as evidence.

Automated geometry does not establish subjective driving feel, WebGL/mobile
performance, or real touch behavior. At extreme saved minimum distance/height,
narrow FOV, and portrait side orbit, hull corners can still crop; default settings
and the documented automated orbit cases pass. Physical iPhone Safari testing
is still needed: drive both directions across steep hills, crests and valleys;
stop/reverse and steer on grades; orbit during a transition and release; check
landscape/portrait framing, simultaneous steering/orbit touch, and sustained frame
pacing/thermal behavior. Repeat underwater GUP driving/orbit after switching back.
