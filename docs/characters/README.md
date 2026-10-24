# Bridge crew: source, references and integration

Rescued members now use [ambient bridge activities](../crew-activities.md): reserved console stations, calm walking, configurable preferences and visibility-based updates. Existing models and rescue progression are retained.

The supplied replacement models are now integrated for all eight crew members. See the [replacement audit](replacement-audit.md) for current source/runtime counts, transforms, validation and performance limits. The original authoring notes below describe the retained fallback assets.

These are the original three model-authoring notes. The expanded eight-member roster and replacement-asset contract are documented in [crew discovery](../crew-discovery.md); see the expanded placeholder section below.

The existing Octopod already contains `Control_Room_Floor` (deck top y=20.09), bridge consoles, a rear monitor, and transparent observation glazing. It is visible from the submarine outside, but has no boarding/enterable interior gameplay. All three characters stand on that existing floor within the glazed bridge. No Octopod exterior or collision geometry was changed. Approach the main observation window at bridge height to see them; distant normal-chase views cannot show facial detail at this scale.

## Reference research

Primary visual guide: [Brown Bag Films' official series page](https://www.brownbagfilms.com/our-work/octonauts), especially the [hallway crew still](https://www.brownbagfilms.com/sites/default/files/styles/uncropped_small/public/2025-09/OCTO_Still-07.jpg.webp?itok=O1J-oGuh) and [underwater three-quarter crew still](https://www.brownbagfilms.com/sites/default/files/styles/uncropped_small/public/2025-09/OCTO_Still-08.jpg.webp?itok=rmfR72Nh). These were inspected visually before modeling. [Official character identities](https://www.octonauts.com/octonauts.html) supplied context; the animated-series stills supplied the shape/costume direction rather than the book artwork.

Barnacles: large rounded white bear head, round pale-blue inner ears, double pale-blue muzzle, small dark nose, blue cap/uniform, light blue collar/boots and utility belt. Kwazii: orange kitten, triangular ears, cream muzzle/belly, left-of-image black patch with fitted wraparound strap, freckles, pink nose, curled tail, blue collar/boots/cap. Peso: smaller black penguin, continuous white heart-like mask and belly, yellow beak/feet, white-banded blue cap and medical case. Raised badge details suggest the Octonaut insignia. These are newly authored interpretations, not official production meshes or an exact likeness claim.

Front and oblique series references are available. A reliable official rear turnaround was not found in the research, so unobserved rear surfaces are conservative continuations of the visible clothing, strap and tail. Side/rear Blender previews verify the authored geometry, not missing canonical details. Scale is estimated against the existing bridge: roughly 3.1 / 2.8 / 2.7 world units including caps; not canonical measurements.

## Editable assets and animation

Each character has a separate compressed `.blend` under `assets/blender/characters/` and a separate GLB under `assets/models/characters/`. `scripts/create-crew.py` rebuilds the editable sources, exports, and real Blender front/side/rear/three-quarter renders. It accepts optional character IDs after `--`. `scripts/verify-rigs.py` reopens all sources and verifies evaluated pose displacement, recording `rig-validation.json`.

Each source contains an editable named rig, 13 bones, named vertex groups, a vertex palette and one joined skin. Limb/head/hand/foot components use rigid weights suitable for this toy-like idle articulation. The eight-second looping idle includes breathing, head turns, tiny arm movement and two blink intervals. This is not a finished walking deformation rig; future locomotion would need joint-weight refinement and new clips. No walking, AI, dialogue or physics was added.

GLBs contain one material/primitive and one skin each. Counts: Barnacles 29,660 triangles (1.32 MB), Kwazii 27,536 (1.23 MB), Peso 23,764 (1.06 MB). No external textures, extra lights or real-time character shadows. Three AnimationMixers play staggered idle loops. Visibility and mixer updates stop beyond 110 units. Configuration is in `src/config/crewConfig.js`; `OctopodCrew.js` is independent of vehicle movement and attaches a child group to the existing base.

## Verification and limitations

Actual browser captures: `game-bridge.png` and `game-mobile.png`. The 844x390 mobile-sized view uses the real low-quality game and touch HUD; it is desktop Chromium, not physical iPhone Safari. Blender multi-angle previews are separate PNGs. Visual inspection led to a continuous Peso face mask, a fitted Kwazii strap and a lower visible collar. Sources reopen and evaluated skin vertices move at idle/blink frames.

68 tests pass, including export skin/bone/animation structure, bridge placement and the existing gameplay suite. Build and production-resource checks pass. The preview iframe emits an automation-related MutationObserver error during browser instrumentation; the game has no MutationObserver implementation. Standalone deployment is checked separately.

Short comparison at the same bridge scenario, low quality, 1265x630, DPR 1: with crew versus the inspection-only `crew=off` switch. Median/p95 frame times were 7/7.1 ms in both, CPU submission 1.6 ms in both. GPU medians were 3.17/3.32 ms (noise, not evidence of a speedup). Scene triangles were 1,351,261/1,270,893; draw calls 150/148. Characters themselves add exactly three primitives; ambient visitor visibility changes account for the net two-call snapshot difference. Geometry buffers rose from 16.8 to 20.14 MiB. Raw metrics are saved alongside screenshots. This does not establish an iPhone performance guarantee; physical Safari remains untested.

Deployment verification: commit 9669ce3 published successfully; production resource checks passed including all three GLBs. An initial browser load hit a transient reef-manifest fetch failure immediately after deployment; retry succeeded. The standalone live game was driven from spawn to the observation window, where all three animated characters were visibly present (live-bridge.png). No further browser errors were recorded during that approach.

## Expanded placeholder crew

The core roster now also includes Shellington, Dashi, Tweak, Professor Inkling and Tunip. These low-detail, palette-colored proxies each have a separate editable Blender source, GLB and articulated idle. `assets/blender/characters/scripts/create-placeholder-crew.py` reuses the original builder's rig/export helpers at lower mesh resolution and rebuilds only these five. Run it with optional IDs after `--` to regenerate one proxy. The original three GLBs and .blend files are unchanged.

Gameplay identity, locations and saves are independent of the visual assets. See [crew discovery and model replacement](../crew-discovery.md#replacing-placeholder-models) for the asset path, scale, orientation, offset and idle-clip configuration. New models should replace these proxies rather than introducing new character IDs.
