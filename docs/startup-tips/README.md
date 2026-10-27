# Context-aware welcome tips

StartupScreen remains the sole loading/ready screen, driven by Game.start's real
progress callback and existing 650ms Play reveal. Background, ring, emblem, title,
Play behavior and failure/retry remain. Tips occupy a fixed two-line space above
Play in both states to avoid text-dependent movement. Reduced motion skips fades.

startupTipsConfig holds thirteen stable IDs, categories, text generators and
eligibility predicates. GUP-X wording reflects VehicleUnlocks.checkFinal: all
required other GUPs plus return to the Octopod. Effective unlocks include the
existing Settings override. Animal totals come from MarineDiscovery.records;
rescue completion uses CrewDiscovery.rescuedCount, not discovery count. Letters
use WordHuntProgress.infiniteTurbo. Missing objects permit only general tips.
No storage access, save operation, network request or progression changes added.

StartupTips uses a shuffled queue and seen IDs, pruning ineligible entries and
inserting newly eligible tips. Exhaustion reshuffles; an alternative replaces a
consecutive boundary repeat. One pending timeout schedules 3800ms of display and
a 200ms fade-out/text swap, then repeats; CSS handles the 250ms fade-in. Timers
are canceled on hide, tab background, failure and Play. Visibility restoration
restarts idempotently. Eligibility refreshes at real startup progress updates and
each rotation, including progress changes while waiting on Play. No frame polling.

Verification:
- node --test tests/*.test.js: 365 pass, including deterministic queue, dynamic
  counts/completion, unknown state, boundary repeats, restart/cleanup and four
  simulated minutes of uninterrupted rotation with at most one pending timer.
- python tools/build.py and git diff --check pass.
- Production Edge tools/startup-tips-check.cjs passes real delayed-load rotation,
  repeated rotation after 100% with Play visible, eight orientation transitions,
  two-line text bounds/no overlap with Play, in-memory completion filtering,
  reduced motion, hide/resume and no text updates after Play. No page errors.
- Existing startup browser regression passes: slow progress, silent wait, Play
  once, audio unlock, failure/retry, reduced motion and silent audio fallback.
  A temporary copy adjusted its asset route to match production query strings;
  the original test source and historical screenshots remain unchanged.
- Captures: landscape.png and portrait.png. Portrait capture includes a fade.

One agent only; no independent agent QA. Physical iPhone Safari notch/safe-area,
Dynamic Island, toolbar expansion/collapse, hardware touch and sustained startup
performance remain manual checks. Automated viewport checks use desktop Edge,
not iOS. Long-duration timer checks use a fake clock; real welcome dwell was
several rotations, not several minutes.

TIPS-025 adds a general turbo controls tip: double-tap Forward, W or Up and
hold the second press. All four focused tip tests and production build pass.
