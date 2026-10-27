# Fitted lower HUD row

Approved follow-up: fish/count left aligned beside Settings, lower housing narrowed
and bottom straightened to the emblem baseline. Both labels share the TURBO-size
CSS variable, and the fish uses that size for width/height. The static scanline
pattern now fills the entire housing silhouette. Original badge remains unchanged.

Code: index.html contains hud-contour, the full-silhouette hud-texture and hudLines.
src/ui/gameplayHud.css owns --hud-label-size, typography, grid and safe-area anchor.
The marine button retains a transparent 44px touch height and actual state source.
No notification, gameplay, camera or viewport code changes.

365 Node tests, production build and diff checks pass. Physical iPhone Safari,
notch/toolbar behavior and hardware performance remain unverified. One agent only.

Production Edge checks pass six viewport changes, exact shared font size/style,
Settings open/close, 44px counter touch height, live Turbo drain/regen/infinite,
marine counter updates and notification stacking, with no page errors.
