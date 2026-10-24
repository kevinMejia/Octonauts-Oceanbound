# Octonaut rescue escort MVP

Crew discovery now starts a playable tow instead of teleporting a character home. The eight existing characters, assets, portraits, messages, discovery locations and home slots are preserved. Earlier automatic returns migrate as already completed rescues.

## Flow and persistence

`undiscovered → discovered → towing → rescued`

CrewDiscovery detects a close approach, saves the found state and opens the existing portrait panel with its animation, sound and pause behavior. The Begin Rescue button, close button and Escape all attach the character after dismissal. Only one active tow is permitted. Other crew encounters are blocked while towing; animal/GUP discovery and their existing pause behavior remain available.

RescueProgress stores `version:2`, `discovered` and `rescued` arrays at the existing `oceanbound.crew-discoveries.v1` key. Existing version-1 `unlocked` entries (and legacy arrays) become both discovered and rescued. Unknown IDs are ignored; malformed/unavailable storage falls back safely to session progress. Reset overwrites that same key, preventing old completed entries from reappearing through migration.

Active tow position is session-only. Reloading an undelivered mission restores the character to its original discovery location, still found and not rescued. Approaching it closely attaches the tow again without replaying the discovery panel. Completion is idempotent and saves rescued status only after delivery. There are no new currencies or repeat rewards.

Reset gameplay progress clears all crew states and active tow, removes the rope/HUD/penalty, and scatters the crew again. Marine and vehicle progress also reset as before; preferences remain saved.

## Close approach and delivery scale

The default discovery gap is **2.5 world metres from the oriented GUP hull bounds**, not its centre. This permits almost-touching approaches with every GUP, including wider hulls, while rejecting high/low flybys. It uses the existing collision dimensions, pitch, bank and vertical centre offset; it is a conservative hull-proxy check rather than mesh collision. A character can override `discovery.radius`; absent overrides use rescueConfig.discoveryRadius. All 64 current crew/GUP combinations have verified collision-free close approaches.

Delivery requires **both GUP centre and passenger attachment point** inside a 32 m 3D sphere centred at the existing Octopod origin plus `(0,20,0)`. The suggested 12 m ground-centred radius would be impractical around this roughly 50 m wide base and its collision geometry. The docking-height centre and larger radius keep the existing base accessible without adding a replacement model or dock. The normal Octopod compass marker remains the destination and is highlighted during towing.

## Motion, rope and switching

RescueSystem accepts a generic payload `{id,name,model,height,radius}` and an onDelivered callback. Crew is its only current client. TowMotion and RescueProgress have no Three.js dependency and can later be reused for other payloads without implementing those future missions now.

The rear anchor derives from the selected GUP's collision half-length and centre height, transformed through the same yaw/pitch/bank frame as the vehicle. A future GUP can override `towing.attachment:[x,y,z]` in its definition. The character attaches at a configurable 45% of measured height. Vehicle switching preserves the active payload and reconnects the rope to the new rear anchor.

TowMotion uses damped following, a bounded catch-up speed, gentle sway/bob and a slight side offset for visibility from the unchanged chase camera. Initial pickup guides the character around the hull rather than through its centre. The speed penalty is a separate transient controller multiplier: normal movement settings are never edited. It applies to forward, reverse and turbo maximum speeds; vertical controls, steering and camera preferences are preserved.

TowRope is one reused, gold, six-sided tube with 18 segments (114 vertices / 216 triangles). Position buffers and material are retained across frames and missions. End-ring centres always match the actual anchor and passenger position. Slack reduces with speed; the line has gentle underwater movement. Interior samples remain above terrain. There is no rope physics dependency.

Passenger collision uses a separate consumer of the existing CollisionWorld and spatial grid, leaving the player's contact/audio state untouched. Target lifting anticipates low obstacles; swept collision and terrain clearance keep the character above the seabed. Exceptional obstruction or a large vehicle-switch displacement can recover the passenger to a nearby clear position after a bounded check. A short recovery grace prevents that correction from instantly completing a mission.

