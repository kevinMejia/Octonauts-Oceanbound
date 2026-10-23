# Oceanbound startup verification

The initial HTML owns the only startup overlay. Its CSS hides gameplay before modules run; StartupScreen also makes existing and dynamically inserted game surfaces inert. Game.start remains the only initializer. Its startup pause token keeps simulation stopped until PLAY, while the first scene frame and shaders are prepared behind the overlay.

Progress counts 11 settled initialization units: default GUP, decorations, pickups, habitat, Octopod, crew, interaction surfaces, game systems, two fleet preloads, and first scene GPU preparation. Failed optional fleet preloads settle and remain retryable through the existing cache. Required failures show a reload-based Retry, avoiding reuse of partially initialized resources. The completion hold is presentation only, never simulated progress.

AudioManager requires explicit PLAY authorization for this game. The click handler synchronously calls the existing unlock path (media playback, context resume, silent source), then clears input and releases the startup pause. Saved audio settings are preserved. Audio failure does not prevent entering gameplay.

Verified 2026-10-23:

- 100 Node tests pass, including startup audio authorization and fleet preloading.
- Production build passes, with versioned module graph and validated GLB files.
- Automated Edge/Chromium browser checks pass: artificially delayed required model, real partial progress, no audio context on loading gestures, hidden HUD, stationary player while ready, one PLAY transition, resumed context, restored HUD, critical failure and successful Retry, reduced motion, silent audio failure fallback.
- Visually inspected loading and ready states at desktop 1280 x 800, portrait 390 x 844, landscape 844 x 390. Screenshots in this folder. Button bounds and absence of horizontal scrolling checked automatically.

Run the browser check with the development server on port 5173 and Playwright available via NODE_PATH: node tests/startup-browser.cjs. BROWSER_CHANNEL defaults to msedge.

Limitations: physical iPhone Safari audio unlock and safe-area behavior require device verification. The existing project artwork contains the circular Octonauts badge, rather than the mockup's full wordmark; the badge is reused unmodified. The scene uses lightweight vector/CSS artwork rather than the mockup's painted background.
