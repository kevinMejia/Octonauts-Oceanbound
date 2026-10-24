# Rescue towing visuals

Towing adds a reversible shoulder pose to the existing character rigs, gentle body motion, and a faint bubble/streak trail. Rescue motion, rope attachment, speed penalties, delivery, and saved progress remain controlled by the existing rescue system.

`src/crew/TowPose.js` restores its previous overlay before the animation mixer updates, then blends the towing pose onto the current animation. Independent hand controls receive the same shoulder transform so hands and attached accessories remain connected. The existing assets have no usable walking/towing animation sequences; their base poses are preserved. Flippers and Inkling's front tentacles use their existing bones with gentler weights.

`src/effects/TowWater.js` samples actual passenger movement and reuses the propulsion water shaders. One fixed particle pool (40 particles, or 24 on low quality) provides bubbles and thin flow streaks. Emission stops while stationary, clears on recovery jumps or release, and is culled beyond the configured camera distance. No external textures or dependencies are needed.

Tune `src/config/towVisualConfig.js`:

- `pose.enabled`, blend/release speeds, reach direction/weight, body pitch/bob/roll.
- Per-character rig names, shoulder/tip bones, independent hand followers, and reach weights.
- `water.enabled`, particle budgets, emission rates, movement threshold/full speed, opacity, lifetime, render distance, and recovery jump threshold.

Validation: `node --test tests/*.test.js`, `python tools/build.py`, and `node tests/tow-visuals-browser.cjs` (with Playwright installed). The browser check exercises all eight rigs, hand continuity, bounded resource use, desktop/mobile rendering, normal rescue delivery, and restoration of the original pose.
