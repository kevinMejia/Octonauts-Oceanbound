# Dolphin Rescue slow-frame timing

The user observed dolphins slowing while accelerating. The first source-only
answer inspected the fixed 4 m/s route setting and missed simulation-clock loss.
Actual production-loop telemetry then reproduced real slowdown under software
WebGL load. It did not establish a substantial acceleration-specific trigger on
the user's device.

## Cause and fix

Game previously passed min(elapsed, 0.05) to the mission. At 10 rendered FPS,
only 0.5 simulation seconds advanced per real second, so the nominal 4 m/s route
advanced at 2 m/s. Dolphins, debris, movement and animation all used that clock.

Only the active Dolphin Rescue branch now passes real frame elapsed time. The
mission runs matching dolphin/debris/controller/collision/camera updates in
steps of at most 1/60 second and renders once. GUP movement and turbo retain
existing parameters and control ownership. HUD, compass, ambient particles and
audio envelopes update once per rendered frame; collision audio receives each
physics contact through its existing rate limits. The scene clock advances by
the amount actually simulated. Free-roam timestep handling is unchanged.

Configuration in dolphinRescueConfig.timing sets maxStep=1/60 and
maxFrameTime=0.25: at most 15 steps per frame. Frames up to 250 ms recover all
elapsed time; longer stalls deliberately discard excess without accumulating a
catch-up queue. Launch/replay and pause/resume drop the first frame delta, so
loading or modal time cannot propel the mission forward. Existing visibility
handling resets the frame timestamp when the tab changes visibility.

The route stays 4 m/s, with the same formation, debris rules, 150-second route,
completion/failure conditions and camera profile. These are timing corrections,
not new movement or automatic player thrust.

## Observed checks

- Node 24: `node --test tests/*.test.js`: all 409 tests pass. Six new cases verify
  route speed at 60/30/20/10/6/4 FPS, normal/turbo steering/travel/charge parity,
  bounded steps and stall debt, invalid deltas, terminal-state early exit, and
  scripted 150-second completion / three-strike failure at slow frame rates.
- `python tools/build.py`: production build, GLB checks and cache versioning pass.
- `git diff --check`: pass.
- Real production Edge software-WebGL at 390x844: continuous rendered idle,
  acceleration and turbo consume exactly the accepted elapsed-time budget.
  Dolphins advance 4 m per simulated second in every phase. Before the fix the
  same diagnostic measured 1.164 m per real second idle, 1.162 accelerating and
  1.145 in turbo at approximately 6 FPS. After the fix, live rendered phases
  measure 3.522 / 3.720 / 3.737 m per real second. Individual stalls above the
  safety cap and render scheduling still limit wall-clock recovery.
- Actual mission owner at scripted 60/10 FPS: matching GUP travel and speed,
  matching swept debris contact/rebound, 90/15 renders for 1.5 seconds (one per
  frame), 250 ms cap after a three-second stall, no queued debt, immediate stop
  on completion, working return to the original free-roam controller.
- Actual modal pause holds mission time; the first resumed frame advances zero.
  No page errors in the browser check.

Raw evidence: [before-results.json](before-results.json) and
[browser-results.json](browser-results.json). The optional browser harness is
`tests/dolphin-timing-browser.cjs`; run with existing Playwright via NODE_PATH,
CHROMIUM_PATH for Edge/Chromium and DOLPHIN_TEST_URL for the served production URL.
The existing dolphin touch harness passes simultaneous steering/Forward,
release and normal camera/orbit return; its latest results are retained with the
main mission docs.

One agent only under the continuing user instruction. No independent agent QA.
Physical iPhone Safari, sustained native-GPU FPS, listening and full manual
escort remain unverified. Rendering below four FPS or individual stalls beyond
250 ms can still slow the simulation; this guard preserves bounded CPU work and
collision safety. The test does not claim rendering itself became faster.
