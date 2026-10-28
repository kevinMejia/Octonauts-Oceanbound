# Approved contoured turbo window

Implemented the user's approved curved preview in the existing gameplay HUD.
The TURBO title, two flanking bolts and slim bar are replaced by one recessed
energy window and a centered lightning icon. Settings badge, housing footprint,
fish/count, Hull indicator, notifications and control hit targets are retained.

## Consistent spacing

`src/config/hudConfig.js` owns the six-unit clear inset and three-unit bezel.
The existing 84-unit badge artwork has transparent padding; its visible outline
was measured once and is represented by the configured ellipse. The window's
left edge is offset along that outline's normals. Twenty-four short segments
form the smooth curve, with subpixel chord error at the actual HUD size.
The top, right and lower-right edges share the same six-unit clearance. The
housing stroke's inner edge is accounted for, so a two-unit border doesn't
silently reduce the visible gap on those sides. The outer housing's right curves
now use true SVG arcs, allowing exact concentric window/bezel curves.

The inset scales with the HUD: six CSS pixels at desktop scale, 4.8 at .8 scale
and 4.32 at .72 scale. Measured straight-edge rounding stays below .1 CSS pixel.
The bezel uses the same normal-offset construction at every side.

`turboWindowGeometry.js` builds the paths and charge clipping rectangle once
when TurboMeter is constructed. Native SVG clipping scales with the shared
viewBox; no viewport measurement, path generation or physics query occurs in the
frame loop. The existing TurboMeter.update still sets scaleX and aria-valuenow.
The moving clipping rectangle reveals a stationary gradient/hatch pattern, so
ribs keep their spacing when charge decreases. No new external assets,
dependencies, renderers or post-processing were introduced.

## Behavior preserved

TurboBoost, Input, pickups, charge persistence and infinite reward logic are
unchanged. Current configured swimmer rates remain 20/3 charge per second drain,
3 per second passive recharge and +25 per pickup. GUP-X keeps its own configured
rates. The existing active-boost glow is retained. The empty window stays visible
and the lightning icon remains readable. The meter's existing accessible role,
label, bounds and current value remain intact.

## Verification

- `node --test tests/*.test.js`: **386 passed**.
- `python tools/build.py`: production build and GLB validation pass.
- `git diff --check`: passes.
- Two geometry tests independently verify normal clearances against the badge
  outline and visible housing edges, plus the fill clipping bounds.
- `tests/contoured-turbo-browser.cjs`: actual production Edge/WebGL at 1280x800,
  390x844, 844x390 and 320x568. Checks straight-edge clearances, responsive bounds,
  0/25/50/100% charge, the unchanged meter/system drain, recharge, pickup and
  infinite paths, actual double-tap keyboard turbo, Settings and collection
  controls. No page or console errors. Results and real captures are alongside
  this report; captures were visually inspected at full and partial charge.
- The existing `tools/hud-check.cjs` measures the visible window path instead of
  its intentionally larger, non-interactive SVG container. The older capture
  helper wasn't rerun; its previous screenshots remain historical evidence.

Single agent, with no subagents or independent agent QA. Physical iPhone Safari,
real safe areas and simultaneous touch/performance testing remain outstanding.
Existing unrelated standalone word-hunt layout limitations are unchanged.

## Changed implementation

`index.html`, `src/style.css`, `src/ui/gameplayHud.css`, `src/ui/TurboMeter.js`,
`src/config/hudConfig.js`, `src/ui/turboWindowGeometry.js`. Existing meter tests
were adapted to an explicit element selector; focused geometry and browser
checks were added. Coordination and evidence are in BACKLOG.md and this folder.
