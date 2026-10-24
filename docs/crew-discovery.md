# Octonaut crew discovery

The current rescue-escort upgrade is documented in [rescue escort](rescue-escort.md). Finding a crew member now starts towing after the panel; home placement requires delivery. The notes below also describe the earlier discovery-only implementation and asset-replacement contract.

The eight core crew members now start at fixed discovery locations on a fresh adventure. The original three models are preserved; Shellington, Dashi, Tweak, Professor Inkling and Tunip use distinct, replaceable animated placeholders. Each character instance moves between its discovery point and its own bridge slot. Finding them shows a portrait panel; dismissing it returns that same instance to the Octopod. There is no escort or passenger mechanic.

## Initial locations

| Character | World anchor (X, Z) | Discovery radius | Bridge slot (local X, Y, Z) |
|---|---|---:|---|
| Captain Barnacles | (112, 260), south of the Octopod reef area | 2.5 m hull gap | (0, 20.10, 5.3) |
| Kwazii | (-90, 90), west of the reef habitat | 2.5 m hull gap | (-3.2, 20.10, 4.6) |
| Peso | (275, 10), northeast of the Octopod | 2.5 m hull gap | (3.2, 20.10, 4.6) |
| Shellington | (-185, -130) | 2.5 m hull gap | (-4.4, 20.10, 1.3) |
| Dashi | (330, 235) | 2.5 m hull gap | (0, 20.10, 1.8) |
| Tweak | (35, 315) | 2.5 m hull gap | (4.4, 20.10, 1.3) |
| Professor Inkling | (-235, 180) | 2.5 m hull gap | (-2.8, 20.10, -2.6) |
| Tunip | (320, -165) | 2.5 m hull gap | (2.8, 20.10, -2.6) |

Feet heights are resolved from the terrain and surrounding solids at initialization. The existing FleetPlacement helper searches deterministically within 16 m of each anchor if necessary. Crew bounding dimensions are measured from their existing models, and placement checks include parked vehicles. Discovery centers are at mid-body height. All eight current GUPs have a verified safe approach within each discovery radius.

## Discovery, return and saves

CrewDiscovery uses the existing VehicleUnlocks persistence implementation with an independent versioned key, `oceanbound.crew-discoveries.v1`. VehicleUnlocks retains its existing default fleet key. Existing fleet and animal saves are not migrated or modified by crew encounters. Missing crew saves mean all eight characters are still missing; existing saves with the original three IDs keep those characters found and leave the five additions undiscovered; invalid and unavailable storage are handled safely.

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

The registry drives loading, discovery, portraits, persistence, home placement, counts and reset. No character-specific controller or modal branch is required. Visual models are normalized to their feet at startup; their asset correction transform remains separate from the gameplay root. Choose safe accessible anchors and run the scene tests after adding a character.

## Validation

- All 193 Node tests pass, including new crew proximity, pause/pending serialization, stable IDs, storage isolation, reload, starts-unlocked, reset, unavailable storage, malformed saves, simultaneous encounters and panel failure handling.
- `tests/crew-discovery-browser.cjs` passes with the actual scene: fresh scattered crew, eight portrait encounters, safe approaches for all 64 character/GUP combinations, same model UUIDs before/after return, original home positions, each dismissal path, reload persistence, direct reset and unchanged animal/fleet progress during a crew-only reset.
- Phone portrait, phone landscape and tablet viewport checks pass; screenshots of the actual portrait panels were visually inspected. These are desktop browser emulations, not physical iPhone/iPad tests.
- `tests/gameplay-reset-browser.cjs` passes: cancel retains all discoveries; confirmed reset clears fleet, animals and crew, resets collection count, scatters all eight characters, restores GUP-B and preserves preferences/unrelated storage.
- Existing `marine-animals-browser.cjs` and `marine-expansion-browser.cjs` regressions pass: original and grouped animals remain discoverable, retain their models and motion, and preserve collection saves across reloads.
- Production build passes, including asset-header validation and versioned module generation.

## Limits

Physical device performance and the subjective difficulty of spotting these small characters need a gameplay pass. Characters remain stationary near their authored locations using existing idle animation; no swimming, vehicles, equipment or new models were introduced. Discovery locations are fixed, with deterministic local safety adjustment. No new permanent crew HUD or roster screen was added; the encounter footer reports crew progress, and returned crew can be seen inside the Octopod.

## Replacing placeholder models

Keep each stable character `id` unchanged. Add an optional `visual` object to its registry entry to override the shared defaults:

```js
visual: {
 modelPath: '../../assets/models/characters/dashi-upgraded.glb',
 scale: 1,
 orientation: 0, // Y-axis radians, +Z faces forward
 offset: [0, 0, 0], // Metres after automatic foot alignment
 idleClip: 'Idle',
 portraitTime: 0, // Stable open-eye portrait pose, separate from idle phase
 placeholder: false
}
```

Paths resolve from crewConfig.js and retain the production build version. Scale/orientation/offset apply to a separate asset-transform group, so animation tracks cannot overwrite discovery positions or home slots. Original authored materials are retained. The configured idle clip is preferred, with an idle-named or first-clip fallback if absent. Self-contained GLBs with reasonable geometry/texture budgets are recommended. Portraits and collision dimensions regenerate from the loaded visual; a separate `portraitPath` remains optional.

No save migration or discovery code changes are required when replacing a model. The production build already hashes character GLB contents, and crew model URLs include that build version, so replacing a file at the same path invalidates its cached asset after the next build/deployment and app reload. Verify home clearances and mobile rendering after a replacement.

The five new GLBs total about 2.07 MB, use a single vertex-color material and one skin each, and include an eight-second articulated idle with blink keys. Editable Blender sources are included. Rebuild only these five with `create-placeholder-crew.py`; it does not regenerate the original three. Unit validation checks every exported rig/idle; Blender validation also reopened each new source and checked evaluated idle/blink vertex movement. These remain intentionally simple placeholders, not final production models.

Roster reference: [official Octonauts crew page](https://www.octonauts.com/octonauts.html).
