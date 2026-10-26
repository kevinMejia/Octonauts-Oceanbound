# Fleet texture storage audit: no new safe deduplication win

## Conclusion

The proposed low-risk texture savings are already implemented in the current loader. No new production optimization is justified by this audit. Game source, assets, texture resolution, samplers, materials, transparency and memory-budget tests are unchanged. No memory/FPS improvement is claimed.

The active fleet contains 275 embedded PNG image definitions but only 157 distinct encoded images. VehicleImageCache already deduplicates these to shared image sources. A full decoded RGBA scan found no pixel-identical images with different encoded hashes. A live full-fleet allocation check found exactly 157 native texture handles: one compatible allocation per unique source. There are no extra sampler/color-space variants of a source in either measured profile.

Only one PNG is completely uniform. Its black 1x1 replacement is already present in constantVehicleImages.js. Another image has uniform white RGB but varying alpha; it belongs to transparent GUP-X material Coco [Oceanbound].004 and must retain its alpha pattern.

This is a negative finding, not a failed attempt to force a change: removing/downgrading maps or changing samplers would violate the appearance-preservation requirement without producing an evidence-backed quick win.

## Method and scope

Baseline local source revision at start: 9a4225021ee286f38a19392acf32e3898d645434. No production files were modified.

audit-vehicle-textures.py reads the active GLB assets (A/B-high/C/D/E/F/Q/R/X), streams embedded PNG buffer views, hashes their original bytes, decodes RGBA with Pillow, checks every channel's extrema and hashes decoded pixels. It records material slot/sampler references, dimensions, alpha, and ancillary metadata. The optional historical gup-b.glb comparison asset is excluded from the active-fleet inventory.

Potential uniform replacements are written only to ignored .local-assets/ for inspection; the script cannot overwrite the production replacement map. It retains the original PNG color/metadata chunks and verifies the generated 1x1 pixel roundtrip, but the sole candidate is already optimized and no replacement was shipped. Pillow comes from the existing bundled Python environment; no game dependency was added.

audit-vehicle-gpu-textures.cjs loads the complete current fleet, unlocks/parks every vehicle for the controlled sample, prepares its textures, stops ordinary gameplay and inventories material textures and actual renderer texture handles. Source identity is matched to VehicleImageCache entries. Compatibility checks use the bundled Three.js cache fields: wrapping, filters, anisotropy, internal format, format/type, mip generation, premultiplication, flipY, unpack alignment and color space. Each source/settings group is checked for multiple native handles.

This browser audit uses installed Edge on desktop hardware, with desktop/high and portrait touch/mobile/low profiles. It is not a physical iPhone or hardware VRAM measurement. The payload estimate uses exact image/mipmap dimensions and deduplicates native handles; it excludes geometry, driver overhead and unrelated scene textures.

## Results

| Profile | Native vehicle texture handles | Estimated fleet texture MiB | Redundant compatible groups | Sources with multiple settings variants |
|---|---:|---:|---:|---:|
| low | 157 | 208.00 | 0 | 0 |
| high | 157 | 1211.64 | 0 | 0 |

The mobile result reproduces the existing approximately 208 MiB fleet footprint, above the unchanged 192 MiB fleet test target. Nearly all of that is 156 distinct 512x512 color/emissive textures with mipmaps, plus the already tiny black constant. The budget cannot be met by further exact image sharing alone.

Additional checks:
- All 275 embedded images use PNG and were examined; 157 unique images were fully decoded.
- 26 image hashes are referenced by more than one embedded definition; those are already shared at runtime.
- All 1,327 mesh nodes are individually visible; there are no unused multi-material slots or invisible materials to safely omit.
- 567 runtime material instances are represented per profile. Every material with an emissive map has nonzero emissive contribution, so removing those maps is not equivalent.
- GLTF defines both repeat and clamp samplers, but no source is actually allocated in multiple settings variants. Normalizing samplers therefore offers no demonstrated saving.
- Both browser profiles report zero page/GL errors and zero decoded-image residue after preparation.
- All eight existing VehicleImageCache tests pass. Python compilation and Node syntax checks pass for the new audit tools.

No production build or full gameplay regression rerun is needed for a production diff of zero files; the actual game/asset tree is unchanged.

## Findings and decisions

| Candidate | Evidence | Decision |
|---|---|---|
| Deduplicate identical encoded PNGs | 275 definitions, 157 images, 157 native handles | Already done; retain existing cache. |
| Share pixel-identical differently encoded images | Zero matching decoded-pixel groups across different hashes | No alias map added. |
| Shrink completely uniform maps | One uniform image, already mapped to 1x1 | No new replacements. |
| Shrink RGB-uniform alpha map | White RGB but alpha ranges 0-206 on transparent GUP-X material | Rejected: would change appearance. |
| Remove zero-contribution emissive maps | No disabled/black-emission map candidates | Rejected: emission is active. |
| Skip invisible/unused material resources | No hidden mesh/material or unused slot candidates | No change. |
| Share same source across texture settings | No source has multiple settings variants | No change. |
| Recompress PNG files | Can affect transfer size, not uncompressed GPU payload | Not a solution to this memory target. |

## Next options requiring a different level of work

1. Inspect UV occupancy in the original authored assets. Cropping/packing genuinely unused texture regions could preserve visible detail, but UV transforms, mip filtering, padding and wrapping must be validated. This is an asset-authoring investigation, not a few-line loader fix; savings are currently unknown.
2. Evaluate GPU-compressed textures on a controlled vehicle sample. This could reduce GPU storage materially, but introduces a format/decoder pipeline, compatibility work and possible pixel differences. It is not automatically applied under the current no-quality-change requirement.
3. Keep investigating draw-call/geometry asset consolidation in Blender separately. That may improve rendering without lowering texture quality, but does not by itself solve the 208 MiB texture budget.

No resolution cap was lowered, detail discarded, glow/transparency disabled or new rendering dependency introduced.

## Reproduction

Use Python with Pillow (the bundled workspace Python was used here):

    python tools/audit-vehicle-textures.py

With a local server on port 5173 and Playwright/installed Edge available through NODE_PATH:

    node tools/audit-vehicle-gpu-textures.cjs
    node --test tests/vehicleImages.test.js

Results are retained in vehicle-textures-data/inventory.json, runtime-low.json, runtime-high.json and summary.json. The tools only write audit artifacts and optional local candidates.
