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
Exploration systems stop updating during the mission. The normal free-roam HUD and settings remain visible. Vehicle switching and the
GUP-X unlock checkbox are temporarily disabled while piloting this mission’s
GUP-B, and their prior states return on exit. Terrain height is injected into the shared
controller/camera/collision queries so the independent flat bay never collides
with invisible exploration hills.

All mission tuning is in `src/config/dolphinRescueConfig.js`. The default route is
600 metres at a 4 m/s dolphin pace: 150 active simulation seconds, including a 70 metre
clean-water release area. The dolphins advance straight at fixed speed independently of GUP inputs,
with constant lateral formation offsets and depth. Existing steering, forward/reverse,
rise/dive and orbit controls remain available. The GUP starts just behind and beside the dolphins. Its movement, normal GUP-B
speeds, turbo, saved camera distance/height and orbit controls match free roam.
The mission camera uses normal GUP-B heading follow and the saved orbit recenter
preferences, matching free roam. Only dolphins progress automatically: the player can stop, reverse, swim
alongside or move ahead without escort position clamps or forced current. Mission
status uses the same notification lane and panel styling as existing rescues.

There are eleven procedural, palette-colored litter types: boxes, crates,
bottles, containers, tires, boots, cans, nets, ropes, planks and household objects.
They are merged per type and instanced in spatially culled chunks, with irregular
pile cores. More than 5,000 decorative instances on low quality receive no active
physics. Only six reusable obstacle slots can register dynamic collision proxies;
passed debris leaves the spatial grid. There is no mesh-level debris collision,
new physics library, grabber or collection mechanic. Shared resources survive;
mission-owned instance buffers, materials and geometry are disposed on exit.

Obstructions enter alternately from each side, with stage-based size/mass/type and
frequency. A bump transfers momentum along the contact normal, opposite the GUP’s contact
side, with configurable restitution and mass. Incoming drifting debris can also
bounce off a stationary GUP. Debris continues coasting after contact ends; lighter
underwater drag settles it gradually. Vertical bumps work too and the floor stops
debris sinking through the seabed. Move the whole object beyond the configured escort half-width plus its
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
single-contact response and coast-to-clear behavior are covered separately by
shared-controller and CollisionWorld tests, with no manual impulse calls.

Node tests cover continuous separated formation, 150-second distance completion,
clearance extents, swept dolphin hits, one-hit-per-obstruction, three-strike
failure, mass/cooldown/drag, spawn progression/pool reset, full-route flat-ground
isolation, one-contact clearing after the GUP releases, incoming-drift reflection
and vertical rebounds. Existing test files
also cover unchanged exploration systems. Browser evidence is saved alongside
this document only after checks actually run.

Observed automated results: all 73 Node test files pass; production build passes
with GLB validation and versioned module imports; `git diff --check` passes. Real
independent QA reviewed the final source and reran focused checks/build. Browser
results are recorded in `browser-results.json`: entry/launch, mapped keyboard
controls including turbo, normal HUD/settings, a stationary GUP without input
while dolphins advance, normal movement speeds, three dolphin visuals, 5,400
decorative instances, six-slot pool,
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

## Phone steering and stable camera regression

The deployed `690a1f2` build already accepted joystick steering and Forward with
independent fingers. A sustained Chromium touch diagnostic reproduced the GUP
turning while the heading-follow camera swung around it. This revision separates
mission camera heading from GUP steering and disables mission orbit recentering;
it does not change the shared joystick or GUP controls.

`node tests/dolphin-touch-browser.cjs` tests actual Chromium multi-touch dispatch
with a continuous game loop: joystick-only steering without camera rotation,
Forward plus joystick in both finger orders, released controls, and a manual
camera drag held past the normal recenter delay. It suppresses rendering during
measurements to avoid treating software GPU timing as input behavior. Results
are written to `touch-results.json` only on success. The final run passes all
these checks with no page errors or pointer-cancellation events. Physical iPhone/Safari remains
unverified. Existing open tabs retain their loaded modules until reloaded.

## Normal follow restoration

The fixed-heading override introduced in abe9c9b made steering feel different
from free roam. The mission now inherits the normal GUP-B camera profile and
saved recenter preference. Flat mission terrain and bay camera obstacles remain.
The historical touch results above describe the previous fixed-heading behavior;
the touch harness now checks heading follow and recentering.

Current verification: all 400 pre-existing Node tests plus the added mission-config
regression pass, as do production build and diff checks. Independent agent QA
reviewed the runtime diff. Actual Edge touch emulation passes heading follow,
simultaneous steering/Forward in both finger orders, release, orbit recenter and
exit restoration with no page errors. Updated touch-results.json contains this
run. Rendering was suppressed during input measurements; physical iPhone remains
unverified.

## UI, reef and mission Hull polish

See [current implementation and validation](../dolphin-polish/README.md) for the
compact HUD, responsive action buttons, shared sand/reef assets, mission fog and
full starting/replay Hull. Free-roam fleet Hull is restored on return. Camera,
movement and mission mechanics remain unchanged. This follow-up uses one agent
as explicitly requested; the earlier independent QA is not claimed for it.

## Slow-frame timing correction

The mission now consumes real elapsed time through bounded small physics steps,
rendering once per frame. This fixes dropped simulation time below 20 FPS without
changing configured speeds or collision rules. See [timing validation and stall
limits](../dolphin-timing/README.md). Free-roam timing is unchanged.

## Straight sleeping-dolphin course

Dolphins now hold a fixed lane, depth and forward facing while swimming straight
at 4 m/s. Their route does not receive GUP input or position. Tail animation and
closed eyes remain. See [current course and verification](../dolphin-straight/README.md).
