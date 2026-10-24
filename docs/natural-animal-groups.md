# Natural animal grouping and motion

Implemented October 24, 2026. Existing species, models, counts, habitat centers, discovery IDs and save data are preserved. The six-animal group described as squids in the request is registered as `jellyfish`; its species identity and model remain unchanged.

## Species behavior

| Species | Count | Placement and movement | Minimum separation |
|---|---:|---|---:|
| Jellyfish | 6 | Loose irregular cluster, different depths, facing, gentle drift, idle pauses and pulse clocks | 4 m |
| Hammerhead sharks | 3 | Independent waypoint patrols, staggered starts, opposite directions, different route scales, speeds, handling and reaction clocks | 8 m |
| Pufferfish | 3 | Compact irregular cluster, gentle bounded drift, individual pauses, facing and animation timing | 3.3 m |
| Seahorses | 4 | Loosely clustered hover, varied depths, calm drift and independent idle timing | 2.6 m |
| Spotted eagle rays | 2 | Irregular spacing, depth and speed variation within the existing glide route | 8 m |

Single-member moray and humpback groups retain their existing paths. The four individual species, including the manta, dolphin and whale shark, retain their movement and evasion settings.

## Configuration

`src/config/animalGroupConfig.js` centralizes defaults and per-species settings. An existing definition can override them with `group.randomization`. Settings include:

- `seed`, `spawnRadius`, `spawnMinSeparation`, `spawnHeightVariation`, `initialHeadingVariation`.
- `speedVariation`, `accelerationVariation`, `turnSpeedVariation`, `routePhaseOffset`, `patrolRadiusVariation`, `pauseTimeVariation`.
- `driftRadius`, `driftSpeed`, `pauseSeconds`, `pauseInterval`.
- `groupCohesion`, `groupSeparation`, `preferredSpacing`, optional `schooling` and `leader` flags.
- `independent` to reuse the existing `AnimalMovement` controller for each member of a group with configured waypoints.

All seeds and member traits are generated at initialization. Rejection sampling makes clustered anchors irregular and reserves space for each member's full drift envelope. Invalid packing configurations fail explicitly rather than silently reducing spacing or dropping animals. Shark spawns are sampled along their individually scaled waypoint routes and validated against the existing obstacle grid.

`AnimalGroups` remains responsible for shared visuals, member transforms, animations and stable world-space discovery points. Independent sharks reuse `AnimalMovement`, with optional neighbor steering added to its normal target. There is no second pathfinding or schooling engine. Pairwise separation is limited to the small species groups; the current largest group contains six members. A strong near-neighbor bias avoids sharks yielding indefinitely at route crossings. The existing distant-update cadence is retained.

Loose groups retain their existing leader habitat route. Each member drifts around its own seeded anchor with independent timing, direction, pause phase and depth, rather than orbiting at equal phase intervals. Their anchor margin guarantees separation without per-frame flocking. The pufferfish-only equal-phase orbit helper was retired in favor of this shared member behavior. Schooling and leader following are opt-in and disabled for all initial groups.

Existing terrain clearance sampling now covers randomized cluster extents. Conservative world-space swept checks protect moving loose members against solid proxies, including the Octopod. Independent sharks use the same obstacle avoidance, habitat bounds and finite evasion logic as the existing swimmer. Discovery continues to use every member's actual world position, so any member can unlock its existing species once.

## Validation

- All 183 unit tests pass. They cover reproducible seeds, different seeds, bounded placement, reserved separation, non-collinear pufferfish and six-member clusters, varied member traits, ten-minute drift simulations, calm pufferfish motion, and optional cohesion/separation behavior.
- `tests/group-randomization-browser.cjs` initializes the actual scene and runs all multi-member groups for five simulated minutes, checking separation, habitat boundaries, depth and nearby solid proxies. It verifies distinct initial facing/depth/position values, member movement, independently activated shark evasion and live discovery points.
- The deterministic desktop run measured more than 2.3 km of travel per shark, with distinct headings and minimum spacing above 8 m. Other observed minimum spacings were 3.37 m for seahorses, 4.68 m for jellyfish, 8.56 m for eagle rays and 4.37 m for pufferfish.
- The measured desktop movement update cost was 0.30 ms at the 95th percentile (approximately 0.20 ms mean) for all marine animals together, excluding rendering. iPhone and iPad viewport/touch emulations also measured 0.30 ms at the 95th percentile, preserved every group count, and opened the collection UI successfully. All runs used low graphics quality on desktop Edge, with no runtime errors. These are local desktop measurements, not device benchmarks.
- World-scene screenshots of jellyfish, sharks and pufferfish were visually inspected for irregular spacing and varied orientation.
- The existing expansion browser regression checks unchanged counts, discovery through any member, saved progress after reload, model/geometry reuse, ongoing movement and mobile collection layout.

## Limits

Physical iPhone/iPad testing and subjective gameplay balancing still require a device playtest. Browser device emulation exercises viewport, touch and low-quality code paths on desktop hardware. Environmental safety uses existing collision proxies rather than mesh-triangle collision. Future tightly packed habitats or extreme configuration values should be validated with the supplied scene test. Independent shark separation can briefly slow a shark while it turns out of another shark's path; they resume patrol afterward.
