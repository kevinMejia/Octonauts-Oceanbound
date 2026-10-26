# Surface settling instead of flight

Branch: `fix/gup-surface-settling`. User authorized implementation, commit and
push. Primary agent only; no independent-agent QA. The earlier nighttime sand
cloud correction is isolated in local branch `fix/night-sediment-lighting`,
commit 1061597, and is not part of this change.

## Behavior

The original seamless-surface implementation retained swimming thrust and hover
up to 35 m above sea level. Swimming GUPs now transfer their upward velocity into
a small breach, then return gently to a stable waterline even if Rise stays held.
The hull gradually levels for surface cruising. Release thrust or continue sailing
at the surface; Shift/touch Dive releases the response so normal diving resumes.
GUP-X bypasses this swimming path and retains tracked ground behavior.

`surfaceMotion.js` is a helper inside the existing SubmarineController. The target
uses shared mean sea level minus the hull center offset and .2 m immersion. On
crossing that target, entry velocity is capped at 6 m/s and exact critically damped
integration (response 1.6/s) settles the hull without sustained airborne thrust
or spring bounce. A 6 m/s return-speed limit and 2 m breach guard handle outliers;
terrain clearance takes priority over the guard. Negative depth input and deeper
water clear the surface state. Selection resets the state; no per-frame objects,
additional controller, gravity/fluid solver, draw calls or render passes are added.

Behavior is configured in `submarineConfig.surface`; `worldConfig.aboveWaterHeight`
is now the 2 m safety guard, not a sky-exploration allowance. Deep swimming,
heading/bank, turbo charge, collision resolution and terrain queries keep their
existing paths. Splash detection now tests hull-center height, aligning with the
settling target so small GUP-R/A breaches still trigger the existing pooled spray.
Camera follow/orbit and its freedom to cross the waterline remain unchanged.
Physics uses the mean sea level to avoid wave-driven jitter; visual waves and the
camera's local animated waterline retain the existing implementation.

## Verification

- `node --test tests/*.test.js`: 354 passed. Coverage includes all eight swimming
  GUPs with held Rise at hover and infinite turbo, settling/release/dive, repeated
  breaches, underwater behavior, 30/60/120 Hz response equivalence, hull-centered
  splash emission, terrain clearance, GUP-X bypass and existing game regressions.
- `python tools/build.py`: passes. `git diff --check`: passes. No lint script is
  configured; npm is absent from PATH, so package-script Node/Python commands
  were run directly with Node 24 and Python 3.14.
- `tests/surface-settling-browser.cjs`: actual production Edge at 390x844 low and
  1280x800 high. All nine loaded GUPs switch successfully. Eight swimmers each run
  10 seconds of held Rise at hover and turbo, then dive for 3 seconds. Their peaks
  are 46.34-47.14 m versus sea level 46 m, and all settle within .00006 m of their
  configured target by the end of those scripted runs. GUP-X remains grounded on
  the real steep-slope fixture. Maximum chase-camera Y step is .196 m at simulated
  60 Hz across the tested turbo/ascent cases. No page/console/WebGL errors.
- Real held Space input breaches GUP-B to ~46.63 m and settles it to ~45.57 m;
  three seconds of Shift returns below ~35.5 m in both profiles. Orbit takes the
  camera underwater/above independently of the surfaced GUP and preserves medium
  blending. Raw JSON and actual floating PNGs are included here.
- Updated `tests/surface-browser.cjs` passes repeated ascent/dive legs, independent
  camera/vehicle media, reverse/cruise/high speeds, surface fleet switching,
  10/18-particle spray, real Space/Shift and pointer drag/recenter in both quality
  profiles. Its old 55 m switching fixture now uses 46 m. Historical captures in
  docs/above-water remain preserved; this report supersedes their flight behavior.

These are desktop Edge checks, including phone-sized layout, not physical iPhone
Safari or sustained FPS/thermal measurements. Full manual rescue/discovery
playthroughs were not repeated; the existing automated regressions pass. This is
an approximate surface constraint, not realistic buoyancy or vehicle-specific hull
physics. Extreme synthetic above-guard teleports may be numerically clamped.

## Manual test

Hold Rise/Space from underwater through a breach, continue holding it for several
seconds, and confirm the GUP settles instead of flying. Repeat while moving and
using turbo. Release Rise, steer across the surface, then hold Dive/Shift to return
underwater. Try each unlocked swimming GUP, switch at the surface and orbit above
and below water. GUP-X must continue driving on terrain and ignore Rise.

Changed files: submarine/world config, `SubmarineController.js`, new
`surfaceMotion.js`, `PropulsionWater.js`, controller/surface-motion tests, the
existing surface browser harness and new settling browser harness. README,
BACKLOG and above-water documentation identify the revised behavior.
