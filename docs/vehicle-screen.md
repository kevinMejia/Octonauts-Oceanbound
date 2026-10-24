# Vehicle control-screen update

The existing vehicle selector keeps its dimensions, card proportions, thumbnails, names, locks, center/neighbor layout, dots and carousel animations. Its screen and cards now use the HUD's dark teal palette and horizontal scanlines, with a thin metallic rim and cyan selected/primary-action glow.

Arrow and X buttons are removed. Card clicks, swipes, pagination dots, keyboard arrows, Enter selection and Escape remain available. Outside dismissal requires a pointer gesture that starts and ends outside the dialog bounds. Clicking inside, or dragging a card from inside to outside, does not dismiss it. Dismissal calls the existing close/cancel path, including pause release and pending selection cancellation. Unlocking, spawning, selection and vehicle mechanics are unchanged.

`tests/vehicle-screen-browser.cjs` covers desktop mouse and mobile touch dismissal, inside clicks, drag-out protection, all retained navigation methods, locked indicators, selecting an unlocked GUP, screen texture and four responsive viewports. The existing carousel, fleet and pending-load cancellation regressions now use retained card/keyboard controls instead of the removed buttons.
