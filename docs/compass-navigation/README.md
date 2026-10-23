# Compass destination markers

The existing circular compass, heading smoothing, cardinal directions, base distance, position and responsive sizing are preserved.

## Files

- `assets/icons/octopod-compass.svg`: dedicated orange dome-and-arms Octopod silhouette, dark outline and small blue window band.
- `src/navigation/Compass.js`: reusable target DOM, discovery subscription, true-bearing orbital markers and nearby styling. `dispose()` releases the subscription. Heading still comes from the active vehicle's world quaternion, independently of the camera.
- `src/navigation/compassMarkers.js`: shared target bearing/proximity calculation. Letters rotate around the compass center and counter-rotate upright exactly like the base icon, without displaced labels or leader lines.
- `src/config/vehicleConfig.js`, `src/config/importedVehicles.js`: `compassColor` metadata matching the published model thumbnails (A teal, B orange, R blue, C navy blue, D yellow, E green, F silver, Q blue).
- `src/config/octopodConfig.js`: `compassConfig.discoveryHighlightDistance`, default 90 world metres. A vehicle can override this with `discovery.compassHighlightDistance`.
- `src/game/Game.js`: connects the initialized discovery fleet and existing unlock persistence to the compass.
- `src/style.css`: dedicated icon, outlined letters and gentle proximity highlight, respecting reduced motion.
- `tools/fleet-import.json`, `tools/import_fleet.py`: preserve compass color metadata through future fleet imports.
- `tools/build.py`: publishes/version-hashes SVG icons.
- `tests/compassMarkers.test.js`, `tests/compass-browser.cjs`: math/configuration and integration coverage.

## Adding GUPs

Register the vehicle normally with an enabled discovery definition. The compass automatically reads the DiscoveryFleet record's resolved `pose`, without duplicating coordinates or loading models. Configure `compassColor` alongside other vehicle metadata (or in the fleet import job). The label defaults to the GUP name without its prefix; optional `compassLabel` overrides it. Missing color metadata falls back to pale white. Existing VehicleUnlocks state is the only visibility source, including saved sessions.

## Verification

146 Node tests pass. The production build validates successfully. Browser integration passes in desktop Edge with touch/mobile emulation: seven initial indicators, true north bearing, camera independence, heading changes, nearby highlight, immediate unlock removal, GUP switching, persistent removal after reload, portrait/landscape/desktop sizing, no horizontal overflow and no page errors. Screenshots were reviewed at phone portrait and landscape sizes. Discovery modal, celebration, parking, placements, controls and physics were not modified.

Physical iPhone Safari testing is not available. Bearings use the compass's existing horizontal navigation convention; proximity additionally includes vertical separation. Targets at nearly identical bearings can overlap; letters always stay at their true bearings, matching the base marker. A regression check verifies a GUP and the base at the same world location use the same rotation.
