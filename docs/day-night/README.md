# Day/night cycle and GUP headlights

Implemented directly in the existing game on `feat/day-night-cycle`, using only
the primary agent. No subagents or independent-agent QA ran. No dependencies,
assets, movement/controller changes, new scene, renderer, UI redesign or additional
above-water gameplay were introduced. Existing surface exploration remains intact.
User subsequently authorized committing and pushing day/night only on its
feature branch. No merge or deployment is authorized.

## Behavior and architecture

`DayNightCycle` provides one session clock: `game.dayNight.timeOfDay` is normalized
0..1, midnight=0, noon=.5, initially .45 (daylight). Automatic mode makes a full
rotation in 300 elapsed foreground seconds by default. Duration options are
5/10/20/30 minutes. Movement retains its existing capped delta; the clock uses
elapsed delta, with bounded integration steps for long frames. Dawn/day/sunset/night
and light envelopes are smooth. Changing duration keeps the current phase.

The cycle follows existing pause ownership (startup, vehicle selector, discovery
etc.). Hidden-tab visibility resets the timestamp to prevent a catch-up lighting
flash on return. The Settings panel retains its existing behavior. Cycle Enabled
off holds the automatic clock. Day/Night override and freeze that clock; returning
to Automatic fades back to its retained phase, without an immediate visual jump.
Phase itself is session-only; preferences persist through `oceanbound.gameplay.v1`.
A saved Night preview starts in Night without a bright startup frame.

`daylight`, `night`, `warmth` and `headlight` expose effective rendering envelopes
for future systems independently of the retained automatic clock. No moon/stars,
window lights, bioluminescence, weather or night animal behavior is added.

The atmosphere reuses cached colors and references to the directional and
hemisphere lights, fog, surface, sky dome and rays. Day gains are exactly one;
night retains 42% hemisphere and 20% sun illumination, with deeper blue fog and
only an 8% density increase. Warm twilight sunlight and gentle ambient softening
use the same lights. Existing surface/sky shader uniforms receive color gains;
the caustic shader hook shares a daylight uniform across instanced terrain/reefs.
No material traversal/recreation or shader recompilation occurs during the cycle.
Bubbles, sediment, coral debris, ambient particles and other gameplay visuals keep
their existing emission/update rules. Existing emissive objects and HUD are intact.

`VehicleHeadlights` owns one persistent SpotLight and target in the game scene.
The light stays registered even at zero intensity, keeping the lighting shader
variant stable. It has a 34 m range, soft cone, distance decay, no shadows and no
beam mesh. The mount derives from each registry hull's forward length/center;
world-sized offsets use the active group's full quaternion, including swimming
pitch/bank and GUP-X ground slope/ride. Imported group scale cannot stretch the
arm. The same objects update during ordinary, paused and switching renders; no
parked/undiscovered GUP receives a light. Explicit disposal releases both objects.

## Manual test

1. Start normally; daylight remains recognizable. Open Settings > Gameplay >
   Day/Night Cycle. Select Night, close Settings and allow roughly 3-5 seconds
   for the environment and automatic headlight to settle.
2. Travel a few metres above the seabed. Toggle Automatic Headlights to compare
   its soft illuminated patch. Ascend, dive, turn and switch unlocked GUPs.
   GUP-X follows its ordinary ground/slope controls; no flight physics is added.
3. Select Day to fade back; select Automatic to resume the retained clock.
   Cycle Enabled off freezes its phase. Change duration and reload to check
   settings persistence. To watch the entire automatic cycle use 5 minutes.
4. Verify rescues, discoveries, pickups, turbo, orbit/reset and collision effects
   normally. Physical Safari touch/thermal testing is still needed.

## Executed verification

- Node 24.22.1: `node --test tests/*.test.js` passes 348 tests. New tests cover
  full periods at 10/30/60/120 Hz and every duration, phase boundaries, overrides,
  freeze/pause/resume, invalid delta, headlight fades, preferences/migration/denied
  storage, all nine hull mounts/full poses/scale, single-light ownership and disposal.
- Python 3.14.7: `python tools/build.py` passes production imports/GLB checks.
  `git diff --check` passes. No lint script exists. npm is absent from PATH, so
  the exact Node/Python commands used by package scripts were run directly.
