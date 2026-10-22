# Verification — October 22, 2026

## Automated, passed

- Five Node controller/terrain regression tests: forward, reverse, turning, vertical thrust; hover stabilization; seabed clearance and water ceiling; extended boundary approach; deterministic PRNG and smooth terrain.
- Production builder validates GLB magic and declared byte lengths for all four models.
- HTTP smoke test against `/dist/` (a non-root subpath): index, entry point, game module, Three.js, loader dependencies and every runtime GLB return 200 with nonempty data; all model responses start with GLB magic.
- Production package contains local vendor modules; no runtime CDN dependency.

Commands: `node --test tests/*.test.js`, `python tools/build.py`, `python tools/check_http.py http://localhost:5174/dist/`.

## Browser checks, passed in desktop Chromium / app browser

- Game loads immediately with visible Blender model, rolling sand, scenery, turquoise fog and lit materials.
- No captured console errors or warnings in the production scene.
- Keyboard forward input exercised; ascent held for 1.8 seconds changed depth from 38.0 m to about 30.7 m.
- Mouse drag changed camera to a clear three-quarter view.
- Controls/help panel opens; manual touch-control toggle reveals directional and vertical controls.
- Holding the on-screen Ascend button for 1.5 seconds changed depth from 38.0 m to about 32.1 m. Pointer release restored hover stabilization.
- Four Blender renders inspected: hero, side, rear, top. Corrected protruding mouth patches and softened fin edges, regenerated source and GLB.

## Implemented but not independently verified on target hardware

- Real iPhone Safari, simultaneous multiple fingers, safe-area behavior, portrait/landscape rotation, and sustained device frame rate require an actual iPhone.
- Camera auto-return and propeller use frame-based runtime animation; manual visual spot checking is not a full hardware compatibility test.
- Scenery is decorative and not collidable, as requested.

## Deployment

Uploaded to `kevinMejia/Octonauts-Oceanbound` and configured Pages to use GitHub Actions on October 22, 2026. The local Git repository includes the editable Blender sources, generators, runtime GLBs, preview renders and Pages workflow.

Model fidelity limitation: no clean rear/top production orthographics; rear details and interior are approximate. This is a simplified, reference-guided model rather than an exact show asset.
