# Reusable sky

Implemented on `feat/reusable-sky` by the primary agent only, as requested. No
subagents or independent agent QA ran. User reiterated standing authorization to
merge into main and push for live testing; delivery proceeds under that instruction.

`SkyEnvironment` owns one 224-triangle camera-centered sphere and one shader
material. Far-plane projection keeps it at infinite visual distance, including
when the camera changes elevation. Depth testing preserves opaque world geometry;
its early transparent ordering puts it behind the existing water and glazing.
The shader combines a configurable horizon/zenith palette, warm twilight,
stylized sun and softly shaded moon, directional stars with subtle twinkle, and
two scales of drifting cloud noise. There are no textures, lights, render targets,
extra passes, traversals, resource changes at crossings, or additional loops.
`dispose()` removes the mesh and releases its geometry/material.

The existing `DayNightCycle` remains authoritative: midnight=0, noon=.5, default
300 seconds. Sky directions consume `timeOfDay`; effective `daylight` drives
colors, stars and celestial visibility. Existing Day/Night overrides select fixed
celestial poses with a visual smoothing filter; this filter does not advance time.
Clouds and twinkle use the existing gameplay visual elapsed time independently
of the day/night phase. Pausing stops cosmetic motion. Existing headlights and
clock settings are unchanged. The ocean's directional light approaches the sky
sun direction in daylight above water and retains existing night/deep lighting.

## Another level

```js
import {SkyEnvironment} from './environment/SkyEnvironment.js';
const sky=new SkyEnvironment(scene,{
 clouds:true,cloudSpeed:.008,cloudCoverage:.45,brightness:1,
 dayZenith:'#238be1',dayHorizon:'#aadff5',
});
// In that level's existing update/render infrastructure:
sky.update(elapsedVisualSeconds,existingDayNightCycle,camera);
// At level teardown:
sky.dispose();
```

All defaults are in `src/config/skyConfig.js`. Independent flags are `enabled`,
`sun`, `moon`, `stars`, and `clouds`; palette, brightness, cloud coverage/speed and
disc sizes are configurable. A plain clock reference with `timeOfDay` and
`daylight` works; optional `settings.timeOfDay` supports the game's overrides.
No water, fog, GUP, Octopod or underwater module is imported by the sky.
A future land level owns its own fog and lights and leaves visibility at its
default of one. No land level was implemented.

## Ocean integration and boundaries

`UnderwaterAtmosphere` is the adapter. It passes existing camera/local-wave
`airBlend` as opacity, preserving the current underwater dome, fog, particles,
rays and water blend. The sky draw is skipped at zero air visibility, including
deep underwater. Mean sea level is `worldConfig.surface` (46 m). Preparation state
enters within 5 m of the surface and releases beyond 7 m; actual visibility still
requires the existing camera air blend. Resources are created before the game's
existing startup compilation. Three r168's compile traversal includes hidden
materials, also covering context restoration. No asset loading occurs at crossings.

Architecture inspection found surface crossing already complete. Swimming GUPs
use `surfaceVertical` for brief breaches followed by settling; a 2 m numeric
ceiling and existing horizontal boundaries prevent flight/escape. ChaseCamera
already crosses the surface without a height clamp. GUP-X still takes its separate
tracked-ground path. No physics, controls, collision or camera files changed.
Existing water limitations remain: approximate waves, no refraction or reflections
of scene geometry, and no per-pixel clipping of partially submerged transparent
hulls. There is no remaining boundary work needed for this sky integration.

## Executed verification

- Node 24.22.1: `node --test tests/*.test.js` — 358 passed. Focused sky tests cover
  shared-clock ownership, half-cycle movement/night, smooth override poses,
  camera translation, independent configuration, visibility, and resource disposal.
  Existing rescue/discovery/collectible/turbo/controller tests remain passing.
- Python 3.14.7: `python tools/build.py` — passed GLB/import/version checks.
  `git diff --check` passed. npm is absent from PATH, so the exact commands from
  its scripts ran directly; no lint script exists.
- Actual production Edge, `tests/sky-browser.cjs`, low 390x844 and high 1280x800:
  dawn/day/dusk/night samples, moon/sun directions, night headlights, repeated
  depth crossings, no deep sky draw, stable warmed shader counts, no GL/page/console
  errors. Cloud-only pixel comparisons at a held clock changed 136,134 low and
  394,488 high pixels after 30 visual seconds. Day/sunset/night PNGs were captured
  and visually inspected. They deliberately aim at the celestial objects.
- Existing `tests/surface-browser.cjs` passed low/high using an in-memory output
  path substitution to preserve earlier evidence. It exercises real Space/Shift,
  pointer orbit/recenter, repeated breaches/dives, opposite camera/hull media,
  reverse/cruise/turbo speeds, swimming vehicle switching, bounded splashes.
  Scripted 60 Hz maximum camera step was .08334 m; no GL/page/console errors.
- Existing `tests/gup-x-browser.cjs`, `tests/rescue-mobile-browser.cjs`, and
  `tests/word-hunt-hud-browser.cjs` passed: ground turbo/tracks/selection/reload,
  emulated touch-forward escort/rope/HUD, and collectible HUD behavior/layout.
  These do not establish full manual mission playthroughs or physical touch behavior.

## Performance evidence and limits

The added sky costs one draw, 224 triangles, zero textures; it is absent when
submerged. Resource/shader counts stayed stable across the sampled phases and
crossings. `low-results.json` and `high-results.json` include synchronized
`gl.finish()` render samples (30 after 5 warmups) with sky hidden/visible in the
same scene. Low medians were 2.4/2.1 ms and high 2.7/2.5 ms; these noisy desktop
samples show no measured slowdown here and do not imply that adding the sky makes
rendering faster. Calls increased exactly one; texture counts were unchanged.
This isolates the sky draw, not the previous checkout or whole-game performance.

Physical iPhone Safari compatibility, sustained device FPS/thermals, and full
manual night rescue/discovery/collectible playthroughs remain unverified. No
physical-mobile performance guarantee follows from desktop Edge emulation.

## File inventory

Created: `src/config/skyConfig.js`, `src/environment/SkyEnvironment.js`,
`tests/sky.test.js`, `tests/sky-browser.cjs`, this report and the captures/raw
results in this directory. Modified: `src/environment/UnderwaterAtmosphere.js`
and `BACKLOG.md`. No assets, dependencies, UI or gameplay modules changed.