## Tuning

All main values are in `src/config/rescueConfig.js`, with code comments:

| Setting | Default | Purpose |
|---|---:|---|
| enabled / towing.enabled | true | Enable escort encounters and towing |
| discoveryRadius | 2.5 m | Close gap from hull to crew centre |
| deliveryRadius / deliveryOffset | 32 m / [0,20,0] | Shared 3D delivery area |
| maxActiveRescues | 1 | MVP cap; zero disables starts, values above one remain capped to one |
| attachmentHeightRatio | .45 | Passenger-side rope attachment relative to model height |
| ropeLength / ropeThickness / ropeSag | 5 / .045 / .35 m | Rest distance, tube radius, stopped slack |
| ropeSegments | 18 | Fixed visual geometry budget |
| followSmoothness / catchUpSpeed | 4 / 6 m/s extra | Damping and bounded pickup corrections |
| lateralOffset / lateralSway / verticalBob | 1 / .15 / .12 m | Visible loose trailing motion |
| speedMultiplier | .9 | Temporary towing top-speed penalty |
| terrainClearance | .18 m | Clearance under the character's feet |
| maxStretch / recoveryDelay | 12 m / 1.2 s | Exceptional stuck/switch safety recovery |
| hud.enabled / highlightOctopod | true | Compact mission status and existing base marker |
| completion.showMessage / showEffect | true | Brief status, existing burst and sound |
| completion.messageSeconds | 4 s | Gameplay-time status duration |

## Files and validation

New modules: rescueConfig, RescueProgress, towMath, TowRope and RescueSystem. CrewDiscovery now coordinates the found/towing/rescued states; OctopodCrew returns only rescued crew home. Game connects the callbacks, updates towing after vehicle collision resolution, and rebinds it on switching. SubmarineController applies the transient speed factor. Compass and the existing CSS add mission emphasis. The existing crew panel retains its artwork/presentation and starts escort on dismissal.

Completed checks:

- All 199 Node tests pass, including close hull distance and vertical rejection for every GUP, migration/reset, interrupted saves, one-active limits, temporary normal/reverse/turbo speed behavior, smooth trailing and both-end delivery checks.
- `rescue-browser.cjs` uses the loaded scene and real movement/collision controllers. It verifies pickup, forward travel, turns, climbing, diving, braking, stopping, fixed rope endpoints/resources, terrain/proxy clearance, a blocking-rock scenario, transfer across all eight GUPs, a real controller-driven return, delayed delivery until the passenger enters the area, home placement, cleanup and saved completion after reload. It also verifies interrupted reload and resume without replaying the panel.
- `crew-discovery-browser.cjs` verifies all 64 close character/GUP approaches, eight existing portraits, button/close/Escape starts, phone/tablet layouts, unfinished progress after reload and version-1 migration.
- `gameplay-reset-browser.cjs` checks cancellation preserves an active tow; confirmed reset clears all three discovery types, the active mission, rope and penalty while keeping preferences/unrelated storage.
- `rescue-mobile-browser.cjs` drives the live game with touch-forward input in an iPhone-shaped touch-enabled context, verifying moving vehicle/passenger, visible rope, stable geometry and compact HUD. Existing marine collection, fleet switching/discovery and compass browser regressions also pass.
- The production build validates GLB assets and versions the module graph. There is no separate lint script in package.json; `git diff --check` validates patch whitespace.

## Remaining limits

Phone/tablet checks are desktop browser emulation, not physical iPhone/iPad performance or touch-device playtests. Rope geometry is visual and may clip a reef proxy during a tight turn; it does not wrap around obstacles. Passenger collisions are conservative proxies. Exceptional safety recovery may reposition a trapped passenger near the GUP rather than simulate an unwrapping rope. Idle standing rigs are reused while floating; no new towing pose or character model was introduced. Fine-tuning motion, rope visibility and delivery radius on physical devices remains a gameplay balancing step.
