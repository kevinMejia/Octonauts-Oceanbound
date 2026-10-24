# GUP speed, turbo and marine movement implementation

Implemented October 24, 2026. Speeds below are world metres/second. No UI, animal geometry, discovery IDs or storage keys were replaced.

## GUP tuning

| GUP | Tier | Cruise | Normal maximum | Acceleration response (1/s) | Turbo maximum |
|---|---|---:|---:|---:|---:|
| E | Slow | 6.240 | 7.80 | 1.7 | 14.040 |
| A | Slow | 6.912 | 8.64 | 1.8 | 15.552 |
| C | Slow | 7.584 | 9.48 | 1.9 | 17.064 |
| D | Medium | 8.448 | 10.56 | 2.0 | 19.008 |
| F | Medium | 9.312 | 11.64 | 2.1 | 20.952 |
| B | Medium | 10.176 | 12.72 | 2.2 | 22.896 |
| Q | Fast | 12.000 | 15.00 | 2.3 | 27.000 |
| R | Fast | 13.440 | 16.80 | 2.4 | 30.240 |

`src/config/vehicleMovementConfig.js` applies the requested ratios to the existing 12 m/s baseline. The vehicle registry merges these profiles with existing movement settings; unlisted vehicles retain their settings. `SubmarineController` reads maximum speed and acceleration directly. Acceleration keeps the original exponential velocity response rather than changing handling to constant acceleration. Reverse retains the existing 5 m/s baseline scaled per vehicle. Normal controls still request maximum speed; fractional thrust is proportional, and an optional `cruise:true` controller input requests the configured cruising speed. There is no new cruise UI or binding.

Turbo remains 1.8x, draining 6.667 percentage points/second, recharging 3 points/second while inactive, with 25-point pickups. Every first deployment starts at 100%; the HUD updates immediately. Each vehicle retains its charge for the dive, including through repeated configuration and switching. Inactive parked vehicles do not recharge. Ordinary pause, discovery and graphics restoration never initialize a new tank. `reset()` retains its existing explicit empty-tank semantics.

## Animal tuning

| Animal | Pattern | Cruise | Normal maximum | Escape | Reaction / evasion |
|---|---|---:|---:|---:|---|
| Giant manta ray | Circular reef route around Octopod, radius 85 m | 10.2 | 11.2 | 13.8 | Fleeing, enabled |
| Hammerhead shark formation | Waypoint patrol | 9.5 | 11 | 13.2 | Evasive, enabled |
| Bottlenose dolphin | Roaming | 7.8 | 10 | 11 | Curious, enabled; short close-range departures |
| Whale shark | Broad waypoint migration | 3 | 3.5 | 3.5 (unused) | Passive, disabled |

Manta escape lasts 2.4 s followed by 9 s cooldown. Its normal speed challenges A (8.64 m/s), escape exceeds B (12.72 m/s), and R (16.8 m/s) has a pursuit advantage without turbo. The existing 13 m discovery radius is unchanged. The cooldown allows interception even when the animal detects a waiting player first.

Other existing species retain their current movement and models, without evasion. They have no separately authored cruising/maximum/escape speeds; their original elliptical paths determine speed. For reference, horizontal leader speeds on the unchanged ellipses are approximately:

| Animal | Existing pattern | Horizontal speed range (m/s) | Evasion |
|---|---|---:|---|
| Octopus | Small idle route | 0.60-1.28, including phase modulation | Disabled |
| Seahorse | Hover route | 0.098-0.150 | Disabled |
| Jellyfish | Drift route | 0.137-0.210 | Disabled |
| Spotted eagle ray | Gliding ellipse | 0.634-0.975 | Disabled |
| Moray eel | Small reef ellipse | 0.458-0.704 | Disabled |
| Pufferfish | Group ellipse plus existing individual orbits | Leader 0.169-0.260; member orbits retained | Disabled |
| Humpback whale | Broad ellipse | 0.676-1.040 | Disabled |

These legacy ranges exclude vertical bobbing and member animation. They are analytic reference ranges, not new assigned limits.

## Configuration and integration

Edit `src/config/animalMovementConfig.js`, or put a `movement` object on an existing species definition. `movementForAnimal` merges it with shared defaults; species without settings keep their original motion. `AnimalMovement` is the shared stateful movement integrator for configured individuals and formation leaders. Existing group offsets, member animation and discovery point updates are reused.

