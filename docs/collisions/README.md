# Underwater collisions, audio cleanup and turbo sound

Verified 2026-10-23. Production module version: `08abfc2af1ce`.

## Architecture

The existing custom movement controller remains in use. `CollisionWorld` consumes `InteractionSurfaces.grid`, the existing static spatial hash; the camera, fish clearance and settling particles share that same index. Static proxies are registered once after asset loading. Vehicle changes replace only the active hull configuration. There is no physics engine, triangle collision, new renderer, or per-frame index rebuild.

Each GUP uses three overlapping ellipsoid lobes along its longitudinal axis, with a vertical centre offset. These follow the model's YXZ heading/pitch/bank. Model bounds were measured once in browser QA, not during gameplay:

| GUP | Measured visual width / height / length (m) | Proxy radius / half height / half length / centre Y (m) |
| --- | --- | --- |
| A | 4.87 / 3.76 / 5.59 | 2.50 / 1.95 / 2.90 / 0.40 |
| B | 2.98 / 1.84 / 5.58 | 1.65 / 1.00 / 2.90 / 0.25 |
| R | 3.37 / 3.12 / 5.56 | 1.80 / 1.65 / 2.90 / 0.55 |

B's former 2.2 m horizontal radius was substantially wider than its measured 1.49 m visual half-width. That confirmed invisible margin is tightened; its speed, turning, acceleration and base seabed clearance are retained. A/R retain their respective speed tiers. No turbo speed, timing, charge, cooldown or visual configuration changed.

Reef foundation proxies reuse the authored manifest (3-10 ellipsoids per formation). A reusable template selects at most four substantial, separated coral cores per authored formation; scattered pockets receive at most two. Original core radii and cached rock bounds are used rather than enclosing a whole reef in a broad box. Branches, vegetation, pebbles and unselected decorative coral are excluded from the collision index entirely. Instanced visual geometry stays independent. The current scene registers 1,155 proxies: 525 coral cores, 549 rocks and 81 existing Octopod structural proxies.

The solver queries nearby cells along the motion segment, filters by height, sweeps the hull against oriented expanded ellipsoids, and handles the first time of impact. Bounded slide/recovery iterations project only inward velocity away from contact, preserving tangential travel through a damped drift term. Strong impacts get a small controlled rebound. Terrain uses direct five-point hull height queries, a bounded travel sweep and a slope normal; it does not raycast the terrain mesh. Existing clamps retain surface and world bounds. Sweeps are approximate proxy geometry, not exact mesh physics.

`?collisionDebug` enables bounded nearby wireframes and counters. Green is the active hull, pink coral, orange rock and blue Octopod. Normal play creates no debug meshes. Tuning lives in `src/config/collisionConfig.js` and vehicle collision fields.

## Effects and sound

The existing fixed sediment, grain and debris pools are reused. Contacts report their surface normal, location and normal impact velocity. Sand requires movement/proximity or an impact; coral/rock bursts require fresh meaningful contact. Sustained pushing does not re-arm effects every frame. Fragments retain available coral colour metadata.

`underwater-collision.mp3` is decoded by the existing AudioManager and played through its existing master bus. A strength threshold, per-contact re-arming, 0.65 s cooldown and two-voice cap prevent repetitive noise. Master mute and volume apply. No new context is created.

`assets/audio/turbo.mp3` is the supplied new, distinct one-second recording. Its encoded bytes prefetch silently; decoding occurs only after PLAY creates/resumes the existing context. Playback begins in the same game update as the inactive-to-active turbo transition, runs once without looping, and allows one voice. Repeated intent or continued boosting does not replay it. A clip unavailable at activation is skipped rather than played late. The saved Turbo slider uses the existing `oceanbound.audio.v1` schema and defaults to 65%; older saved settings retain all their existing values and acquire this default. Its gain feeds the existing master bus. Propeller, bubbles, ambience and music continue on their existing paths.

## Audio directory investigation and authorized cleanup

All runtime audio references and the production builder used `assets/audio`; no runtime subsystem referenced `assets/sounds`. The propeller, ambience and bubble MP3s in `sounds` were byte-identical duplicates, confirmed with SHA-256 before removal. The unique `background_music.weba` was the supplied original full-length music source; the existing README identifies `oceanbound-background.mp3` as its Safari-compatible runtime conversion.

After the user's follow-up explicitly authorized cleanup, only the three verified duplicates were deleted. The original moved intact to `assets/audio/source/background_music.weba`; its Git blob remains `f58159afeb6dd4ce17c0d31492997c0f0bf08ab3`. The empty `assets/sounds` directory was removed. The builder excludes `audio/source`. All five pre-existing runtime recordings are unchanged byte-for-byte, and all six runtime recordings, including turbo, were verified against production copies. No other audio was moved, renamed or removed.

## Verification and measurements

121 Node tests pass. Coverage includes all three hulls on uneven sand, high-speed downward and thin-obstacle sweeps, sliding, rebound bounds, overlap recovery, support traps, actual Octopod structures, backing away, preserved compound gaps and the authored reef channel, local query scaling with 10,000 distant obstacles, fresh-contact gating, bounded audio voices, turbo activation edges, mute/volume persistence, and existing gameplay tests. Production build and GLB validation pass.

`tests/collision-browser.cjs` checks the production build in headless Edge/Chromium: actual double-press turbo activation plays exactly once; the decoded one-second turbo clip, existing loops/bubbles and collision clip are available; the Turbo slider schedules the proper gain and persists; live rock/coral/Octopod impacts resolve; sand/rock/coral pools emit; collision audio starts; the actual selector switches A/R/B and retains the shared grid; mobile touch PLAY resumes audio and exposes the Turbo slider. No browser exceptions occurred. Screenshots and raw measurements are in this folder.

Local desktop collision-only microbenchmark, median / p95 milliseconds per query, 120 measured batches of 32 calls after 10 warm-up batches:

| Location | Legacy correction ms | Swept solver ms | Nearby solids mean / max |
| --- | --- | --- | --- |
| dense reef | 0.003 / 0.006 | 0.037 / 0.053 | 7.8 / 14 |
| scattered rocks | 0.003 / 0.006 | 0.041 / 0.050 | 2.2 / 4 |
| Octopod | 0.003 / 0.006 | 0.016 / 0.028 | 0.7 / 1 |

The old baseline scanned 106 reef and 96 showcase proxies (plus 81 Octopod proxies when nearby), using endpoint correction and no solid coral/scattered-rock response. The new solver covers more obstacles and performs continuous travel checks; it costs more CPU in these small legacy scenes, while remaining below 0.06 ms p95 in this desktop sample. This is a collision CPU microbenchmark, not whole-game frame time, an FPS improvement, or a mobile performance claim. Separate live impact probes considered 19 rock-area, 21 coral-area and 13 Octopod-area solids, rather than all 1,155 proxies.

Run with the server on port 5173, `python tools/build.py`, Playwright available through NODE_PATH, and `node tests/collision-browser.cjs`. BROWSER_CHANNEL defaults to msedge. Unit checks: `node --test tests/*.test.js`.

Physical iPhone Safari and listening/mix balance require device verification. The touch browser check uses Chromium, not Safari. Dense-reef full-frame performance was not compared on a physical phone. Collision shapes intentionally approximate substantial structures and leave decorative branches passable; model bounds are QA measurements, not full-mesh continuous collision.
