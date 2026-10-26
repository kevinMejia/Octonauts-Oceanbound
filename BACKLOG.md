# Development backlog

Read this record with AGENTS.md at session start. Keep active scope, authorization,
dependencies, verification, and the next action current. A backlog entry alone is
not implementation approval. This is not a background scheduler.

## Active task

| ID | Request | Priority | Authorization | Status | Dependency / next action |
| --- | --- | --- | --- | --- | --- |
| RESCUE-003 | Reposition the existing rescue direction arrow above and slightly ahead of the active GUP | Current | Explicit user implementation request; no task was active on arrival | Planning | Project Manager investigation, scoped implementation, independent QA, full tests/build, dedicated PR |

Checkpoint: branch `fix/rescue-arrow-above-gup`, based on main commit
`637743a324c8ab6b18d677a19c10e1fe1dda99dd`. Real planning subagent
`rescue_arrow_project_manager` is investigating the existing HUD-rendered arrow,
world-space placement, heading-independent target bearing, and mission lifecycle.
Reuse the existing arrow/navigation architecture and appearance; expose height,
forward offset, scale, and position/rotation smoothing in existing configuration.
Support all playable GUPs, including GUP-X. Preserve towing, rescue completion,
discovery progression, and the GUP-X camera. Implementation and QA follow planning
sequentially. No merge or deployment is authorized.

## Queue, in priority order

No additional feature requests, bug reports, or improvement ideas are queued.
Do not automatically start new work. For each incoming request, add a row with:

| ID | Request / scope | Priority | Authorization | Status | Dependencies / next action |
| --- | --- | --- | --- | --- | --- |

Use `proposed`, `queued`, `active`, `verifying`, `blocked`, or `delivered`. Have the
Project Manager triage requests and record the recommendation. A recommendation
to include a request in current scope still needs explicit user approval before
implementation. Explicitly approved work does not require repeated approval.

## Delivered work and remaining verification

| ID | Request | Delivery | Verification / qualifications |
| --- | --- | --- | --- |
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
