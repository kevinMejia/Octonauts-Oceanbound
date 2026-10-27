# Custom-contoured HUD refinement

The previous parent rounded rectangle, extra Settings ring and separately framed
Turbo/collection panels produced overlapping outlines. They are replaced by one
inline SVG outer contour in index.html, behind the unchanged functional elements.
The path wraps around the circular emblem, extends across Turbo and curves inward
at the right shoulder before following the narrower discovery section. Empty
space below Turbo's wider end stays transparent. One 2-unit silver/teal stroke,
one dark-teal gradient, one subtle lower texture and one separator replace the
competing borders/shadows. Original orange/white logo artwork remains intact.

The 264x108 viewBox shares a CSS scale with the existing grid and contents;
mobile uses 80%, narrow phones 72%. Uniform scaling preserves the circle and
outline, with no measurements, listeners, masks, filters or animation loops.
The SVG is aria-hidden, unfocusable and pointer-events:none. Settings and marine
buttons retain their handlers and focus behavior. Settings remains at least 66px;
collection retains a 44px-high transparent touch area even when visually scaled.

TURBO and discovery progress share CSS family, weight, white color, letter spacing
and text-shadow variables. Only their sizes differ. Meter, fish icon and actual
state sources are reused. Notification CSS below the permanent HUD rules remains
unchanged. No gameplay, camera, viewport, state, asset or notification code changed.

Verification:
- 365 Node tests pass; python tools/build.py and git diff --check pass.
- Production Edge tools/hud-contour-check.cjs checks Settings open/Escape,
  six viewport changes, HUD bounds/order, shared computed typography and collection
  touch height across 1280x720, 390x844, 844x390 and 320x568.
- Actual production TurboBoost methods verify drain from 80 to 73.3333, regeneration
  to 79.3333 and infinite charge at 100; TurboMeter mirrors charge. Existing marine
  state/counter update changes to 1/11. These are controlled browser method calls,
  not a full manual gameplay pass; no progress saves are added by the checks.
- Simultaneous notification layout capture and no page errors pass.
- Production Edge viewport regression passes from both starting orientations:
  each completes 15 settled transitions plus eight rapid transitions, checks
  canvas/body/buffer/aspect alignment, HUD bounds, touch Forward and no idle resize.
- Actual rendered desktop/portrait captures were visually inspected. PNGs in this
  folder show the contoured outline and transparent space by the lower shoulder.

One agent only; no independent QA. Physical iPhone Safari safe areas, toolbar
transitions, touch usability and sustained performance remain manual checks.
No measured hardware performance or physical iPhone validation is claimed.
