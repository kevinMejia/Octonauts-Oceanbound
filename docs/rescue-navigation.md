# Expandable Turbo rescue navigation

The existing Turbo meter stays in the same top-center position and continues to mirror `TurboBoost.charge`. During towing, `RescueNavigation` expands that container to show the crew member, a 3D directional arrow, and rounded distance to the Octopod docking center. No portrait or separate mission panel is created. Completion, stop/detach and progress reset collapse it again.

The arrow uses the controller's +Z forward convention and the existing navigation bearing helpers. Its relative bearing follows the shortest angular path with exponential smoothing, including the seam behind the GUP. Distance retains the former rescue HUD's 3D world-unit measurement to the docking center. Mission state still belongs to `RescueSystem`; navigation only reads it. Rope, physics, speeds, progression and discovery thresholds are unchanged.

## Arrow asset and rendering

- Runtime: `assets/models/rescue-arrow.glb` — 13,920 bytes, 192 triangles, four material primitives, no textures, animations or skeleton.
- Editable source: `assets/blender/ui/rescue-arrow.blend`.
- Builder: Blender `--background --factory-startup --disable-autoexec --python tools/blender/create_rescue_arrow.py` from the project root.
- Cyan upper face, dark teal sides/underside, beveled highlights and slight emissive shading.
- GLB loading failure falls back to a small procedural extruded Three.js arrow so startup and rescue remain usable.

The arrow is a separate HUD scene, never added to the ocean scene. The existing game renderer draws it into a scissored region behind the HUD, which is copied immediately into a small 2D canvas inside Turbo. The screen's diagonal overlay is above that canvas. This adds no WebGL context, render target or JavaScript pixel-array readback. Viewport, scissor, automatic clearing and statistics-reset settings are restored after each pass. Inactive navigation skips rendering; the canvas and scene are reused between missions. `dispose()` releases the geometry, materials, timer and canvas resources.

Expansion respects reduced-motion preferences. On narrow phones, branding and the collection control temporarily sit below the expanded container; they return after collapse. Very narrow phones use a 104px mission display to leave the compass clear; the normal Turbo display remains 125px.

## Verification

- Unit tests cover front/right/left/behind bearings, docking distance, rear-seam smoothing, frame-rate independence and the GLB geometry budget.
- `tests/rescue-navigation-browser.cjs` checks actual 3D pixels, shared container/charge meter, dynamic distance, four viewports, renderer-state restoration, cancellation and resource disposal. Set `NAV_TEST_URL` to check a production build.
- Existing rescue and mobile touch tests cover discovery, rope continuity, movement, vehicle switching, delivery, save state and temporary speed penalty.
- Desktop Edge mobile emulation was used; physical mobile GPU performance has not been measured.
