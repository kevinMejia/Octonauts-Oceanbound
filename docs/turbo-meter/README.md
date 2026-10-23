# Turbo meter display fix

Replaced the platform-native meter painting path with a small HTML fill using transform: scaleX(charge / 100). The same current TurboBoost charge drives both the visible fill and accessible meter value. This removes reliance on browser-specific meter pseudo-elements/repainting; actual iPhone Safari reproduction was not available, so the precise original platform failure is not claimed as proven.

Recharge, pickup amounts, boost activation and drain rates remain unchanged. The transparent top-centre HUD and compact track are retained. No timers or simulated progress were introduced.

55 tests pass, including a regression exercising the display against real TurboBoost recharge, pickup collection and drain, plus invalid-value clamping. In the actual local game the displayed value/fill grew from about 17.6% to 56.1%, then decreased to 44.3% after a double-press-and-hold boost. Both directions were visually inspected; screenshots are refilling.png and draining.png. The standalone game reported no warnings/errors. All 40 local production-resource checks passed.

GitHub Pages deployment for 114196a succeeded; all 40 public production-resource checks passed.
