# Unified gameplay HUD

Single-agent implementation, as requested. Existing Settings badge and handler,
TurboMeter, marine collection button/counter, charge/unlock state and gameplay
mechanics are reused. Gameplay header and curved Settings label are removed;
menu/loading branding stays intact. gameplayHud.css owns the connected assembly.

RescueNavigation and RescueSystem now receive gameplayNotifications instead of
Turbo. Existing rescue queue, deadlines and transitions are unchanged. Word hunt
uses the same stack, retaining its own content, deadlines, letter effects and fade.
Normal document flow stacks simultaneous panels without new queues or timers.
On widths up to 1000px the notification lane moves below the assembly (safe top
+126px) to prevent overlap; wider screens use safe top +20px. Permanent anchor
is safe top/left +12px. Existing GameViewport remains unchanged.

Validation: 361 Node tests pass; python tools/build.py and git diff --check pass.
Production Edge tools/hud-check.cjs checks Settings open/Escape, six viewport
transitions, HUD bounds/order at 1280x720, 390x844, 844x390 and 320x568, and no page
errors. PNGs capture the actual rendered game. notifications.png deliberately
presents simultaneous messages through existing presentation objects; it is a
layout check, not a full rescue/word-hunt playthrough. Actual Turbo drain/regen,
infinite unlock and discovery gameplay were not newly exercised end-to-end;
existing Node tests cover their unchanged systems.

Physical iPhone Safari safe-area/notch/Dynamic Island, browser toolbar behavior,
multitouch, subjective mockup fidelity and sustained FPS remain manual checks.
No dependencies, continuous loops, positioning timers or WebGL resources added.
No subagents or independent QA ran, per the explicit single-agent instruction.

Production Edge viewport regression also passes: 15 settled plus eight rapid
transitions from each starting orientation, canvas/body/buffer/aspect agreement,
HUD bounds, touch Forward input, no idle resizing and no page errors.
