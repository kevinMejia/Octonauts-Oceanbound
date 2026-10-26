# Development backlog

Read this record with AGENTS.md at session start. Keep active scope, authorization,
dependencies, verification, and the next action current. A backlog entry alone is
not implementation approval. This is not a background scheduler.

## Active task

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
