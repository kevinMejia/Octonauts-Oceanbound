# Octonauts Word Hunt

Nine colorful, emissive, instanced block letters float and rotate throughout the ocean. Collection uses the existing swept-sphere proximity helper, with stable IDs mapped to individual word positions. No added libraries, physics, sound, or permanent HUD.

The centered discovery notice fades in over 0.15 seconds, stays until 3 seconds after collection, then fades out completely over 0.4 seconds. Another collection restarts the single elapsed-time clock. It continues expiring while gameplay is paused. Restoring saved progress never opens the notice.

## Placement and tuning

Edit `src/config/wordHuntConfig.js`: `letters` controls coordinates and stable IDs; `collectionRadius` defaults to 7 metres. Animation amplitude and speeds are configurable there too. Keep IDs stable to preserve existing saves. Word order follows the array order.

Assigned locations (x, y, z), followed by terrain-adjusted base y observed in browser QA:

| ID | Letter | Assigned coordinates | Safe base y |
| --- | --- | --- | --- |
| o-1 | O | 120, 22, 185 | 22 |
| c-2 | C | 0, 30, 70 | 30 |
| t-3 | T | -190, 18, 160 | 22.752 |
| o-4 | O | -380, 25, -120 | 25 |
| n-5 | N | 230, 18, -270 | 24.219 |
| a-6 | A | 470, 30, 120 | 30 |
| u-7 | U | -260, 15, 470 | 17.132 |
| t-8 | T | 420, 16, 490 | 16 |
| s-9 | S | -540, 12, -470 | 25.674 |

The first two explore the opening landmark and reef regions; the rest span western rocks, southern waters, eastern open water and distant corners. `safeLetterPoint` raises letters above terrain and searches nearby coordinates deterministically when registered obstacles obstruct a point. It allows 8 metres of clearance for the letter, bobbing and GUP approach. No horizontal relocation was needed in the tested world. Exact spawned positions are available in `explorer.wordHunt.records[].point`.

## Persistence and reward

Uses the existing progression convention: versioned JSON in local storage, key `oceanbound.word-hunt.v1`. Saves unique IDs, count and Infinite Turbo status after every discovery. On load, IDs are validated against configuration and count/reward are derived from those IDs. Storage failure leaves progress usable for the current session. Existing Reset gameplay progress clears this save alongside other discoveries.

All nine IDs unlock Infinite Turbo for the active GUP and every subsequent vehicle selection, including after reload. Charge remains 100%; the existing player input and forward-thrust requirement still activate turbo. Normal speed, multipliers and pre-unlock drain/recharge are unchanged.

## Files

Added: `src/config/wordHuntConfig.js`, `src/wordHunt/WordHunt.js`, `src/wordHunt/WordHuntProgress.js`, `src/ui/WordHuntDisplay.js`, `tests/word-hunt.test.js`, `tests/word-hunt-browser.cjs`, and this document.

Modified: `src/game/Game.js` (lifecycle, update, fleet reward), `src/turbo/TurboBoost.js` (optional infinite charge), `src/ui/Settings.js` (existing gameplay reset), `tests/gameplay-reset-browser.cjs` (new progression reset assertions).

## Validation

- `node --test tests/*.test.js`: 233 tests passed, including progression, repeated letters, storage failure, notification timing and reward gating.
- `python tools/build.py`: production site built and GLB validation passed.
- `tests/word-hunt-browser.cjs`: automated Edge/WebGL checks cover spawn, obstacle clearance, proximity collection, faint repeated placeholders, timer restart and complete hiding, completion reward, active/released turbo, GUP-A switch, reload persistence, reset and narrow viewport layout.
- No new dependency. Little Big Dirt was not available in the accessible workspace.

Browser collection tests position the GUP at each letter; they do not manually pilot complete ocean routes or exercise every GUP model and physical mobile device. Safety checks use existing registered collision surfaces and terrain, not every cosmetic plant mesh.
