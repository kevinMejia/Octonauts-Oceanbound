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

### Underwater audio and music

`src/audio/AudioManager.js` owns a master bus and independent music, propeller, bubbles, and ambience buses. Gameplay envelopes feed user-volume buses, so propulsion never overwrites preferences. Existing movement and bubble visuals are unchanged. `UnderwaterAudio.js` retains compatibility exports; it does not create a second system.

Runtime assets (included and versioned by `python tools/build.py`):

- `assets/audio/oceanbound-background.mp3`
- `assets/audio/gup-b-propeller.mp3`
- `assets/audio/underwater-bubbles.mp3`
- `assets/audio/underwater-ambience.mp3`

The supplied `assets/sounds/background_music.weba` is stereo Opus/WebM, approximately 172.14 seconds. The runtime MP3 is a 160 kb/s conversion of the complete recording for Safari compatibility; the original remains intact. Numerical inspection found a quiet opening (first-second RMS 0.00027) and a different ending (last-second RMS 0.01549), so a direct seamless join is not assumed. This is signal analysis, not a listening assessment.

`MusicController.js` streams two HTMLAudioElements through Web Audio. Playback starts at zero on interaction, fades in over 3 seconds, and overlaps the next complete recording with the outgoing final 4 seconds using equal-power gains. The outgoing track plays through its end. Each handoff follows the current media clock, avoiding accumulating timer deadlines. Two elements reuse one URL and remain bounded in number; full music tracks are not decoded into PCM buffers. Propeller and ambience use persistent decoded loops with 60 ms seam overlaps. Bubbles use short, randomized non-looping bursts from the original recording. Music transition duration, fade-in, fade-out (2 seconds), and conservative mix headroom are configurable in `musicConfig`; `crossfade:0` enables native looping for a future verified seamless recording. Listening is still needed to judge musical phrasing and perceived loudness at this join.

The HUD badge opens the Octopod control monitor directly; its Audio tab provides five percentage sliders, Enable music, Mute all audio, and Reset to Defaults. Defaults live in `AudioSettings.js`: master 80%, music 35%, propeller 65%, bubbles 50%, ambience 40%. Sliders smooth over short intervals; disabling music fades its transport gate over 2 seconds, then pauses it. Re-enabling continues from its position. Opening settings and moving sliders never recreate music elements or seek the music. Existing input guards keep settings controls from driving the submarine.

Preferences use `oceanbound.audio.v1` and validate each field independently. The prior `oceanbound.masterVolume` migrates when no versioned preferences exist. Thus an existing saved master level takes precedence over the new 80% default until Reset to Defaults. Blocked storage falls back to session settings and unrelated preferences remain untouched. Saved bus gains apply before playback becomes audible.

The first pointer, touch-end, or keyboard gesture creates/resumes audio and primes both music elements for Safari. Visibility/pagehide suspends the context and pauses media; pageshow/visibility attempts resume at the current position, with subsequent gestures retrying browser restrictions. Background suspension is immediate because browsers may freeze the page before a fade can complete. Explicit `setPaused(boolean)` and `setSceneMusicEnabled(boolean)` hooks fade music for pause/scene integrations; the vehicle selector now uses the pause hook. Missing/undecodable effects disable only their own layer; failed music remains optional. `dispose()` clears timers/listeners, releases media URLs and sources, stops effects, and closes the context.

Validation: all 86 Node tests pass, including preferences/migration, independent user and gameplay gains, response curves, reverse/braking, acceleration, loop seams, repeated music handoffs, fades, suspend/resume and missing assets. Production build passes. Browser UI verification confirmed the collapsible controls and independent percentage changes, with no audio load warnings/errors observed. Screenshot: `docs/audio/settings.png`. Full-track listening, perceived loop quality and physical iPhone/Safari playback have not been verified. Manually check first-touch unlock, a complete recording and repeated joins, disable/re-enable, mute, reload persistence, app switching and iPhone lock/unlock before accepting audio quality.


### Octopod settings monitor and camera return

The badge opens the existing native modal directly, with Audio and Camera tabs, keyboard arrow navigation, Close/Escape dismissal, and a 200 ms transition. `src/ui/settings.css` defines reusable bezel/screen colors, accent colors, border size, corner radius and glow. It uses a physical gray bezel and inset turquoise screen, with native sliders and checkboxes. Small viewports use one control column and internal scrolling; the dialog respects safe-area insets and reduced-motion preferences. The submarine input guard and audio manager stay in place; opening settings does not restart music or reload the scene. All camera fields and category-specific resets are preserved. The old dropdown, secondary Settings button and handlers have been removed.

