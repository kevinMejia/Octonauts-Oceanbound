# Octonauts Underwater Explorer

A standalone Three.js underwater exploration proof of concept. Pilot a Blender-authored GUP-B through a 1.6 km seeded sandy world. No missions, collectibles, ground-vehicle physics, or external runtime CDN dependencies.

## Run

Requires Python 3.10+; Node 22+ for tests. No package installation required.

```sh
python tools/build.py
python -m http.server 5173 --directory dist
node --test tests/*.test.js
```

Open http://localhost:5173/. ES modules must be served over HTTP.

W/Up forward, S/Down reverse, A/D or arrows steer, Space rise, Shift dive. Drag the ocean to orbit; camera returns after release. Touch devices receive a multitouch directional pad and separate rise/dive buttons. The Controls panel also enables touch controls manually. Landscape is preferred; portrait is supported. Release thrust to hover.

## Assets and architecture

- `assets/blender/gup-b.blend`: editable vehicle source, with materials and named Propeller parent.
- `assets/blender/environment-*.blend`: three reusable scenery libraries.
- `assets/blender/scripts/`: Blender Python generators. Blender 4.2.3 was used.
- `assets/models/`: exported runtime GLBs; production ships these only.
- `assets/blender/references/README.md`: reference links and documented accuracy limits.
- `docs/gup-b-*.png`: inspected front three-quarter, side, rear and top studio renders.
- `src/vehicles/SubmarineController.js`: independent underwater kinematics, drag, volume limits.
- `src/environment/`: deterministic smooth noise, terrain, instanced Blender scenery, swaying vegetation, caustics, fog and particles.
- `src/input/`: combined keyboard and per-pointer touch ownership; clear on interruption.
- `src/camera/`: terrain-aware damped chase and drag orbit.
- `src/config/`: commented movement, world and camera tuning. Change `seed` to generate another layout.
- `vendor/`: pinned Three.js r168 and loader utilities; license included.

Finite boundaries use an outward velocity falloff across the final 90 metres, followed by a numeric guard. The controller samples bow, center and stern for clearance and prevents ascent above the water ceiling. Scenery is decorative. There is no gravity or fluid solver. Mobile caps pixel ratio at 1.5, omits antialiasing, uses instancing, and avoids shadow maps or volumetrics.

## Reference project review

Reviewed a separate shallow clone of https://github.com/kevinMejia/little-big-dirt-poc. Used architectural concepts from DrivingInput.js, GameTouchGestures.js, the GLTF showroom loader and the static Pages workflow: separate vehicle/input/view systems, additive pointer ownership, interruption cleanup, GLB assets, relative static paths. None of its car physics, gameplay or project files were changed or copied into this game.

## Publish to GitHub Pages

Repository creation and Pages setup require GitHub access with those capabilities. The connected GitHub tool can identify the account but does not expose those operations; the app browser was signed out during implementation. No remote repository or deployment is claimed.

Using an authenticated GitHub CLI:

```sh
gh repo create kevinMejia/octonauts-underwater-explorer --public --source=. --remote=origin --push
gh api --method POST repos/kevinMejia/octonauts-underwater-explorer/pages -f build_type=workflow
gh workflow run pages.yml
```

Alternatively create that empty public repository on GitHub, push this local main branch, then choose Settings → Pages → GitHub Actions. The included workflow tests, builds and publishes `dist`. All imports and GLB URLs are relative, including under `/octonauts-underwater-explorer/`.

Expected URL after successful deployment: https://kevinmejia.github.io/octonauts-underwater-explorer/

Verify the successful Pages run, then load the public URL, check browser console/network for failures, and exercise movement before declaring deployment complete.

## Verification and remaining limits

See `docs/VERIFICATION.md`. Real iPhone Safari performance and multitouch testing remain outstanding. This is an unofficial fan prototype; source references are linked, not redistributed. Model resembles the classic shark-style GUP-B, but rear details are approximate and it is not an exact production model. No Kwazii character is included.
