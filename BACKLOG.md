# Development backlog

Read this record with AGENTS.md at session start. Keep active scope, authorization,
dependencies, verification, and the next action current. A backlog entry alone is
not implementation approval. This is not a background scheduler.

## Standing delivery authorization

User explicitly instructed: "Please merge to main when ever you are done with
something moving forward." Default delivery for completed, verified work is now
commit, merge into main and push so the user can test live. Check Pages delivery
when available, and distinguish pushed from confirmed live. This explicit user
authorization supersedes the earlier no-automatic-merge/deploy default. Honor any
later request to hold a particular change. Do not start unapproved queued work.

## Active task

Current session: SKY-015 is the explicitly requested active implementation; see
its final checkpoint below. The older TURBO-004 checkpoint is retained for future
resumption and has not been started or expanded by this sky task.

| ID | Request | Priority | Authorization | Status | Dependency / next action |
| --- | --- | --- | --- | --- | --- |
| TURBO-004 | Vehicle-specific turbo flame positioning and attachment for every GUP | Current | User explicitly said to resume all work, then confirmed continuing | Active after rescue-arrow PR delivery | Inspect each model, configure emitters, implement attachment, verify, deliver a separate PR |

Checkpoint: [draft PR #4](https://github.com/kevinMejia/Octonauts-Oceanbound/pull/4),
branch `fix/rescue-arrow-above-gup`, initial verified commit `774c20f3063ee71e1eae27b53a34562875ac651d`.
Real agents `rescue_arrow_project_manager`, `rescue_arrow_game_developer`, and
`rescue_arrow_qa_engineer` performed planning, implementation, and independent QA.
The initial 11 focused cases, full 56-file test suite, production build, all-nine-GUP
browser switching checks, and scripted stop/reset/delivery state checks passed.
QA found three remaining issues: the world-horizontal arrow is too edge-on in
phone-sized GUP-X uphill views; paused stop/reset can leave old framebuffer pixels;
and the optional browser harness must let resize settle before rendering captures.
The developer fixed these with bounded intrinsic model presentation tilt, safe mesh-support height, event-only paused redraw invalidation, and corrected capture timing. The revised 15 focused cases, 56-file suite, and production build passed; fresh independent agent rescue_arrow_final_qa re-ran these checks and reviewed final actual captures: PASS, no blockers. Final Chromium captures show recognizable phone-sized arrows; paused cancellation invalidation passes. Physical iPhone behavior and complete manual mission playthrough remain unverified. PR #4 is delivered separately; no merge/deployment performed.
Actual browser evidence is under /tmp/rescue-arrow-qa while this environment lasts;
recreate it from the repository browser harness if temporary artifacts are lost.

Reuse the existing arrow and navigation architecture and appearance. Keep placement,
scale, and damping configurable. Support all nine playable GUPs, including GUP-X.
Preserve towing, rescue completion, discovery progression, and the GUP-X camera.
Repeat independent QA after the fixes. No merge or deployment is authorized.

## Queue, in priority order

| ID | Request / scope | Priority | Authorization | Status | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |
| — | No additional queued requests | — | — | — | TURBO-004 is authorized next by the user’s resume-all-work instruction |

### TURBO-004 — vehicle-specific turbo flame emitters

Execution preference: use a **single-agent workflow** for efficiency; do not spawn
additional agents unless necessary. The existing Project Manager only triaged the
request as future work. Implementation is authorized by the user’s subsequent resume-all-work and continue instructions. Resume single-agent after RESCUE-003 delivery; no new turbo agents are planned.

Approved investigation scope:

- Inspect the existing flame effect, vehicle configurations, and each actual GUP
  model individually; account for model origin, scale, orientation, and hierarchy.
- Determine each vehicle's real visible engine, exhaust, or propulsion outlets.
  Do not copy one generic offset across the fleet. Document ambiguous locations
  and the geometry-based assumptions used.
- Define emitters in existing per-vehicle configuration: array length/count,
  local position, local direction, scale, length, optional intensity multiplier,
  and optional visibility. Support one, two, or multiple outlets without hardcoded
  vehicle-name checks in the core effects implementation.
- Attach emitters to the actual rendered model or an appropriate hierarchy node,
  preserving attachment during acceleration, turning, pitch/roll, slopes,
  airborne motion, and underwater movement. Prevent clipping or detached flames.
- Reuse existing flame colors, animation, activation/expiration, speed/duration,
  audio, and turbo/gameplay mechanics. Do not redesign the visuals.
- Reuse materials/resources; avoid frame-loop allocations and expensive geometry
  work. Correctly clean up or reuse emitters on vehicle changes and disposal.
- Verify all nine current GUPs, directions, attachment, turbo lifecycle, switching,
  no duplicates/lingering flames, and performance scope. Run the full tests and
  production build. Use actual browser inspection if available and identify every
  visually unconfirmed outlet without claiming tests that did not run.
- Deliver a dedicated PR with per-vehicle emitter locations, assumptions, test
  results, and limitations. Do not merge or deploy automatically.

Dependencies/risks identified by Project Manager: individual-model outlet inventory,
coordinate-frame/scale correctness, effect switching and resource ownership,
ambiguous geometry, cached-vehicle duplicates, and additional mobile draw cost.
This is separate from rescue navigation and must not expand RESCUE-003.

Use `proposed`, `queued`, `active`, `verifying`, `blocked`, or `delivered`. Have the
Project Manager triage requests and record the recommendation. A recommendation
to include a request in current scope still needs explicit user approval before
implementation. Explicitly approved work does not require repeated approval.

## Delivered work and remaining verification

| ID | Request | Delivery | Verification / qualifications |
| --- | --- | --- | --- |
| RESCUE-003 | World-space rescue direction arrow | [PR #4](https://github.com/kevinMejia/Octonauts-Oceanbound/pull/4), independent QA passed | 15 focused cases, 56 test files, build, rendered Chromium captures; physical iPhone testing remains |
| WORKFLOW-002 | Noninterrupting request queue and persistent backlog | [PR #3](https://github.com/kevinMejia/Octonauts-Oceanbound/pull/3), open and unmerged; branch `chore/non-interrupting-request-queue` | Independent QA passed; only AGENTS.md and BACKLOG.md change; existing instructions preserved |
| CAMERA-001 | Fix GUP-X steep-slope camera and driving view | [PR #2](https://github.com/kevinMejia/Octonauts-Oceanbound/pull/2), merged by kevinMejia at 2026-10-26 10:14:23 UTC | Independent QA passed; physical iPhone verification and documented rendering limits remain |

Camera checkpoint: commit `c64de6d796fd2908995bdf7cf31412fee81dfc9b`. Real Project
Manager, Game Developer, and QA subagents ran. QA's blocking terrain-ahead
visibility finding was fixed and independently re-reviewed. All 55 test files,
15 focused camera cases, production build, and six exact underwater camera
snapshots passed. Actual local Chromium driving/orbit checks and real pointer
drag/recenter ran. Corrected final captures show a clear 28.86° slope in both
directions and a 41.42° uphill view; evidence and diagnostics are in the camera PR.

The original location still has partial decorative-reef overlap, and extreme
close-distance/narrow-FOV portrait side views can crop the hull. These are
documented qualifications, not evidence of an invalid physics spawn. Physical
iPhone Safari feel, sustained frame pacing/thermal behavior, portrait framing,
and simultaneous steering/orbit touch remain untested. Airborne coverage is
synthetic; the existing tracked controller has no jump mechanic. The agent did
not merge or deploy; the camera merge above was observed through GitHub after
independent delivery. These notes do not authorize a new implementation task.

## Resuming and updating this record

Inspect the active branch/PR, subagent results, and tool outcomes, then resume the
active task from its last completed step. An interrupted tool call may already
have changed remote state; inspect before retrying a mutation. Preserve progress
and active agents rather than restarting. Record new requests before considering
their implementation and briefly acknowledge them while continuing approved work.

At independent QA completion and requested PR delivery, present the queue in
priority order. Mark a task delivered when its requested PR is open and reviewed;
that does not imply merge or deployment. Keep remaining verification and known
limits visible. Do not start an unapproved queued task automatically.

## Local merge checkpoint

User authorized resolving the current merge with the 25-degree arrow. Preserve
the incoming world-space navigation and local discovery/HUD features. Conflicts
in Game.js and RescueNavigation.js resolved; removed the obsolete HUD-camera
elevation setting and use navigation.presentationTilt=25. Verification passed: 313 Node tests, production build, discovery/HUD browser
checks, and world-arrow browser checks across all GUPs and four viewport sizes.
Leave the merge uncommitted for review. TURBO-004 is outside this local scope.

## Arrow angle follow-up

User explicitly requested a 20-degree arrow tilt after the resolved merge was
pushed as d966601. Scope: change navigation.presentationTilt from 25 to 20 and
update associated assertions/documentation. All 15 focused tests and production build pass.
The flatter angle makes projected faces thinner in grazing views; geometry checks
retain a 6-pixel minimum dimension and 80-pixel face area across fleet fixtures.

## Active local presentation request

User explicitly authorized discovery presentation fixes: inspect shared preview
layering, front orientation and neutral lighting; preserve gameplay/assets and
existing animations; single agent. Status: delivered locally. Shared sRGB thumbnail renderer, neutral lights,
front-facing cameras and protected artwork layers implemented. 315 Node tests,
production build, 16 production desktop/phone captures with opaque-pixel overlay
comparisons, celebration and HUD browser regressions pass. Physical Safari remains
unverified. Next: SWITCH-005, explicitly authorized below.

## Authorized next local request

SWITCH-005: user explicitly requested bubble-cloud vehicle transformations, with
terrain-based sediment near the seabed. Single agent; focused reuse of existing
particle pools, safe async selection and 1–1.5 second timing; test and commit on
the current branch. Status: delivered locally after discovery presentation commit 668bc06. Implemented
1.4-second pooled bubble/vapor and terrain-based sediment transition with prepared
model handoff, normal safe placement, camera smoothing and cancellation ownership.
318 Node tests and production build pass. Production Edge checks cover 22 switches,
all nine GUPs, both quality profiles, portrait/landscape, measured concealment,
resource reuse/cleanup, failures, rapid input, real-loop controls and a cancelled
slow-load/new-selection race. Evidence: docs/vehicle-transformation/. Physical
iPhone Safari/performance remains unverified. No push or deployment performed.

## MARINE-006 — Marine preview correction

User requested restoring the previous marine-life viewing angles, preserving
front-facing characters, and enlarging animals within the scanner screen.
Priority: current. Explicitly authorized. Status: delivered locally. Marine-only
camera configuration restored; transparent padding cropped with safety margin
using existing thumbnail path. Colors, layering, world models, and front-facing
characters preserved. 319 tests and production build pass; all 11 animals verified
at desktop and phone sizes with larger longest dimensions and no page errors.
Next: no additional local implementation pending. Physical Safari remains untested.

## HELMET-007 and VEHICLE-PREVIEW-008

User explicitly requested fixing the oversized unrescued-character helmet bases,
removing Tunip's helmet, and restoring GUP discovery-window angles. Single agent.
Status: delivered locally. Fixed stale parent/attached skin transforms before helmet
fitting; removed Tunip helmet geometry via per-character opt-out; restored original
authored GUP discovery images. Preserved frontal crew portraits, larger angled
marine framing, world models, gameplay bounds and rescue persistence. 322 tests,
production build, seven-helmet bounds/reload/reset checks, towing/delivery and
30 desktop/phone discovery captures (all nine GUPs) pass. Physical Safari remains
untested. Earned GUP-X selection/persistence and real Tunip rescue/HUD regression
also pass. Next: no further local implementation pending.

## PARK-009 — Pushable parked GUPs

User authorized implementation with “Yeah let’s try this out”. Status: delivered locally;
single-agent workflow. Approved scope:
lightweight horizontal impulses and damping for nearby, unlocked parked GUPs,
using existing collision proxies/spatial grid, terrain support and fleet poses.
Preserve discovery triggers, safe switching and renderer residency. Displaced GUPs
stay moved for the session and return to berths on reload. Verified: 331 tests,
production build, actual Edge collisions at desktop/phone viewport sizes, sleep,
terrain/obstacle/player blocking, eight-GUP stress, grid synchronization, switching
and reload reset. Evidence: docs/parked-vehicles/README.md. Physical iPhone remains
untested. Next: user playtest; no further local implementation pending. Not pushed.


## FINAL-010 — GUP-X discovery on return to the Octopod

User explicitly requested all other GUPs found followed by return to the base.
Current task on main; delivered locally. Delay earned unlock and existing
discovery modal until near the Octopod; preserve earned saves and settings override.
Verified: 338 tests, production build, actual Edge reward/selection/reload flow,
responsive HUD and rescue regressions; independent QA passed 32 focused tests.
Return radius39 excludes the nearest discovery anchor (A). Physical Safari untested.
Next: no further local implementation pending; not pushed.
PARK-009 was pushed to main as b9902ad at the user's explicit request.

## SURFACE-011 — Seamless above-water exploration

User explicitly authorized implementation; current local task on main. Single
implementation agent, independent QA only. Scope: shared sea level, existing
controller/camera ceiling adjustment, animated two-sided surface, camera-based
atmosphere and pooled crossing effects. No land, new physics, merge or deploy.
Status: completed locally. 340 Node tests, build and diff checks pass. Independent
QA passed after transparency ordering fix. Production Edge high/low checks pass
repeated crossings, opposing camera/hull media, four speeds, orbit, swimming fleet
switches, splashes, real keyboard ascent/dive and pointer drag/recenter.
Evidence: docs/above-water/. Physical Safari/touch/performance remain unverified.
User subsequently authorized commit and push to main. Next: push the verified
feature commit, then user playtest. No next queued task started.

## CYCLE-012 — Day/night cycle and automatic headlights

Explicitly authorized; branch `feat/day-night-cycle`. Primary agent only, as requested;
no independent agent QA. Scope: 5-minute clock, existing atmosphere integration,
one active shadow-free spotlight, persisted Gameplay settings. No new above-water
gameplay, moon/stars/weather/bioluminescence or dependencies.
Status: completed locally. 348 Node tests, production build and diff checks pass.
Production Edge high/low passes full simulated cycle, nine-GUP light ownership,
41-degree GUP-X slope, terrain pixel comparison, UI persistence and render-cost
samples. Additional real clock/UI/night turbo/dive controls and existing GUP-X,
emulated touch rescue escort and word-hunt HUD browser regressions pass.
Evidence and full changed-file list: docs/day-night/README.md. Physical iPhone
Safari/performance and full night mission playthroughs remain unverified.
User authorized committing/pushing day/night only, then explicitly requested
merging into main. Implementation commit: 47d92e0. Main was fast-forwarded
without conflicts or implementation changes; prior verification remains applicable.
Delivery: authorized push to main (triggers Pages). Next: user review/playtest.
Physical Safari remains unverified; no queued surface changes were implemented.

## SURFACE-013 — Limit airborne GUP hovering

User explicitly authorized the flying fix, plus commit/push when done. Branch:
`fix/gup-surface-settling`, from main. Primary agent only. Scope: small breaches
then gentle settling at mean sea level; preserve diving, terrain collision, camera
and GUP-X ground movement. Status: implementation and verification complete.
354 Node tests, production build and diff checks pass. Actual Edge low/high
checks cover 16 swimmer hover/turbo ascent/settle/dive cases, GUP-X ground bypass,
real Space/Shift, camera medium/orbit, repeated crossings, switching and splashes.
Evidence: docs/surface-settling/. Physical iPhone/performance remain unverified.
Delivery: user explicitly authorized merging both completed fixes into main for
live testing. Implementation: 3d2a1b6. Next: combined checks, push and Pages check.

## CYCLE-014 — Nighttime sediment brightness

User explicitly requested investigation of sand clouds remaining daylight-bright
at night. Current branch: `fix/night-sediment-lighting`. Scope: shared unlit cloud
shader ambient color response, including its existing transformation reuse. Primary
agent only; preserve particle behavior/daytime appearance and rendering budgets.
Status: completed locally. Fixed vShade.rgb bypassing scene lighting using one
shared ambient tint, including paused transformation clouds. 350 Node tests,
production build, diff checks and actual Edge low/high before/fixed comparisons
pass with stable draws/textures/programs/pools and no errors.
Evidence: docs/night-sediment/. Physical Safari/performance remain unverified.
Implementation: 1061597. User explicitly authorized merging completed fixes
into main for live testing. Next: combined verification and Pages deployment.

## SKY-015 — Reusable sky and atmosphere

Explicit user implementation request, single agent only. Branch `feat/reusable-sky`.
Scope: independent configurable sky, existing clock integration, camera medium
visibility; preserve existing breach/settling, ground GUP-X and gameplay systems.
Status: implemented and verified locally. 358 Node tests, build and diff check
pass. Production Edge low/high sky, surface controls/crossings, GUP-X, emulated
touch rescue escort and word-hunt HUD checks pass. No subagents or independent
agent QA ran, per explicit single-agent request. Physical Safari/performance and
full manual mission playthroughs remain unverified. Evidence: docs/sky/README.md.
Surface crossing already exists; no physics changes were necessary.
Delivery: user reiterated standing authorization to merge completed work into main
and push for live testing. Next: commit, fast-forward main, push and check Pages.
No queued gameplay work started.

## VIEWPORT-016 — Repeated iPhone orientation transitions

Active explicit implementation request; single agent only. Branch
`fix/iphone-orientation-viewport`. Scope: bounded viewport/body/canvas/projection
synchronization, preserving HUD design, DPR and gameplay. Investigation found
window-only renderer resizing with no late viewport reconciliation.
Status: implemented locally. 361 Node tests, production build and diff check pass.
Production Edge: both starting orientations, 15 settled and eight rapid transitions
each, matching viewport/body/canvas/buffer/aspect, HUD bounds, touch Forward and
no idle resizing/page errors pass. Single agent; no independent agent QA.
Evidence: docs/viewport/README.md. Physical iPhone Safari, safe areas, simultaneous
touch and sustained FPS/memory remain unverified. Next: physical iPhone validation.
User explicitly requested merging to main. Delivery: commit, fast-forward main,
push and check Pages; physical iPhone validation remains outstanding.


## HUD-017 — Unified gameplay HUD

Explicitly authorized implementation, commit and push to main. Single agent only.
Priority: current. Status: verified; delivery authorized. Scope: connected settings/turbo/discovery
assembly and independent notification stack; no mechanics or viewport changes.
361 Node tests, build/diff checks, rendered Edge HUD checks and repeated orientation
regression pass. Evidence: docs/hud/. No subagents ran. Commit 1446c03 pushed to
main; user reports not seeing it live. Verify combined Pages delivery with TIPS-018.
Physical iPhone validation outstanding.


## TIPS-018 — Context-aware welcome tips

Explicitly authorized implementation, single agent only. Priority: current. Status:
verified locally on main. Scope: existing welcome screen, shuffled four-second tips and
existing session progression reads; no persistence/gameplay changes. 365 tests,
production build/diff checks and Edge delayed-loading/ready rotation, completion,
hide/resume, cleanup and orientation checks pass. Evidence: docs/startup-tips/.
No subagents. User explicitly authorized commit/push to main including HUD-017.
Delivery: commit tips, push combined history and verify Pages. Physical iPhone
validation remains outstanding.


## HUD-019 — Custom contoured housing refinement

Explicitly authorized visual refinement; single agent only. Priority: current.
Status: verified locally on main. Scope: one scalable SVG contour, simpler surfaces and
shared typography, preserving controls, state, notifications and viewport.
365 Node tests, production build/diff checks, rendered Edge typography/controls/
live meter/counter/notification checks and repeated orientation regression pass.
Evidence: docs/hud-contour/. No subagents. Next: user visual review; physical
iPhone remains unverified. User explicitly authorized commit and push to main.
Delivery: push verified refinement; user owns deployment verification.
Prior TIPS-018 commit e1bf083 was pushed. User requests no deployment checks.


## HUD-020 — Fitted lower row and full screen texture

Explicitly authorized refinement, single agent. Status: verified on main. Scope:
left-aligned fish/count, straight lower contour, shared TURBO-size typography/icon,
and full housing scanlines. Preserve all state and notification behavior.
365 tests, build/diff checks and Edge rendered size/layout/state checks pass.
Evidence: docs/hud-fitted/. Delivery: commit/push under standing user instruction;
user owns deployment checking. Physical iPhone remains unverified.
