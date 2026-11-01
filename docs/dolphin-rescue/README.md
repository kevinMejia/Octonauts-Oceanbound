# Dolphin Rescue

Dolphin Rescue is registered in `game.missions` and opens from the projected dolphin
badge beside the Octopod. A briefing launches Kwazii’s GUP-B; Exit, failure and
completion offer a return, and the badge stays available for replay.

## Repository audit and implementation

Oceanbound is a static Three.js r168 ES-module game, composed in `Game.js`. It has
no separate scene manager or external rigid-body engine. This mission keeps that
architecture: the existing `SubmarineController`, `ChaseCamera`, `CollisionWorld`,
`InteractionSurfaces` grid, GUP-B asset, `AnimalVisual` dolphin and swim animation,
sand material, caustics, ambient particles, lighting, input, audio and pause tokens
are reused. Contact impulses and exponential drag follow the established parked
GUP interaction. There were no existing litter models or generic mission UI.

The implementation adds a registered mission owner, deterministic escort/obstacle
state, pooled debris proxies, instanced bay art and a compact HUD/dialog. The main
frame loop branches only while the mission is active. The exploration controller,
vehicle, visibility, camera ground/profile/orbit and atmosphere vent references
are restored on return; fleet ownership and discovery/rescue saves are not changed.
Exploration systems stop updating during the mission. Gameplay-changing settings
and fleet UI are hidden until return. Terrain height is injected into the shared
controller/camera/collision queries so the independent flat bay never collides
with invisible exploration hills.

All mission tuning is in `src/config/dolphinRescueConfig.js`. The default route is
600 metres at a 4 m/s current: 150 active simulation seconds, including a 70 metre
clean-water release area. The escort advances even without thrust and influences
its lateral formation gently from the GUP. Existing steering, forward/reverse,
rise/dive and orbit controls remain available. The current and bounded lead keep
the GUP near the dolphins; turbo is disabled for this mission.

There are eleven procedural, palette-colored litter types: boxes, crates,
bottles, containers, tires, boots, cans, nets, ropes, planks and household objects.
They are merged per type and instanced in spatially culled chunks, with irregular
pile cores. More than 5,000 decorative instances on low quality receive no active
physics. Only six reusable obstacle slots can register dynamic collision proxies;
passed debris leaves the spatial grid. There is no mesh-level debris collision,
new physics library, grabber or collection mechanic. Shared resources survive;
mission-owned instance buffers, materials and geometry are disposed on exit.

Obstructions enter alternately from each side, with stage-based size/mass/type and
frequency. Push the whole object beyond the configured escort half-width plus its
radius and padding. Each obstruction can register at most one group strike, with
a short global cooldown. The third strike fails; replay resets distance, pool,
formation and strikes. Final-stage encounters are a quicker alternating sequence,
not a separate scripted boss or scoring system.

## Validation

Run:

```sh
npm test
npm run build
python -m http.server 5173
node tests/dolphin-rescue-browser.cjs
```

The optional browser harness requires Playwright and Chromium in the execution
environment, without adding project dependencies. `CHROMIUM_PATH` and
`DOLPHIN_TEST_URL` can override their locations. It uses actual WebGL, the entry
button, launch/exit/replay dialogs and keyboard input. It accelerates deterministic
state updates to exercise three-strike failure and successful completion; the
success case explicitly moves obstacles aside. That case verifies lifecycle and
state transitions, not human performance through the complete mission. Actual
collision response against the current is covered separately by shared-controller
and CollisionWorld tests, with no manual impulse calls.

Node tests cover continuous separated formation, 150-second distance completion,
clearance extents, swept dolphin hits, one-hit-per-obstruction, three-strike
failure, mass/cooldown/drag, spawn progression/pool reset, full-route flat-ground
isolation and real GUP contact clearing against the current. Existing test files
also cover unchanged exploration systems. Browser evidence is saved alongside
this document only after checks actually run.

Observed automated results: all 73 Node test files pass; production build passes
with GLB validation and versioned module imports; `git diff --check` passes. Real
independent QA reviewed the final source and reran focused checks/build. Browser
results are recorded in `browser-results.json`: entry/launch, mapped keyboard
controls, three dolphin visuals, 5,400 decorative instances, six-slot pool,
scripted failure/restart/completion/replay, exact world restoration, relaunch and
portrait/landscape HUD bounds passed with no page or console errors. Mobile
checks establish HUD geometry only; the test disables the animation loop for
accelerated state checks. The attached entry and bay screenshots are actual
Chromium captures, also inspected in independent QA.

## Limits

The sleeping spinner dolphins adapt Oceanbound’s existing stylized dolphin body
and tail animation with closed eyelids; they have no new species-specific GLB or
cinematic character performance. Decorative floating rubbish is static. Physics
uses Oceanbound’s simplified swept hull contacts and damped impulses, rather than
full fluid or rigid-body simulation. A complete manual 150-second escort and
physical iPhone/Safari multitouch remain unverified. Software Chromium results
are not a native GPU performance benchmark; the existing frame-delta clamp can
extend wall-clock duration on severely slow rendering devices.