`cameraConfig` exposes `autoRecenterEnabled` (true), `recenterDelay` (1.5 s), `recenterSmoothTime` (0.65 s), and `recenterAngleTolerance` (0.01 rad). Return uses exact critically damped integration for a gentle start and settling over roughly 1.5–2 s. Horizontal offsets wrap to the shortest path; the existing chase calculation continues using the current submarine heading. Active dragging immediately cancels return velocity. Pointer release/cancel or input clearing during a drag starts a fresh delay. Existing saved `returnDelay` remains an alias for `recenterDelay`, so a previously saved custom delay is respected; reset camera defaults to select the new 1.5 s delay. Default angle, distance, height, terrain/collision handling and vehicle physics are unchanged.

### Natural bubble bursts

The supplied bubble MP3 decodes to approximately 1 second. Signal analysis found multiple energy groups in its first 0.75 s and a much quieter ending; decoded peaks exceed full scale. `bubbleAudioConfig` in `src/audio/BubbleBursts.js` defines four short segments (0.21–0.25 s) without changing the source file. Individual envelopes fade in over 25 ms and out over 55 ms, with per-segment attenuation of peaks exceeding full scale. This does not establish listening quality.

The scheduler selects non-repeating adjacent variations with randomized 0.92–1.08 playback rates, 0.65–1 gain multipliers, and movement-dependent intervals spanning approximately 0.18–2.5 s, with occasional longer quiet gaps. The shorter minimum allows occasional overlap of these short segments. Intensity eases with movement/acceleration using the existing visual bubble emission signal. At most three events can overlap; each stays quiet below normal propeller output and routes through the existing user bubble bus and master bus. Stopping prevents new events while existing envelopes finish. Suspension clears active voices and resets the scheduler, avoiding catch-up bursts. Finished nodes disconnect; a future variations list can reference additional decoded buffers without replacing the manager.

Verification includes frame-rate-independent recentering, drag interruption, shortest-path settling, randomized bubble timing, no immediate segment repetition, movement frequency, voice caps, stationary silence and lifecycle cleanup. Browser inspection verified direct monitor access, both tabs, Escape dismissal and internal scrolling at 375 × 667. Desktop and mobile previews are saved under `docs/settings-monitor/`. Full listening assessment and physical iPhone Safari interaction/audio remain manual checks.

### High-detail GUP-B

The playable submarine now defaults to `assets/models/gup-b-high.glb`, the full-resolution Keeks_Q model with all 221,592 evaluated triangles and embedded textures. `assets/blender/gup-b-high.blend` is a separate editable, packed derivative; the supplied original remains untouched. `?gup=original` retains the previous model for comparisons. Both runtime GLBs are included and cache-versioned in the production build.

See [import verification and measured performance](docs/gup-b-import/README.md) for the six Blender angles, actual ocean screenshot, material conversions and raw before/after samples. The imported tail is not a propeller and is not rotated. Movement, camera, collision proxies and audio retain their existing implementations. The benchmark flag pins DPR for comparable samples; ordinary gameplay retains adaptive resolution. No decimation or texture-resolution reduction was applied to the source decals. Physical iPhone/Safari performance remains unverified.

### Local GUP fleet selector

The current GUP thumbnail beneath the existing compass opens a paused, blurred vehicle carousel. Browse GUP-A, GUP-B, and GUP-R with arrows, neighboring cards, dots, horizontal swipes, or keyboard arrows. SELECT/Enter applies the highlighted vehicle; Close/Escape cancels. The shared controller, turbo state, position, heading, velocity, camera, and audio settings survive switching. `PauseState` uses independent ownership tokens; menu dismissal releases only its own token and clears held inputs.

`src/config/vehicleConfig.js` is the fleet registry (model/thumbnail URLs, scale/orientation, collision proxy, rotor, camera and audio profiles). `VehicleFleet` caches CPU assets, retries failed downloads, and rejects obsolete asynchronous selections. `VehicleManager` adapts imported source materials through the existing GUP-B loader and releases inactive GPU allocations without destroying cached images/geometry. Only the selected model is attached to the existing scene; the menu uses PNGs and creates no additional renderers. GUP-B stays the default and its existing binary and Blender source are unchanged.

New third-party exports and all three Blender-rendered thumbnails intentionally remain local under `.local-assets/vehicle-selection/`; original A/R downloads are ignored in their existing `assets/models/Gup-A/` and `Gup-R/` locations. Serve the repository root (`python -m http.server 5173`) to use them. A standalone/public production deployment does not include these private assets. Do not publish this feature's assets without separate authorization. The local import/verification report is `.local-assets/vehicle-selection/REPORT.md`, and local browser checks are `qa.html` and `integration.html` in that folder.

A preserves 270,924 evaluated triangles (including its antenna curve), R 338,572; no decimation was applied. A's actual rear blade has a preserved pivot and speed-dependent rotation. R has no safely identifiable independent propeller, so unrelated fins remain stationary. Blender movie/procedural instrument materials use static baked representations where glTF cannot encode their source shaders. Physical iPhone Safari and subjective audio listening still require device verification.
