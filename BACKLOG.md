# Development backlog

This repository record tracks requests and task checkpoints. It is not a background
scheduler. An idea or backlog entry does not authorize implementation. Never merge
or deploy automatically.

## Active task

| ID | Request | Priority | Authorization | Status | Dependency / next action |
| --- | --- | --- | --- | --- | --- |
| CAMERA-001 | Fix GUP-X steep-slope chase camera and driving view | Current | Explicit user implementation request | Verifying | Finish rendered checks and deliver the camera PR; do not add queued scope |

Checkpoint: [camera PR #2](https://github.com/kevinMejia/Octonauts-Oceanbound/pull/2)
is open as a draft on `fix/gup-x-steep-slope-camera`; source commit
`27bc96b003bcb5fb79532b3b754831e4e50f8b31`. Real Project Manager, Game Developer,
and independent QA agents ran. Independent QA passed 15 focused cases, the full
55-file suite, production build, and six unchanged underwater camera snapshots.
Its blocking terrain-ahead visibility finding was fixed and re-reviewed.
Browser driving/orbit geometry and real mouse drag/recenter ran in Chromium.
Rendered reef occlusion remains qualified; the environment restarted during the
final clear-slope capture, clearing temporary artifacts. Recreate that capture
after waiting for the startup overlay to detach before claiming visual success.
No physical iPhone testing, merge, or deployment occurred.

## Queue, in priority order

| ID | Request | Priority | Authorization | Status | Dependency / next action |
| --- | --- | --- | --- | --- | --- |
| WORKFLOW-002 | Noninterrupting request queue, project instructions, and persistent backlog | Next | Explicit user request; approved for implementation after current task | Queued | After CAMERA-001 verification and PR delivery, update AGENTS.md and this record, obtain independent review, and open a separate infrastructure PR |

Scope: instructions and backlog only; no gameplay changes. New feature requests,
bug reports, and improvement ideas arriving during active work go into this queue.
Project Manager triage may recommend current or future scope, but does not grant
permission to change active scope. Require explicit user approval to reprioritize
or implement unapproved queued work. Do not ask again for already authorized work.

No other game feature requests are queued or authorized.

## Resuming work

Read AGENTS.md and this file, inspect branches and tool outcomes, then resume the
active task from its checkpoint. An interrupted tool call may already have changed
remote state; inspect before retrying a mutation. Update this record as requests,
authorization, dependencies, verification, or delivery status change. Mark a task
delivered when its requested PR is open and reviewed; that does not mean merged.
