# Straight sleeping-dolphin course

The dolphins now swim a fixed +Z course at the configured 4 m/s. Each holds its
original formation offset (X -2, +2, 0; Z 0, -1, -6) and Y=11 depth. The route
update takes elapsed simulation time only: GUP position, throttle, speed, turbo,
steering and release/coasting do not feed the dolphin course.

Removed the player-following lateral offset, sinusoidal route wobble, vertical
bob, root-body sway and hit-induced root displacement. Each rendered model faces
forward on the exact route position. Existing closed eyes and phased tail strokes
remain. Debris collision detection, strike messages, three-strike failure,
150-second distance completion, replay and exit remain. GUP controls, camera,
health, scenery and the preceding bounded-timestep fix are unchanged.

Verification: all 411 Node tests pass, including new full-route straight-lane /
depth assertions and debris-hit path invariance. Production build and diff checks
pass. Actual production Edge software WebGL tests the real mission/model updates
with keyboard input for idle, acceleration, accelerator release, reverse, steering
and turbo. Each case checks 90 dolphin/model poses over 3 simulated seconds;
all finish at identical dolphin positions although the GUP follows different
trajectories and speeds. Root rotation stays zero. The existing live timing,
pause/resume, 60/10 FPS swept debris-contact parity, single render per frame,
stall bound, completion and return checks also pass with no page errors.

Evidence: [browser-results.json](browser-results.json). Run the extended
`tests/dolphin-timing-browser.cjs` with existing Playwright tooling, a production
server, CHROMIUM_PATH, DOLPHIN_TEST_URL and optional DOLPHIN_TIMING_RESULTS.

Single agent, no independent agent QA under the continuing mission instruction.
Physical iPhone Safari and sustained native GPU performance remain unverified.
The existing long-stall timing guard remains: frames beyond 250 ms discard excess
simulation time. Course positions themselves never depend on the GUP controls.
