# Underwater discovery celebration

The existing discovery dialog keeps its artwork, layout, typography, colors, responsive rules, and vehicle-selection behavior. Its discovery event now starts a single screen-space Canvas 2D celebration instead of a world-space bubble burst.

## Implementation

- `src/ui/DiscoveryCelebration.js`: front/rear bubble and particle rendering, protected artwork/close-button areas, capped pixel density, visibility handling and resource cleanup.
- `src/ui/discoveryCelebrationMath.js`: bounded particle simulation, buoyancy and one-shot timing.
- `src/ui/DiscoveryModal.js`: starts/stops effects and optional sound with the existing modal lifecycle.
- `src/ui/discovery.css`: delayed soft entrance, artwork reveal, light sweep and reduced-motion styling; existing dialog design retained.
- `src/audio/DiscoverySound.js`: short, non-looping underwater bubble cue using the existing decoded bubble buffer and audio buses. An authored cue can replace the supplied buffer later; no placeholder chime or external asset was added.
- `src/audio/AudioManager.js`: PLAY authorization, mute/volume/context gates and lifecycle integration through the existing Bubbles and Master controls.

Timeline: bubbles/glow at opening, modal entrance at 0.2 s, artwork reveal around 0.5 s, sparkles at 0.7 s and underwater confetti at 1 s. Main particles finish by 3 s; only sparse edge bubbles continue until close.

Each canvas is capped near 1.2 million pixels and DPR 1.5, with lower mobile particle counts. Closing releases canvas backing stores, sprites, RAF, observers, listeners and the short sound. Hidden tabs suspend animation without catch-up. Reduced motion uses a simple reveal without particle canvases. Effects never participate in gameplay physics.

## Verification

- All 143 Node tests pass, including five new timing, buoyancy, resize, audio lifecycle and authorization/settings tests.
- `python tools/build.py` passes with all model validations.
- `tests/discovery-celebration-browser.cjs` passes in desktop Edge and touch/mobile emulation, portrait and landscape: single emissions, layout preservation, clear/clickable artwork and close button, touch selection during animation, repeated reopening, immediate cleanup, reduced motion, hidden-tab pause and mute.
- Existing production fleet browser check passes, including silent startup, PLAY audio unlock and discovery/selection.
- Existing fleet memory regression passes across seven discoveries, repeated switching, base returns, WebGL recovery and image fallback: no reload, crash or browser/GL errors; decoded image memory returns to zero while idle.
- Captured frames were visually reviewed for initial burst, desktop, portrait, landscape, ambient and reduced-motion states. Browser measurements are recorded in `browser-results.json`.

Physical iPhone Safari and on-device frame-rate measurements were not available. Mobile emulation verifies interaction/layout and existing audio-unlock integration, but does not substitute for a physical Safari test.
