# Nighttime sand-cloud lighting fix

Branch: `fix/night-sediment-lighting`. Primary agent only. No commit, push or merge
performed. Flying/surface movement is a separate proposed request, not included.

The sediment billboard fragment shader wrote its fixed per-instance RGB directly
to the output. Fog affected it, but scene lights did not, so close sand clouds
remained daylight-bright at night. Heavy grains and rock/coral fragments already
use lit standard materials and need no change.

`particleLighting.js` now owns one shared color uniform. The existing atmosphere
updates it from the current smooth day/night envelope, with its night gain in
`dayNightConfig.night.particleTint`. The cloud fragment multiplies its existing
RGB by that uniform before tone mapping. Full day uses exactly (1,1,1). Emission,
alpha, noise, geometry, motion, collision behavior, pools and draw counts are
unchanged. The transformation effect reuses this same shader/uniform so its
sediment and vapor cannot retain a stale daytime color while paused. There are
no scene traversals, new passes, textures, light objects or per-frame allocations.

## Verification

- `node --test tests/*.test.js`: 350 passed, including two new shared-tint and
  material/pool-ownership tests, plus existing transformation coverage.
- `python tools/build.py`: passed. `git diff --check`: passed. No lint script is
  configured. Direct Node/Python commands match package scripts; npm is absent.
- `tests/night-sediment-browser.cjs`: actual production Edge, 390x844 low and
  1280x800 high, no page/console/WebGL errors. Each scene uses the same nine frozen
  clouds and camera at night. Before images temporarily set tint=1 to reproduce
  the old shader's daylight color; fixed images use the clock's nighttime value.
  10,129 low and 13,962 high pixels darken by over 12 summed RGB levels. Mean
  brightness in those changed pixels is ~66% of the before value. Day and return
  to Day restore unity, including transformation clouds through the same uniform.
- Materials, active cloud counts, fixed pool capacities, textures, shader-program
  counts and draw calls remain identical across before/fixed night renders.
  Counts depend on the visible pre-existing world and quality; raw JSON and actual
  day/before/fixed PNGs are saved here. This is not a mobile FPS measurement.

Physical iPhone Safari and sustained performance remain unverified. The tint is
an inexpensive ambient response, not volumetric lighting or headlight scattering.
Local headlight illumination of transparent cloud interiors is not simulated.

Changed runtime files: `src/environment/particleLighting.js`,
`src/environment/UnderwaterAtmosphere.js`, `src/config/dayNightConfig.js`,
`src/effects/EnvironmentalInteractions.js`, `src/effects/VehicleTransformation.js`.
Tests: `tests/particle-lighting.test.js`, `tests/night-sediment-browser.cjs`.
Coordination: `BACKLOG.md`; this report, screenshots and result JSONs.
