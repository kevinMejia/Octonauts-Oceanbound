# Project conventions

Read `README.md` and relevant system documentation under `docs/` before changes.
This is a static browser game with plain JavaScript ES modules, vendored Three.js
r168 in `vendor/`, and Blender-authored assets. No package installation is needed.
Preserve existing compact code style, relative imports, and reusable systems.
Keep behavior and tuning in `src/config/`; avoid new dependencies and duplicated logic.
Preserve gameplay, visuals, physics, assets, and behavior outside the requested scope.

`src/main.js` starts the game; `src/game/Game.js` composes the systems and frame loop.
Vehicle loading/fleet and controllers live in `src/vehicles/`; input, camera,
collision, environment, audio, turbo, rescue, word hunt, discovery, and UI have
dedicated modules. Inspect their actual integration before changing them.
Respect deterministic world configuration, mobile rendering budgets, instancing,
GPU resource cleanup, touch ownership, and persistent settings/progress.

## Checks

- Use Node 22+ and Python 3.10+ per the README.
- `npm test` runs `node --test tests/*.test.js`.
- `npm run build` runs `python tools/build.py`, copies the static site into
  ignored `dist/`, checks GLB headers/lengths, and versions production imports.
- `npm run dev` serves the source on port 5173. To inspect production output,
  use `python -m http.server 5173 --directory dist` after building.
- No lint script or browser automation suite is configured. Static source tests
  do not establish browser, WebGL, touch-device, or measured performance results.

## Multi-agent collaboration

The main Codex session is the coordinator. Use real supported Codex subagent
tools when delegating; never simulate multiple agents in a single response.
Project roles are in `.codex/agents/`: `project_manager` plans requirements,
dependencies and acceptance criteria; `game_developer` implements approved work;
`qa_engineer` independently reviews and verifies it.

For nontrivial features, delegate planning when helpful, then implementation,
then independent QA against the final diff and acceptance criteria. Avoid
unnecessary planning or implementation delegation for trivial tasks, but obtain
independent QA before reporting any feature complete. QA must not be the agent
that implemented the change. Route fixes back to the developer and repeat QA
on affected criteria after fixes are finished.

Keep at most three spawned threads open concurrently, excluding the main session.
Assign explicit file ownership before edits; never edit the same files concurrently.
Run independent read-only analysis in parallel when beneficial. Sequence dependent
implementation and QA. Subagents report to the main session rather than spawning
nested agents; release finished threads using the host's supported lifecycle tools.
Report commands and observed outcomes, untested assumptions, blockers, and whether
agents actually ran. If spawning or custom roles are unavailable, disclose that
limitation rather than claiming independent QA. Never claim browser testing unless
it ran. Do not automatically merge or deploy; pushing to `main` triggers Pages.

## Starting the workflow

Start a new Codex session from this trusted checkout so project configuration and
custom agents can load. Use a current Codex release supporting standalone custom
agent TOML files. Do not change sandbox or approval settings to enable roles.
Example request:

> Implement <feature> using the project multi-agent workflow. Have project_manager
> define acceptance criteria and file ownership, delegate approved implementation
> to game_developer, then have qa_engineer independently review and run checks.
> Keep the main session coordinating, use at most three subagent threads, and
> report verified results and remaining gaps. Do not merge or deploy.

The project config applies to new sessions; it does not reconfigure an already
running host. Some hosted interfaces expose spawning without custom-role selection.
In that case report the limitation and explicitly provide the role instructions
to real delegated agents, without claiming the TOML role was loaded.

Configuration references: [Codex subagents](https://developers.openai.com/codex/subagents),
[config schema](https://developers.openai.com/codex/config-schema.json), and
[configuration basics](https://developers.openai.com/codex/config-basic).

## Incoming requests and persistent backlog

Read BACKLOG.md at session start and before choosing work. Keep the active task,
approved scope, branch/PR, verification status, blockers, and next action current.
Preserve these checkpoints across messages and Codex sessions.

During an active task, treat additional feature requests, bug reports, and
improvement ideas as separate queued requests by default, including related ideas.
Record each request in BACKLOG.md with an ID, scope, priority, authorization,
status, dependencies, and next action. Briefly acknowledge it, then continue the
current approved work and retain its progress and active subagents.

Have the Project Manager evaluate queued requests, identify dependencies, and
recommend whether they belong in the current feature or a future task. Triage
does not authorize a scope change. Do not add queued work to an active
implementation or interrupt/reprioritize it unless the user explicitly approves
the change or says to prioritize the request now. Answer status questions briefly
and resume; do not treat them as cancellation.

Finish the active task's authorized implementation, independent QA, verification,
and requested PR delivery before starting the next task. Resolve blocking QA
findings within the approved scope. At completion, present queued requests in
priority order with dependencies and authorization. Do not automatically start
the next queued task without explicit user approval. An explicit implementation
request can already provide that approval; do not ask again for authorization
already given. An idea or backlog entry alone is not implementation approval.

Keep unrelated tasks on separate branches and PRs. In particular, changes to
these queue conventions and the backlog belong in an infrastructure PR without
gameplay changes. Never merge or deploy automatically.

The backlog is a repository-managed coordination record, not a background
scheduler. Do not promise asynchronous processing unless the current host
actually supports it. If a new message interrupts execution, preserve the current
checkpoint, inspect task/subagent/tool state, and resume from the last completed
step before considering queued work. A tool call may have changed local or remote
state before interruption; inspect its result before retrying mutations. Do not
restart analysis, abandon active agents, or switch scope merely because a new
request arrived.
