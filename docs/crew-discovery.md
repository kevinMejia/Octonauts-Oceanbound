# Octonaut crew discovery

Barnacles, Kwazii and Peso now start at fixed discovery locations on a fresh adventure. Their existing model instances, rigs, materials, scale, idle animation and original bridge slots are reused. Finding them shows a portrait panel; dismissing it returns that same instance to the Octopod. There is no escort or passenger mechanic.

## Initial locations

| Character | World anchor (X, Z) | Current resolved feet Y | Discovery radius | Original bridge slot (local X, Y, Z) |
|---|---|---:|---:|---|
| Captain Barnacles | (112, 260), south of the Octopod reef area | 7.77 | 16 m | (0, 20.10, 5.3) |
| Kwazii | (-90, 90), west of the reef habitat | 7.11 | 16 m | (-3.2, 20.10, 4.6) |
| Peso | (275, 10), northeast of the Octopod | 19.03 | 16 m | (3.2, 20.10, 4.6) |

Feet heights are resolved from the terrain and surrounding solids at initialization. The existing FleetPlacement helper searches deterministically within 16 m of each anchor if necessary. Crew bounding dimensions are measured from their existing models, and placement checks include parked vehicles. Discovery centers are at mid-body height. All eight current GUPs have a verified safe approach within each discovery radius.

## Discovery, return and saves

CrewDiscovery uses the existing VehicleUnlocks persistence implementation with an independent versioned key, `oceanbound.crew-discoveries.v1`. VehicleUnlocks retains its existing default fleet key. Existing fleet and animal saves are not migrated or modified by crew encounters. Missing crew saves mean all three characters are still missing; invalid and unavailable storage are handled safely.

A valid proximity encounter marks a character found and saves immediately before opening the panel. The panel pauses gameplay, clears held controls, renders a portrait generated from the existing model, and reuses the monitor styles, DiscoveryCelebration and discovery sound. One pending encounter and the game's existing modal/pause checks serialize notifications across animals, GUPs and crew.

The Return to Octopod button, close button and Escape all complete the same idempotent return. The existing model is reparented from the world group to its bridge group and restored to its configured local pose. No cloned character is created. Reloading after an interrupted encounter restores the saved character directly at home. World and home crew keep their original idle animation; visibility is checked independently per character.

Reset gameplay progress clears crew, marine animal and vehicle discoveries, then restarts in GUP-B at the Octopod. All initial crew return to their discovery locations. Audio, camera, graphics preferences and unrelated storage remain intact. The confirmation explicitly names all three discovery types. A failed save keeps the existing storage-error behavior and permits retry.

## Adding another Octonaut

Add its GLB as `assets/models/characters/<id>.glb` and an entry in `src/config/crewConfig.js`:

- Stable `id`, display `name`, and encounter `message`.
- Original bridge pose `x`, `y`, `z`, `heading`; animation start `phase`.
- `discovery.position` in world units, `discovery.heading`, `discovery.radius`, and optional `discovery.maxPlacementRadius`.
- Optional `portraitPath`; otherwise the shared existing thumbnail renderer generates the character image once at startup.
- Optional `startsUnlocked:true` for crew that should always begin at home.

The registry drives loading, discovery, portraits, persistence, home placement, counts and reset. No character-specific controller or modal branch is required. Model geometry should be authored with its feet at local Y=0, matching the existing assets. Choose safe accessible anchors and run the scene tests after adding a character.

## Validation

- All 191 Node tests pass, including new crew proximity, pause/pending serialization, stable IDs, storage isolation, reload, starts-unlocked, reset, unavailable storage, malformed saves, simultaneous encounters and panel failure handling.
- `tests/crew-discovery-browser.cjs` passes with the actual scene: fresh scattered crew, three portrait encounters, safe approaches for all 24 character/GUP combinations, same model UUIDs before/after return, original home positions, each dismissal path, reload persistence, direct reset and unchanged animal/fleet progress during a crew-only reset.
- Phone portrait, phone landscape and tablet viewport checks pass; screenshots of the actual portrait panels were visually inspected. These are desktop browser emulations, not physical iPhone/iPad tests.
- `tests/gameplay-reset-browser.cjs` passes: cancel retains all discoveries; confirmed reset clears fleet, animals and crew, resets collection count, scatters all three characters, restores GUP-B and preserves preferences/unrelated storage.
- Existing `marine-animals-browser.cjs` and `marine-expansion-browser.cjs` regressions pass: original and grouped animals remain discoverable, retain their models and motion, and preserve collection saves across reloads.
- Production build passes, including asset-header validation and versioned module generation.

## Limits

Physical device performance and the subjective difficulty of spotting these small characters need a gameplay pass. Characters remain stationary near their authored locations using existing idle animation; no swimming, vehicles, equipment or new models were introduced. Discovery locations are fixed, with deterministic local safety adjustment. No new permanent crew HUD or roster screen was added; the encounter footer reports crew progress, and returned crew can be seen inside the Octopod.
