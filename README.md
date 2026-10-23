# Octonauts Underwater Explorer

A standalone Three.js underwater exploration proof of concept. Pilot a Blender-authored GUP-B through a 1.6 km seeded sandy world. No missions or ground-vehicle physics, or external runtime CDN dependencies.

## Run

Requires Python 3.10+; Node 22+ for tests. No package installation required.

```sh
python tools/build.py
python -m http.server 5173 --directory dist
node --test tests/*.test.js
```

Open http://localhost:5173/. ES modules must be served over HTTP.

W/Up forward, S/Down reverse, A/D or arrows steer, Space rise, Shift dive. Drag the ocean to orbit; camera returns after release. Touch devices receive a proportional analog thumbstick for steering and rise/dive, plus Forward and Brake/Reverse buttons. Touch selection, callouts, magnification, drag and zoom gestures are suppressed on gameplay surfaces, following Little Big Dirt. Landscape is preferred; portrait is supported. Release thrust to hover. Open the hamburger menu, then Settings to adjust camera distance behind (Z, 6-40 m) and height above (Y, 1-20 m). Changes apply live and save on this device; Reset Camera restores the defaults. Turbo uses the same rules as Little Big Dirt: double-tap W/Up and hold the second press, or double-tap the Forward button within 300 ms and hold the second press. Turbo adds 80% forward speed and acceleration, lasts 15 seconds on a full charge (draining 20/3 charge per second), and passively recharges 1/second. Floating lightning restores 25 charge and respawns after 5 seconds. The meter starts empty; depleted turbo requires releasing and rearming.

## Assets and architecture

- `assets/blender/gup-b.blend`: editable vehicle source, with materials and named Propeller parent.
- `assets/blender/underwater-environment.blend`: authored reef library with 24 variations and reduced mobile/distant meshes.
- `assets/blender/environment-*.blend`: legacy scenery source, preserved but no longer loaded.
- `assets/blender/scripts/`: Blender Python generators. Blender 4.2.3 was used.
- `assets/models/`: exported runtime GLBs. Production ships GUP-B, lightning and the new reef library.
- `assets/textures/`: seamless 512px sand/rock maps and caustic light texture; generator in `tools/create_sand_textures.py`.
- `assets/blender/references/README.md`: reference links and documented accuracy limits.
- `docs/gup-b-*.png`: inspected front three-quarter, side, rear and top studio renders.
- `src/vehicles/SubmarineController.js`: independent underwater kinematics, drag, volume limits.
- `src/environment/`: deterministic smooth noise, terrain, instanced Blender scenery, swaying vegetation, caustics, fog and particles.
- `src/input/`: combined keyboard and per-pointer touch ownership; clear on interruption.
- `src/camera/`: terrain-aware damped chase and drag orbit.
- `src/config/`: commented movement, world and camera tuning. Change `seed` to generate another layout.
- `vendor/`: pinned Three.js r168 and loader utilities; license included.

Finite boundaries use an outward velocity falloff across the final 90 metres, followed by a numeric guard. The controller samples bow, center and stern for clearance and prevents ascent above the water ceiling. Scenery is decorative. There is no gravity or fluid solver. Mobile caps pixel ratio at 1.25, omits antialiasing, uses instancing, and avoids shadow maps or volumetrics.

## Environment visual upgrade

See [the visual review and real gameplay screenshots](docs/environment-upgrade/REPORT.md) for the staged before/after comparison, all four requested views, authored assets, performance samples and limitations. Quality profiles live in `src/config/environmentConfig.js`; coarse-pointer devices use reduced geometry and no shadow map. Add `?quality=low` or `?quality=high` to compare without adding a gameplay menu. Device-specific iPhone performance remains unverified.

## Reference project review

