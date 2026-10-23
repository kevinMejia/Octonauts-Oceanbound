# Living water pass

## Player-visible changes

- Propulsion bubbles have brighter pale rims/highlights, larger varied sizes (0.07-0.24 m radius), a six-second life and stronger buoyancy. Cruise emission rises from 10 to 14/second, with the existing speed gate and a 1.5 boost multiplier. At rest the propulsion emitter remains off.
- Two intermittent bubble streams rise from the showcase reef. Cached rock/terrain heights locate the emitters; a slow pulse avoids an unbroken evenly spaced column. They share the existing bubble pool and draw call, with a 55 m emission range.
- Suspended particles keep their original 800/320 desktop/mobile counts. Increased near-volume share, slightly brighter opacity and gentle drift improve parallax without adding a snowstorm or accelerating the whole field with vehicle speed.
- Existing seaweed/seagrass vertex swaying is stronger. Local submarine bending and animated sunlight/caustics remain compatible.
- One school of 26 fish (16 on mobile) swims in the opening garden near (193,173). Yellow/orange and turquoise fish have tapered three-dimensional bodies, a dark band, sculpted eyes, forked tails and small fins. Per-fish phase gives asynchronous GPU tail movement. This first school is deliberately regional, not a map-wide population.

## Architecture and limits

Fish use one shared 358-triangle geometry, one palette material and one InstancedMesh draw call: about 9,308 triangles high / 5,728 low. Bodies, eyes, tails and fins are merged in that shared geometry. No individual fish meshes, rigid bodies, downloaded model assets or pairwise flock searches are created.

A bounded analytic school path, seeded formation offsets, slight vertical drift and smoothed displacement away from a nearby submarine provide motion. Nearby cached foundation proxies and the actual height function keep fish above rocks and uneven terrain. Fish are cosmetic and do not collide with the vehicle. The animation is a lightweight schooling approximation, not full animal AI or predator/prey behaviour. The group stops rendering/updating instance matrices outside its quality-specific range. Initial fish height is set to the valid swimming height, avoiding an artificial startup dive.

Propulsion and reef bubbles share a fixed pool (192 high / 112 low), with emission priority for propulsion and no unbounded accumulation. Bubbles remain in world space and rise independently. Existing flow streaks, sediment, coral chips and rock debris retain separate behaviour; no physics system was changed. Fish and reef bubble telemetry is hidden and available only with `?inspect=1`.

Settings are in `src/config/marineLifeConfig.js` (school counts, bounds, speed, spread, clearance, reaction distance, tail motion and culling) and `src/config/waterConfig.js` (bubble size/rate/lifetime/budgets, vent positions/pulse/range and ambient water). No new player menus or controls were added.

## Actual game verification

`before.png`, `first-pass.png`, `idle.png` and `cruise.png` are real Three.js chase-camera screenshots. Idle captures show the moving school and reef streams; cruise shows the stronger propulsion trail. A captured high-quality cruise pass had 56 active bubbles, including 20 reef bubbles, under the 192 cap. `mobile-idle.png` and `mobile-boost.png` show the actual 844 x 390 low-quality game with touch controls. Double-tap-and-hold Forward activated turbo, moved toward the base and drained the meter. The top-right compass and removed depth panel remain intact.

The standalone game reported no warnings/errors. As in prior work, the embedded mobile harness emitted an unattributed automation MutationObserver error while using its iframe; the application has no MutationObserver, and gameplay continued. That harness log is not claimed to be clean. This is desktop Chromium at mobile dimensions, not actual iPhone Safari testing.

62 tests pass. New tests check a bounded/smooth school path over long sessions, finite headings, player avoidance and quality/pool budgets. Existing movement, camera, turbo, terrain and effects regressions pass. Production build and 48 local production-resource checks pass.

## Representative rendering cost

1280 x 720 desktop Chromium, high quality, DPR 1, unchanged configured spawn/camera. Raw samples are `before-metrics.json` and `after-metrics.json`.

| Metric | Before | After |
|---|---:|---:|
| Median / p95 frame ms | 6.9 / 7 | 6.9 / 7.1 |
| CPU update + submission ms | 2.8 | 1.9 |
| GPU render ms | 1.22 | 1.53 |
| Draw calls | 178 | 180 |
| Triangles | 2,372,047 | 2,381,355 |
| Visible geometry MiB | 20.50 | 20.52 |
| Textures | 9 | 9 |

The two additional idle draws are the school and the now-visible existing bubble renderer. While already cruising, propulsion already used that draw. The extra geometry is exactly one 26-fish school. CPU/GPU timing varies with clock state, scheduling and sampling; the CPU decrease is not a claimed speedup. Median FPS was refresh limited near 145. The long-open baseline had a background/pause gap, so its mean FPS is invalid and is deliberately excluded. These samples show practical desktop cost, not a controlled phone benchmark. Physical iPhone Safari FPS, thermals and multitouch remain unverified.

## Live verification

GitHub Pages deployment for `170da20` succeeded. All 48 public production-resource checks passed. The standalone deployed game reported no warnings/errors; telemetry confirmed 26 visible fish and eight active reef bubbles while propulsion was stationary. `live.png` is the actual deployed game capture. Controls, the top-right compass and the turbo display remain functional.
