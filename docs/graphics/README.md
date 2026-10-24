# Graphics presets

Open the Octonauts badge, choose **Graphics**, select **Auto**, **Performance**, or **Beautiful**, then press **Apply and restart**. This explicitly restarts at the Octopod so geometry, shaders and texture budgets can be rebuilt cleanly instead of retaining two worlds. Discoveries, fleet unlocks, audio and camera preferences are preserved. Closing settings without applying leaves the current mode unchanged.

The choice is stored separately in `oceanbound.graphics.v1`, with a versioned `{version:1,mode}` value. Invalid or unavailable storage safely falls back to Auto. Failed saves show a status and do not restart the game. Existing `?quality=low` and `?quality=high` QA links override preferences; applying the settings removes that override while preserving other URL parameters.

| Presentation budget | Performance | Beautiful |
| --- | --- | --- |
| Pixel ratio ceiling | 1 | 2 |
| Real-time sun shadows | Off | One 2048px shadow map |
| Antialiasing | Off | On for fine-pointer devices |
| Terrain / coral / vegetation distance | 200 / 140 / 100m | 300 / 250 / 175m |
| Water particles | Existing low budget: 320 | Existing high budget: 800 |
| Light shafts | 3, intensity .08 | 6, intensity .17 |
| Lighting | Existing gentle low-profile lighting | Warmer sunlight, lower fill, stronger depth tint and environment highlights |
| Vehicle uploads | 512px longest edge | Original resolution on desktop; always 512px on iPhone/iPad/coarse-pointer devices |

Auto starts with Performance for iPhone/iPad/iPod, coarse pointers, and devices reporting at most 4 GB of memory; otherwise it starts with Beautiful. The optional browser memory value is a heuristic, not an exact hardware assessment. Manual choices override this preset selection, while the independent touch-device vehicle texture cap protects fleet memory in every mode.

Only Auto adjusts rendering resolution during play. `AdaptiveResolution` samples existing frame metrics every two seconds: sustained slow frames lower pixel ratio, sustained headroom recovers it, and a cooldown prevents rapid changes. It is bounded by the profile floor and device/preset ceiling, ignores invalid or sparse samples, and resets its observation window on pause. Performance targets a 30fps frame budget; desktop Auto uses a 20ms decision budget. This is a governor, not a guaranteed frame rate. QA quality overrides and `?benchmark` keep resolution fixed for repeatable comparisons.

No additional renderer, post-processing pass, external dependency, scene reload loop, physics change, model change or discovery-state migration is introduced. Existing high/low LOD and particle paths remain in use. The settings tab becomes a two-by-two grid on narrow screens so all four categories stay touch-accessible.

## Verification

`node --test tests/*.test.js` includes profile selection, persistence and storage failures, texture safety, adaptive hysteresis/cooldown, invalid timing samples and hard bounds, alongside existing gameplay suites.

`tests/graphics-browser.cjs`, using the local server on port 5173, verifies desktop Auto, Performance, Beautiful, preference-driven restarts, preserved creature progress, unapplied drafts, failed-save behavior, actual renderer resolution decrease/recovery under synthetic timing samples, iPhone Chrome emulation, mobile portrait/landscape settings bounds, and the phone texture cap under manual Beautiful. Shader compilation and WebGL errors are checked. Screenshots of desktop rendering and the phone settings panel were inspected. Synthetic timing checks verify the governor wiring, not hardware speed; physical iPhone performance remains unverified.