- `tests/day-night-browser.cjs` passes in actual production Edge at 390x844 low
  and 1280x800 high: a simulated full 300-second timeline, dawn/dusk/day/night,
  bounded transition increments (maximum .000832 daylight per simulated 60 Hz
  step), all nine real loaded models switching/rotating, one spotlight/no shadows,
  terrain illumination, UI preferences and reload without page/console/GL errors.
  Real terrain at (136,127), GUP-X pitch .718 radians (~41.1 degrees), intersects
  the headlight center ray at 8.5 m. This location retains existing decorative
  reef overlap; the capture is not evidence of unobstructed vehicle framing.
- Headlight on/off image comparisons brighten 10,106 low and 15,229 high pixels
  by more than 15 summed RGB levels. Screenshots are actual gameplay.
- Existing `tests/gup-x-browser.cjs`, `tests/rescue-mobile-browser.cjs` and
  `tests/word-hunt-hud-browser.cjs` pass: GUP-X selection/ground turbo/tracks/
  fallback/reload, real emulated touch-forward rescue escort/rope/HUD, and word-hunt
  slots/dismissal/responsive/reduced-motion behavior. These regressions run with
  default automatic lighting; they are not complete night mission playthroughs.

- `tests/day-night-controls-browser.cjs` passes real UI and keyboard checks:
  normalized clock progression matches 2.128 seconds of actual animation-frame
  time, all duration options apply, Cycle Enabled freezes phase, Night fades on,
  returning to Automatic has no immediate brightness jump, and normal night
  keyboard turbo/diving emits 23 bubbles with ambient particles intact and no
  WebGL/page errors. Timing samples use animation-frame timestamps so slow
  startup compilation cannot bias the clock comparison.

## Performance samples and limits

Actual desktop headless Edge, fixed terrain pose, warmed shaders, 45 samples per
mode. Each timed render includes `gl.finish()`, so these are synchronized render
cost samples rather than delivered FPS or a whole-game CPU/GPU benchmark.
Baseline temporarily omits the spotlight from the same modified scene to isolate
its cost; it is not an earlier-checkout baseline. Low is phone-sized desktop Edge,
not iPhone Safari. High includes existing sun shadows; the headlight adds none.

| Quality | No spotlight median ms | Day median ms | Night median ms | Calls (all modes) | Textures (all modes) |
| --- | ---: | ---: | ---: | ---: | ---: |
| low | 3.4 | 3.5 | 3.5 | 165 | 185 |
| high | 11.2 | 11.2 | 11.5 | 1092 | 186 |

Draw calls, triangle and texture counts stay unchanged across those modes; shader
program counts stay stable after warmup. The low median increase is .1 ms and the
high night increase .3 ms in this sample. Small differences are within a noisy
single-host test; no physical-device FPS claim is made. The light still adds
fragment-lighting work even when daytime intensity is zero, intentionally trading
that bounded cost for stable shaders at dusk and dawn.

Physical iPhone Safari FPS/thermal behavior, real-device multitouch, five minutes
of wall-clock observation and full night discovery/rescue/collectible playthroughs
remain unverified. The complete timeline is verified using delta-time simulation.
No-shadow lights can illuminate through obstacles and imported transparent glass
can respond differently across existing material profiles. A GUP far above the
seabed will illuminate nearby obstacles rather than an out-of-range ocean floor.
Do not interpret that finite-range limitation as missing light ownership.

## File inventory

- New: `src/config/dayNightConfig.js`, `src/environment/DayNightCycle.js`,
  `src/vehicles/VehicleHeadlights.js`.
- Adapted rendering/integration: `src/environment/UnderwaterAtmosphere.js`,
  `src/environment/waterCaustics.js`, `src/game/Game.js`.
- Settings: `src/ui/gameplayPreferences.js`, `src/ui/Settings.js`,
  `src/ui/settings.css`.
- Tests: `tests/day-night.test.js`, `tests/day-night-headlights.test.js`,
  `tests/day-night-browser.cjs`, `tests/day-night-controls-browser.cjs`,
  `tests/gameplay-settings.test.js`.
- Coordination/docs: `README.md`, `BACKLOG.md`, this directory's report,
  actual day/dusk/night/headlight/settings/slope PNGs and raw result JSONs.
