# GUP damage and repair

Implemented on `feat/gup-damage-repair`, using one agent as explicitly requested.
No subagents or independent agent QA ran. User subsequently explicitly authorized
fast-forwarding main and pushing the completed feature for live testing.

## Behavior and configuration

`src/config/damageConfig.js` owns balancing, damage bands, contact rearming,
repair duration, station placement and particle budgets. Vehicle definitions can
optionally supply `durability.armor`, `durability.maxHull` and
`damageAttachment: [x,y,z]` without adding another damage implementation.

The normal configured `movement.maxSpeed` (with the controller's existing fallback)
is normalized across the complete registry, including locked vehicles and GUP-X.
For normalized speed t, Speed = round(1 + 9t), Armor = round(10 - 8t),
and maximum Hull = 40 + 10 * Armor. Equal fleet speeds use t = .5.
GUP-X explicitly overrides Armor to 10/10 as requested (140 maximum Hull); its
configured speed is unchanged. Other vehicles retain inverse speed balancing.
Current maximum Hull ranges from 60 to 140; temporary turbo, towing and damage
never alter static ratings. Existing saves default missing/invalid Hull to full.

| GUP | Normal speed (m/s) | Speed | Armor | Maximum Hull |
| --- | ---: | ---: | ---: | ---: |
| A | 8.64 | 2 | 9 | 130 |
| B | 12.72 | 6 | 6 | 100 |
| R | 16.80 | 10 | 2 | 60 |
| C | 9.48 | 3 | 9 | 130 |
| D | 10.56 | 4 | 8 | 120 |
| E | 7.80 | 1 | 10 | 140 |
| F | 11.64 | 5 | 7 | 110 |
| Q | 15.00 | 8 | 4 | 80 |
| X | 14.40 | 8 | 10 | 140 |

The existing CollisionWorld callback supplies inward contact-normal velocity.
Moving parked GUP velocity is subtracted along that normal before its push impulse.
Below 5 m/s does no damage; 5/9/15 m/s start 4/10/18 Hull-point bands.
A contact needs .3 seconds separation and .8 seconds since its last damaging hit
to rearm. Continuous pushing refreshes contact presence without draining Hull.
Obstacle identity distinguishes simultaneous contacts. Terrain support is immune
for tracks; ordinary swimmer support below 9 m/s is immune, while severe swimmer
slams and steep direct terrain impacts use the same damage bands. Camera shake,
collision response and the shared broad phase remain intact.

Hull is independent per vehicle and extends `oceanbound.fleet.v1` with `hulls`.
Unlock and Hull writes preserve each other's fields and other document fields.
Points are validated/clamped on load. Hits/testing save immediately; repairs save
at bounded intervals and on departure, switching, pagehide and hiding the page.
Storage failure leaves the session playable without clearing other progression.

Only zero Hull restricts movement: 25% normal forward/reverse limits, reduced
vertical thrusters, and turbo disabled even with Infinite Turbo unlocked.
Existing acceleration, steering and ground slope traction remain available.
Any positive Hull restores normal performance and turbo availability.

## Repair station

Inspected the authored Octopod collision proxies, cleared berths, delivery radius
and terrain samples before placement. The initial southeast candidate had a steep
approach that raised a swimming hull above its marker during actual controller
updates. The final station is at **(188, 3.9751, 140)**: offset **(8, 0, 40)**
from the Octopod horizontally and 2.5 metres above the local terrain. It is about
40.79 metres horizontally from the base, outside the 32-metre rescue delivery
radius. The existing spatial index confirms no nearby solid obstruction; startup
can search nearby clear alternatives. No additional collision world is created.

The small green disk has a pulsing outer ring and procedural crossed wrench and
screwdriver. It is non-solid and does not block the front approach. Close contact
uses the marker radius plus .25 m padding against the active vehicle's existing
three hull lobes in vehicle-local coordinates. Entering the Octopod area alone
never repairs. The station doesn't call rescue delivery or modify missions.

Contact restores maximum Hull / 5 points per gameplay second, retaining partial
repairs on exit. Switching cancels the prior repair owner. Full vehicles do not
start. Existing frame delta clamping prevents background/resume catch-up repairs.
The station remains available after completion. Testing controls are in the
existing Settings > Gameplay panel; a full adventure reset also resets Hull.

## Visuals and UI

All vehicles share percentage stages: above 75% operational, above 50% light,
above 25% heavy, positive up to 25% critical, and zero emergency. Smoke/steam
increases by stage; heavy/critical add occasional sparks; emergency adds a small
persistent stylized flame. No explosion, model replacement or permanent lockout.

VehicleDamageEffects reuses ParticlePool and active buffer uploads. One shared
geometry/material and one Points draw have a total capacity of 24 points on low
quality and 40 on high, including the anchored emergency flame. Vehicle-local
metadata, existing exhaust offsets or hull-derived offsets are transformed through
the actual model impact pivot. Emitted particles drift in world-up space and do
not rotate with later hull turns. Hidden, distant and offscreen vehicles stop
emitting; switches and repairs clear effects. New resources expose disposal.
No textures, external assets, dependencies or post-processing were added.

The selector keeps its carousel/unlock behavior and gains compact ten-segment
Speed, Armor and current Hull rows for discovered vehicles. Undiscovered cards
remove these rows while retaining the same card dimensions, with a centered locked silhouette. Hull refreshes on opening. The gameplay Hull
badge follows the existing HUD scale; DOM text/color update only when displayed
condition changes. Notices use the existing notification stack and monitor style,
with event/resize measurements that clear the compass and vehicle button.
Emergency warnings can supersede completed-repair notices. Repair notices never
replace rescue or letter collection components.

## Verification

- Node v24.22.1 and Python 3.14.7 used; no installation required.
- `node --test tests/*.test.js`: **374 passed** (nine new focused tests).
- `python tools/build.py`: passes static build and GLB validation.
- `git diff --check`: passes.
- `npm` is unavailable on PATH; the exact package-script commands above were run.
- `tests/damage-browser.cjs`: production Edge low-quality integration, all nine
  GUPs, actual controller-adjusted station contact, model-attached effects,
  world-space drift, independent Hull across switching, settings, reload,
  desktop/phone selectors and page/console errors.
- `tests/damage-live-browser.cjs`: production Edge low/high actual collision
  sweeps (3/8/16/-16 m/s), camera shake, timed partial repair, leaving/resuming,
  repair during an active rescue without delivery, full cleanup, and an empty
  GUP-X driving to the marker with infinite turbo requested. Return while towing took 183
  synthetic controller frames; repairs completed in roughly five gameplay
  seconds, with browser wall time including the deliberate interruption.
- `tests/damage-layout-browser.cjs`: damage and letter notices together clear
  controls at 320x568, 390x844, 844x390 and 1280x800. Includes baseline comparison.
- Existing `tests/rescue-mobile-browser.cjs`: passes emulated live touch escort,
  passenger motion, rope attachment, HUD and unfinished progression.

Browser results and captures are in this folder. These are desktop Edge and
emulated viewport/touch checks, **not physical iPhone Safari testing**.

### Existing unrelated failing check

`tests/word-hunt-hud-browser.cjs` fails its standalone narrow-screen overlap
assertion. A controlled comparison with the damage stylesheet disabled and Hull
badge hidden produces identical word-hunt and vehicle-button bounds and the same
overlap at 320 and 390 pixels. See `layout-results.json`. No word-hunt layout
implementation was changed. With a damage notice present, the stack is moved
clear by the new notice's measured spacing. The existing standalone issue remains
outside this feature's scope.

## Files

Runtime additions: `src/config/damageConfig.js`,
`src/vehicles/VehicleDamage.js`, `src/vehicles/RepairStation.js`,
`src/effects/VehicleDamageEffects.js`, `src/ui/VehicleDamageDisplay.js`,
`src/ui/vehicleDamage.css`.

Integration changes: `src/game/Game.js`, `src/collision/CollisionWorld.js`,
`src/vehicles/SubmarineController.js`, `src/vehicles/TrackedGroundController.js`,
`src/vehicles/VehicleUnlocks.js`, `src/ui/VehicleSelector.js`,
`src/ui/Settings.js`, `index.html`.

Checks: `tests/vehicle-damage.test.js`, `tests/damage-browser.cjs`,
`tests/damage-live-browser.cjs`, `tests/damage-layout-browser.cjs`.
Coordination/documentation: `BACKLOG.md`, `README.md`, `docs/damage/`.

## Remaining tuning and limits

Physical iPhone Safari touch, safe-area, background/resume and sustained FPS/memory
measurements remain outstanding. No measured mobile performance claim is made.
The collision proxies remain approximations; damage thresholds and smoke strength
are initial balancing values for playtesting. No complete day/night mission
playthrough was repeated. The pre-existing standalone word-hunt overlap above is
recorded separately; no unrelated queued feature was started.

### DAMAGE-027 follow-up

Undiscovered selector cards contain no stat rows and use their original compact
heights. Discovered cards retain all stats. GUP-X now explicitly has 10/10 Armor
and 140 maximum Hull; saved current Hull points remain intact. 379 Node tests,
production build/diff checks, and `tests/damage-locked-browser.cjs` pass. Browser
checks cover locked/unlocked card recycling, three viewport sizes, unlock refresh,
discovered Hull and normal GUP-X selection. Physical iPhone remains untested.

DAMAGE-028: locked cards now match discovered card sizes and center the GUP
silhouette, retaining the lock above, name below and no stat rows. Ten focused
tests, production build/diff checks and the updated locked-card browser check pass
desktop, phone and landscape layouts, unlock refresh and normal selection.
