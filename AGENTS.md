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
