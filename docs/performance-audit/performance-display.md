# Live performance display

Settings > Graphics > Show performance display enables/disables diagnostics immediately, without restart. Off by default; preference is saved locally when storage is available.

The top-center, touch-through display reports reciprocal mean frame interval (FPS), mean and p95 intervals, and a count of intervals over 50 ms in a rolling two-second window (up to 512 samples). It updates at most twice per second. Initial readings cover the samples available since enabling/resuming. Open dialogs, game pause, graphics recovery and background periods reset the window; a visibility listener also excludes background gaps when requestAnimationFrame is suspended.

These are browser animation-loop frame-delivery intervals on the actual device, not CPU duration, GPU timer measurements, exact presented frames or a benchmark proving improvements. The display itself adds small sampling and text-update overhead while enabled. It does no frame sampling or DOM querying while disabled. No gameplay/rendering settings are changed.

Verification: 268 Node tests and production build pass. Unit checks cover statistics, disabled sampling, bounded history and pause/resume gaps. Run tools/verify-performance-display.cjs with the local server on port 5173 and Playwright/Edge available to check desktop and mobile layouts, immediate toggling, menu exclusion and persisted preference.