Patterns: `stationary`, `patrol`, `roaming`, `migration`, `circular`. Waypoints are `[x,z]` offsets from `center`; patrol and migration loop through them. Circular motion uses `routeRadius`. Roaming uses a gently changing radius bounded by `roamingRadius`. Configure `minSpeed`, `cruisingSpeed`, `maxSpeed`, `acceleration`, `deceleration`, `turningSpeed`, `speedVariation`, `verticalVariation`, `pauseSeconds` and `pauseInterval`.

Habitat uses `center`, `habitatRadius`, `maxHabitatDistance`, `minY` and `maxY`; a footprint margin keeps formations inside its horizontal extent. `footprint` includes the formation width, while `bodyHeight` independently describes vertical clearance. Terrain sampling includes eight surrounding footprint points. Nearby solid grid proxies provide steering with a consistent tangent bias to pass obstacles. Conservative swept horizontal bounds stop crossings. Configure safe centers and routes with space for the full model and formation.

Reactions: `passive`, `curious`, `cautious`, `evasive`, `fleeing`. Configure `evasionEnabled`, `detectionRadius`, `triggerDistance`, `escapeSpeed`, `escapeAcceleration`, `evasionDuration` and `evasionCooldown`. Default behavior smoothly returns to the route and cruising speed. Setting `returnToRoute:false` continues the last heading until habitat safety intervenes; `returnToNormal:false` uses normal maximum speed after a reaction instead of cruising speed. Normal routes continue independently of the player; reactions temporarily replace their steering target. Habitat safety always overrides a reaction.

Movement uses delta time, bounded 50 ms integration steps and cached obstacle sensing at 5 Hz. Distant visual/discovery pose updates reuse the existing 4 Hz cadence; there is no global pathfinding or additional dependency. Discovery continues to receive live individual and formation member positions, keeping existing radius checks, collection notifications, effects and persistent IDs.

## Validation

- Node suite: all 179 tests pass. Includes all GUP normal/reverse/turbo speeds, acceleration and cruising input, normal-speed restoration after boost, first selection and repeat-selection charge, pickups, recharge, controls, collisions, discovery and persistence.
- New motion simulations exercise every pattern for ten simulated minutes, habitat containment, passive proximity, speed variation, finite escape/cooldown, obstacle safety and detour progress.
- Same pursuit controls, 40 m behind manta, no turbo: R reaches discovery range in roughly 5 seconds; A does not within 40 seconds in the deterministic fixture.
- Waiting interception simulation discovers manta once and preserves its state afterward.
- `tests/movement-browser.cjs`: headless Edge, actual loaded low-quality scene; all eight GUP displacement speeds differ from their targets by less than 0.001 m/s; initial turbo and HUD both 100. Four configured species each ran 120 simulated seconds in the actual obstacle grid without stalls, with live discovery points and habitat containment. Manta/shark reactions activated; whale shark remained passive. A waiting player discovered manta exactly once in the scene. No browser runtime errors.
- `tests/marine-animals-browser.cjs`: discovers all four original species through the existing UI, checks collection layout at desktop and mobile viewport sizes, reloads persistence, and verifies models remain in the scene and moving. No runtime errors.
- `tests/marine-expansion-browser.cjs`: all seven existing group species remain discoverable, moving and in-scene, with saved progress after reload and mobile viewport layout checks. No runtime errors.
- Build: `python tools/build.py` verifies GLB headers and generates versioned production modules.

## Limits and follow-up balancing

Automated checks do not establish subjective swimming feel, hardware performance or real touch input quality. The browser run uses desktop Edge at low graphics quality; it is not a mobile device benchmark. Obstacle avoidance is conservative proxy steering, not global pathfinding: tightly enclosed or poorly authored future habitats can still trap animals, so author safe routes and check them in the scene. Formation members keep their existing offsets rather than independent evasion. Legacy species intentionally retain their original movement implementation and speeds. Configured height centers currently reuse existing route clearance estimates; manta therefore swims above some reef tops. Wider speed separation and full initial turbo should receive a human balancing pass, especially for medium vehicles and repeated switching among first-time deployments.
