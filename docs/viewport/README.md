# Orientation transition synchronization

The previous Game.start resize closure listened only to window.resize, read
innerWidth/innerHeight and wrote explicit canvas dimensions through setSize.
The fixed body and absolute HUD used CSS containing-block dimensions separately.
There was no visualViewport listener or delayed reconciliation if Safari supplied
an intermediate measurement. This is a synchronization gap found in the code;
the intermittent physical iPhone failure has not been reproduced on hardware.

GameViewport now owns body/canvas/projection dimensions, taking unzoomed visual
viewport dimensions (layout viewport fallback). Resize, orientationchange,
visualViewport resize, pageshow and return from background coalesce into one
pending animation frame. Checks at 80/240/500/1000 ms read current dimensions;
new events cancel old timers/frames and invalidate obsolete timer callbacks.
Unchanged/invalid sizes do not reallocate the renderer. Work stops after the
bounded window; no second rendering loop or idle polling is introduced.

The body retains its fixed positioning and existing safe-area CSS. HUD breakpoints,
control sizes, initial designs, gameplay, adaptive resolution and quality caps are
unchanged. Word-hunt placement is refreshed after the body geometry is updated.
The owner exposes dispose() to remove listeners, cancel work and restore body
styles for a future level lifecycle. The current Game has no whole-game disposal
lifecycle; the viewport is created once at startup, like the previous listener.

Verification commands: `node --test tests/*.test.js` (361 pass),
`python tools/build.py` (passes GLB validation and production versioning),
`git diff --check`. npm was unavailable on PATH; these are its script commands.
`tests/viewport.test.js` covers late silent measurements, 15 transitions from
each starting orientation, rapid event cancellation, redundant-size suppression,
zoom fallback, invalid sizes and disposal.

Browser regression: serve dist on port 5173, then run
`node tests/viewport-browser.cjs` with Playwright available via NODE_PATH.
This uses actual Edge/Chromium, mobile touch emulation and production modules;
it is not iOS Safari emulation or physical iPhone verification.

Physical iPhone Safari still requires 10–15 rotations starting in each orientation,
rapid back-and-forth rotations, browser toolbar expansion/collapse, standalone
mode, safe-area/notch checks and simultaneous touch controls. Check for blank
areas, clipped/overlapping HUD, stable buffer/aspect dimensions, and sustained
FPS/memory/thermal behavior. Automated event tests establish bounded work, not
device performance.

Observed production Edge results: both starting orientations passed 15 settled
transitions plus eight rapid resizes each. Canvas, body, visual viewport, drawing
buffer/DPR and camera aspect agreed; joystick, turbo, compass and vehicle-toggle
bounds passed; browser touch Forward input passed. Zero page errors. After the
settling window, resize counts remained unchanged for another 1.2 seconds. Final
390x844 canvas, DPR 1 (existing low quality profile), resize counts 23/22.
These checks inspect geometry/input, not a physical Safari screenshot comparison.
