# Abyssal Garden environment tests

The default `abyssal.html` now runs the **original WebGPU environment**. The earlier Three.js GUP adaptation did not preserve the original appearance and must not be used to judge its visual quality or native-renderer performance.

## Original renderer — default test

Choose **TRY ORIGINAL ABYSSAL GARDEN** on the startup screen or open `abyssal.html`. A full-viewport iframe runs `vendor/abyssal-garden/native/index.html` byte-for-byte from the pinned upstream revision. Terrain, kelp, shaders, fog, lighting, bloom, controls and synthesized audio are unchanged. The small controls bar is collapsible and does not resize the original view; Open original full screen opens the same file without wrapper chrome.

This is **first-person swimming, with no GUP model or vehicle integration yet**. Dive in, use mouse + WASD, E/Q for up/down, Shift faster, 1–6 for viewpoints, Esc for the menu, M for sound and H for performance stats. Its menu supplies the original Low/Medium/High settings. Touch uses upstream experimental finger navigation. These controls are the original demo’s controls, rather than Oceanbound’s vehicle controls.

Requires WebGPU and compatible browser/GPU; unsupported platforms receive an explicit wrapper notice. There is no silent substitution with WebGL. A separate, clearly labeled adapted GUP comparison remains available at `abyssal-adapted.html`.

The upstream self-contained HTML has SHA-256 `989bc96134c97f7595aa3b720976ad51be3fd4c4376ab2d06a6aee653ecaa5d4`. `native/PROVENANCE.json` pins the revision; original readable source, build script, package/lock files, template, README and MIT license are retained in `vendor/abyssal-garden/native/`. No build/install is required to run the committed original HTML. Source modifications can use upstream’s documented Node/esbuild workflow in that native directory; the main game build only copies these files. Upstream stores its own `abyssal` quality preferences on this site’s origin, independently of Oceanbound’s settings keys.

Native correction validation: all 78 test files and production build `dd8fd76dd86d` pass. Independent QA verified exact native/source fingerprints, byte-identical production copying, and the wrapper’s unsupported-WebGPU notice, full viewport, responsive controls, links and absence of silent renderer substitution. [Wrapper browser results](native-wrapper-results.json) record that unsupported-path check.

A supported software-WebGPU attempt on the untouched upstream scene did not reach Dive in within 180 seconds. A separate production-wrapper diagnostic remained at “Sculpting the seabed…” after 30 seconds ([diagnostic](native-software-startup.json)). Therefore native supported-device rendering, navigation and performance have not been verified here, and no new native gameplay screenshot is claimed. These software-GPU limitations are not measurements of a physical phone. The prior Three.js screenshots/results below describe only that adaptation and establish no native-renderer fidelity or performance result. Physical-device testing remains outstanding.

## Adapted GUP comparison — earlier prototype

Open `abyssal-adapted.html` (production: `dist/abyssal-adapted.html`) for the earlier Three.js prototype. It loads only its adapted environment and GUP-B. **Back to ocean** opens the normal game. Existing discoveries, damage, mission state and graphics preferences are not written by the experiment.

Use the normal W/A/S/D or arrow controls, Space to rise, Shift to dive, and drag to orbit. On touchscreens use the shared steer/depth stick and Forward / Brake buttons. Reset GUP returns to the selected viewpoint. Explore offers the canyon, kelp basin, large arch, wreck and purple grotto. Detail reloads only this experiment with `?quality=low` or `?quality=high`; no saved settings change. Turbo uses the shared controller and starts charged for testing, without modifying saved world charge.

The permanently visible monitor reports delivered FPS, mean and p95 frame interval, draw calls, triangles, actual render resolution, profile, kelp blades and GUP position. These are browser-frame/render statistics, not GPU timestamps. Resolution stays fixed per profile so movement/location comparisons are meaningful; low caps DPR at 1, high at 1.5. Compare the same viewpoint and route, orientation, device and warmed-up run. It does not claim the original WebGPU demo's performance or visual parity.

## Source and adaptation

