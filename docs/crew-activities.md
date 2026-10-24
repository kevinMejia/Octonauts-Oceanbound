# Octopod crew activities

Rescued crew reuse their existing models and gameplay roots. `OctopodCrew.sync()` registers new arrivals without restarting existing journeys. Undiscovered, discovered-but-undelivered and actively towed characters stay outside this controller. No rescue keys, thresholds, towing rules, vehicle controls or models were changed.

## How it works

Each character follows IDLE → WALKING → WORKING → IDLE with independent random timing. Working characters have a 60% chance to stay for another interval. Station preferences weight choices by four; they do not restrict characters to particular consoles. Free idle positions provide alternatives when computers are busy.

Destination slots are reserved before walking. The origin remains reserved until the character has stepped clear. Multi-occupancy stations create spaced slots rather than placing several actors at one coordinate. Actual visual bounds provide ambient personal-space radii independently of the unchanged rescue collision envelopes.

A small visibility graph uses configured aisle points and inflated rectangles for existing consoles. Routes avoid stationary crew and other reserved destinations. A blocked walker replans; if it cannot find a route, it releases the destination and yields the movement permit so other crew can clear the aisle. Movement integrates bounded steps and turns along the shortest angular path; it never snaps to station coordinates.

New arrivals normally use their existing home coordinates. If another actor or destination reservation already occupies that arrival spot, a clear configured arrival point is chosen before the returned character is rendered. Existing residents keep their exact positions, paths, UUIDs and reservations. Ambient station state is intentionally transient; saved rescue progression remains the source of truth after a reload.

## Station placement and animation

The editable Octopod was inspected read-only in Blender. [Measured bridge geometry](characters/bridge-geometry.json) records the named floor, consoles, displays and rear monitor in Three.js coordinates. The floor top is Y=20.09000015; crew feet use Y=20.10. Seven consoles form the front semicircle at radius 7.5. Their working positions are at radius 5.3, facing the console/display. The rear monitor, two quieter observation positions, and existing home/idle positions complete the registry.

The supplied character GLBs contain named poses rather than usable walking clips. Existing mixers and idle poses are retained. A separate visual motion group supplies gentle foot/body bob, turning sway, breathing, and a small computer-facing lean. A future usable walk clip can be selected automatically without changing this controller. No skeleton or replacement animation asset was introduced.

## Configuration

Edit `src/config/crewActivityConfig.js`:

| Setting | Default / meaning |
|---|---|
| `enabled` | `true`; disabling freezes activity movement and removes procedural motion while retaining normal model idle playback when visible |
| `movementSpeed`, `turnSpeed` | 0.7 local units/s and 2.4 radians/s |
| `minDecisionDelay`, `maxDecisionDelay` | 5–10 seconds |
| `minWorkDuration`, `maxWorkDuration` | 5–10 seconds; station `minDuration`/`maxDuration` override these, or use `null` to inherit |
| `initialDelay` | 1–6 seconds of independent arrival staggering |
| `stayProbability` | 0.6 chance to continue the current activity |
| `maxSimultaneousMoving` | 1 by default; two simultaneous walkers are also covered by tests |
| `idleAnimationIntensity`, `walkBobFrequency` | 0.035 body-motion amplitude, scaled lean/sway, and 8 radians/s step phase; zero intensity removes procedural motion |
| `stations` | IDs, local positions, headings or facing targets, activity type, occupancy, optional spacing, duration overrides and optional `preferredCharacters` |
| `characterPreferences` | Station IDs or activity types, keyed by stable crew ID |
| `waypoints`, `obstacles`, `arrivalPositions` | Authored open-deck routes, console footprints and safe arrival alternatives |
| `personalSpace`, `arrivalDistance`, `replanAfter` | 0.12-unit spacing margin, 0.035 arrival tolerance, and 2-second blocked-route retry |
| `activeDistance`, `walkableRadius` | 90-unit update distance and conservative 7.8-unit local bridge boundary |

Activity timers and movement pause when the bridge is far away, outside the camera frustum, hidden by an ancestor, or detached from the scene. They resume in place without fast-forwarding. Normal game pause already pauses the shared crew update loop. The existing character render-distance culling remains in place. No per-character animation loops, pathfinding dependency, physics simulation or additional rendered meshes were added. Whole-manager teardown clears activity reservations and mixer bindings and detaches its render groups.

## Validation

- `node --test tests/*.test.js`: 225 passed.
- `tests/crew-activities.test.js`: one through eight members, reserved origins/destinations, crowded arrival recovery, occupancy, weighted preferences, one/two-walker limits, distance bounds, offscreen/disabled freeze and teardown.
- `tests/crew-activities-browser.cjs`: actual imported models, a five-minute simulation with all eight moving over time, new arrivals during a journey, model identity, measured visual clearance, saved progress, a GUP switch, camera culling, detached/re-attached interior, reset and unload.
- The same browser checks pass against the locally served production build using `CREW_ACTIVITY_TEST_URL`.
- Existing rescue browser regression passes discovery, rope continuity, obstacles, all GUP switches, delivery and persistence. Existing crew discovery regression passes 64 GUP approaches, eight portrait encounters and save migration.
- Desktop and mobile-sized bridge screenshots were visually inspected. Physical device testing was not performed.

## Performance sample

In a controlled headless Edge bridge view with all eight crew, five batches of 200 updates measured median per-update CPU times of about **0.056 ms disabled** and **0.061 ms enabled**. Both rendered **298 scene draw calls**, with **706 geometry buffers** and the same **225 crew meshes**. These are CPU submission/update measurements, not GPU time or a physical mobile FPS guarantee. [Raw validation and measurements](characters/crew-activity-validation.json) include the measured minimum crew clearance and station states.