Reviewed a separate shallow clone of https://github.com/kevinMejia/little-big-dirt-poc. Used architectural concepts from DrivingInput.js, GameTouchGestures.js, the GLTF showroom loader and the static Pages workflow: separate vehicle/input/view systems, additive pointer ownership, interruption cleanup, GLB assets, relative static paths. Little Big Dirt remains unmodified. TurboBoost/TurboInput behavior, touch guards and lightning-core artwork are ported from that user-owned reference; underwater pickup collection uses a swept 3D sphere. The lightning source is retained in assets/blender/turbo-original.blend, with a core-only editable derivative and extraction script. No showroom, rings or pedestal are loaded into the game.

## Publish to GitHub Pages

Repository: https://github.com/kevinMejia/Octonauts-Oceanbound

GitHub Pages uses the included GitHub Actions workflow. Changes pushed to main are tested, built and published automatically.

Using an authenticated GitHub CLI:

```sh
gh repo create kevinMejia/Octonauts-Oceanbound --public --source=. --remote=origin --push
gh api --method POST repos/kevinMejia/Octonauts-Oceanbound/pages -f build_type=workflow
gh workflow run pages.yml
```

Alternatively create that empty public repository on GitHub, push this local main branch, then choose Settings → Pages → GitHub Actions. The included workflow tests, builds and publishes `dist`. All imports and GLB URLs are relative, including under `/Octonauts-Oceanbound/`.

Game URL: https://kevinmejia.github.io/Octonauts-Oceanbound/

Verify the successful Pages run, then load the public URL, check browser console/network for failures, and exercise movement before declaring deployment complete.

## Verification and remaining limits

See `docs/VERIFICATION.md`. Real iPhone Safari performance and multitouch testing remain outstanding. This is an unofficial fan prototype; source references are linked, not redistributed. Model resembles the classic shark-style GUP-B, but rear details are approximate and it is not an exact production model. No Kwazii character is included.

Camera defaults and validation: [exploration camera report](docs/camera/README.md). Existing saved offsets are retained; use Settings > Reset camera for the new default distance and height.

Visual fidelity recovery, editable showcase source, fixed-view comparisons and performance limitations: [visual review](docs/visual-recovery/README.md).

### Underwater audio

The supplied recordings from `assets/sounds/` have been copied to the runtime paths:

- `assets/audio/gup-b-propeller.mp3`
- `assets/audio/underwater-bubbles.mp3`
- `assets/audio/underwater-ambience.mp3`

Replace the copies in `assets/audio/` when updating sounds. The build ships and versions these files. No music or synthesized effects are generated. `src/audio/UnderwaterAudio.js` owns three persistent looping Web Audio sources with separate gain controls and a saved Settings > Sound volume slider (zero mutes). Missing or undecodable files disable only the affected layer and log a diagnostic; gameplay continues.

Propeller gain follows actual propulsion input, including reverse and depth thrust, with speed and turbo affecting pitch and level. Braking forward motion does not count as reverse propulsion. Bubbles use the same `bubbleRate` signal as visual propulsion bubbles, with a bounded acceleration accent. Ambience remains quiet at rest. Gains and pitch use exponential transitions; decoded recordings receive a 60 ms tail/head overlap for softer loop seams. Conservative layer gains reserve mix headroom.

AudioContext creation/resume happens on pointer, touch-end or keyboard interaction, including a silent buffer unlock for Safari. Sources stay alive across input changes. Hidden pages suspend audio; visibility/pageshow attempts resume, and the next gesture retries if Safari requires it. `dispose()` removes listeners and closes audio resources.

Validation: all 73 Node tests pass, including response curves, reverse/braking, bubble acceleration, headroom, loop overlap, mocked autoplay/visibility lifecycle and missing files. Production build passes. These checks do not verify audible balance, recording-specific loop quality, real browser decoding, or physical iPhone Safari playback. Manually check those with the supplied recordings: tap to unlock, cruise/accelerate/reverse/brake, stop and listen for ambience, mute/adjust volume, switch tabs and return, and lock/unlock an iPhone. Movement/controller code is unchanged.