Upstream: https://github.com/Noniv/abyssal-garden at `c628d18c708ce12849085f3e4ec4a0136e5efd5b`. Copyright (c) 2026 Maksymilian Dendura, MIT; notice retained in `vendor/abyssal-garden/LICENSE`, distributed with the site.

`vendor/abyssal-garden/procedural.js` combines upstream `math.js` and `world.js` verbatim, with a small exported adapter appended. The original mesh generators create the ship, stone whale fluke, manta rays, rocks and coral. The appended kelp-column adapter copies upstream column generation and exports its original leaf parameters for Three.js instancing. Renderer-specific full-world placement is replaced by bounded arena content and upstream kelp basin locations.

The original terrain density WGSL, including designed mesas, arches, carved tunnels and noise/erosion, is evaluated offline on WebGPU, then meshed using upstream surface nets at **2m sample spacing**. The normal browser needs only WebGL; the generated positions/indices and quantized density field are committed under `assets/abyssal`. World Y is raised 46m to match Oceanbound's shared sea level. This preserves recognizable canyon/arch/tunnel topology while reducing density resolution from upstream 0.75m. Small features and narrow passages can differ at the coarser resolution. `tools/bake_abyssal_webgpu.mjs` reproduces the exact-shader bake in a Chromium environment with WebGPU; `tools/bake_abyssal.mjs` is a CPU approximation fallback using `src/arena/density.js`, with fine erosion differences explicitly noted in that source. Re-baking is not needed for the normal build.

The same quantized density field constrains GUP hull sample points and short camera-arm samples, leaving arch openings empty. This is an experimental sampled collision approximation, not a triangle-accurate solid-body solver. Plants, coral, loose stones, manta rays, whale sculpture and ship are decorative/passable, as in the original project's scenery. Reset/viewpoint controls provide recovery. The existing GUP movement, input and chase camera are reused; test-area contact response and world limits are isolated.

Three.js standard lighting, depth fog, additive shafts, animated instanced leaves and a simple surface replace the original WGSL rendering, skylight bake, caustics, shadowing and bloom pipeline. Mantas use original geometry with simple patrol/banking animation. Existing game music/audio and damage/progression systems are deliberately not started here. Configuration is in `src/config/abyssalArenaConfig.js`.

## Validation

Focused Node checks cover baked-buffer integrity, index ranges, navigable spawn/viewpoints, the large-arch opening versus rock ring, sampled collision response, and deterministic upstream mesh/kelp generation. Run `node --test tests/abyssal-arena.test.js`, `npm test`, and `npm run build`.

Browser observations and independent QA are reported separately by the coordinator. Physical iPhone/Safari multitouch, sustained frame pacing, thermal throttling and subjective visual quality remain device playtests. A desktop software renderer is not a device performance result.

Independent final QA passed all 77 test files, production build `90832a01f760`
and diff checks. Real production Chromium checks passed high/low rendering without
shader/texture/page errors, all five safe reset poses, real-keyboard traversal
through the large arch, solid-ring collision recovery, no localStorage writes,
CDP simultaneous touch steering/depth + Forward in both finger orders, release
cleanup, portrait/landscape bounds, reset and exit/Back restoration.

[Browser results](browser-results.json) and [live-loop results](live-loop-results.json)
record the observed checks. The live-loop check held W for 3.5 seconds and observed
movement plus populated FPS/frame-time/render statistics. Chromium used software
WebGL and ran extremely slowly (around 1 FPS in that run); these numbers do not
predict phone or native GPU performance. Simulation accepts at most 150ms per
frame in small physics steps, so movement loses wall-clock time below about
6.7 FPS rather than making an unsafe large collision step.

Earlier adapted-prototype captures (not the default original renderer): [canyon low](canyon-low.png), [large arch](arch-low.png),
[wreck](wreck-low.png), [canyon high](canyon-high.png), [mobile low](mobile-low.png).
A real implementation agent and separate independent QA agent ran; the coordinator
also baked original shader terrain and inspected rendered views. No custom TOML
role was loaded by the host. Physical iPhone/Safari validation remains outstanding.
