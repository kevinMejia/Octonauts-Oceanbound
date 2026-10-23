# iPhone fleet GPU texture budget follow-up

The renewed report is a crash and reset after discovering more than two GUPs in iPhone Chrome. That specific physical-device restart has not been reproduced locally. Inspection found that the earlier fix freed decoded CPU images but left full-resolution GPU textures resident for all nearby parked GUPs. Discovering more vehicles therefore increased graphics memory even when idle decoded-image counters were zero. This is memory pressure, not proof of an unbounded JavaScript leak.

`vehicleTexturePolicy.js` now caps vehicle image uploads at 512 pixels on the longest side for iPhones, iPads, iPods and coarse-pointer devices. Desktop retains original resolution. Aspect ratios, geometry, source GLBs, material mappings, wildlife, parking, collision and unlocks are unchanged. The tradeoff is reduced close-up vehicle texture detail on touch devices. The shared image cache retains compressed original bytes, so upload eviction/restoration and switching still reuse assets without downloads.

ImageBitmap decoding requests the target size directly. The HTMLImageElement path and decoders that ignore resize requests explicitly resize into a canvas before GPU upload; temporary canvases have their backing buffers zeroed after upload, including failures. Older decoders can still briefly decode one full image while resizing; the serialized upload queue prevents multiple such source decodes from competing. The cache's decoded-byte counter measures returned upload images, not that decoder-internal transient or whole browser memory.

With all eight GUPs uploaded in mobile Chromium emulation, measured texture-handle dimensions estimate about 157.3 MiB of vehicle GPU pixels including mipmaps, versus approximately 981 MiB inferred from the deduplicated full-size source textures. These are pixel-allocation estimates, excluding geometry, world textures, driver overhead and browser memory. Managed decoded upload pixels peak at 1 MiB and return to zero after uploads. GPU allocations are now bounded by the mobile image dimensions even when the whole parked fleet is visible.

Validation: 155 Node tests pass; production build and mobile production discovery smoke pass. The fleet stress test covers all seven discoveries, three repeated six-GUP switch cycles, leaving and returning to the complete fleet, forced WebGL context recovery/retry, and legacy HTML image decoding. It asserts one document navigation, zero crashes/page errors/GL errors, one request per vehicle GLB, zero idle managed decoded pixels, and a fleet texture estimate below 192 MiB. Set `FLEET_IPHONE_CHROME=1` for the iPhone Chrome user-agent variant; this selects its HTML image decode path in Chromium and is not a physical iPhone test. Marine proximity popups are disabled only in this fleet-focused test to avoid an unrelated encounter interrupting its automated route; animal visuals remain loaded.

Physical iPhone Chrome still needs confirmation with the deployed build. No browser reset can be recovered after the operating system has terminated its process.

---

## Earlier decoded-image retention investigation (historical)


The reported symptom is an unexpected return to the loading/PLAY screen while discovering the second or third GUP. No discovery, vehicle selection, or Fleet code invokes a page navigation or reload. The only explicit reload is the manually pressed startup-failure Retry button.

A real iPhone restart was not reproduced or connected to a device log. Browser memory pressure is the leading explanation, supported by a concrete retention issue in the original asset path: every cached GLB retained its decoded image data, even after distant vehicles released their GPU allocations.

## Evidence

Embedded PNG dimensions imply approximately 1,242 MiB of decoded RGBA pixels across the eight high-detail vehicles, before GPU mipmaps, geometry or the world. These are uncompressed pixel estimates, not measured Safari process memory:

| Vehicle | Embedded decoded RGBA MiB |
| --- | ---: |
| A | 147.0 |
| B | 139.7 |
| C | 126.0 |
| D | 118.0 |
| E | 106.0 |
| F | 36.0 |
| Q | 414.0 |
| R | 155.0 |

Repeated identical images also existed within GLBs and across different vehicles. An ImageBitmap can retain substantial native memory that JavaScript heap counters do not represent. Previously, GPU disposal deliberately retained those images for reuse, allowing memory to accumulate as more GUPs were visited.

## Fix

- `VehicleImageCache.js` keeps compressed image blobs and shares byte-identical image sources. Images are decoded only while uploading, then ImageBitmaps are closed or HTML images are cleared. Dimensions remain available to the renderer and model statistics.
- `VehicleTextures.js` uses a GLTFLoader plugin and preserves the loader's material, sampler and UV handling. A global preparation queue limits vehicle texture uploads to one image source at a time. Three can share GPU allocations for the same source/sampler. Unsupported image formats retain the established loader path.
- One exact uniform-black PNG used repeatedly by the exports is represented by an equivalent 1x1 PNG in `constantVehicleImages.js`. No nonuniform texture is resampled. Original GLBs, model geometry, materials and source files are unchanged.
- Vehicle startup, selection and parked-model loading explicitly prepare GPU textures before revealing models. Selector-prepared models are registered with the parking/resource owner even when a switch is cancelled; preparation failures release partial GPU allocations. Returning, GPU-evicted vehicles remain hidden until their full-resolution textures are ready. Compressed bytes and geometry stay cached; no new GLB request is necessary.
- A lost WebGL context pauses its own game token and restores existing scene textures/programs in place when the browser restores the context. Other pause owners, player position and unlocks remain intact. Recovery failure offers an in-place retry rather than instructing a reload. A browser process that has already been terminated cannot be recovered by JavaScript.

## Verification

138 Node tests pass, including resource sharing, decode/upload failure retries, concurrent ownership, cleanup, GPU invalidation, and asynchronous parked-model restoration. Existing eight-vehicle movement and collision tests remain included.

`tests/fleet-memory-browser.cjs` passed in Chromium mobile touch emulation:

- All seven discoveries, including the second and third vehicles, with image-button activation.
- Three repeated six-vehicle switch cycles and three trips away from/back to the full parked fleet.
- Exactly one document navigation (the initial load), no crashes, no page errors and no WebGL errors in sampled gameplay.
- Each GLB requested once for the entire session, including graphics recovery.
- Managed decoded vehicle pixels: 0 bytes at idle after uploads; maximum temporary decoded image data 26,214,400 bytes (25 MiB) across the run.
- All eight models retained through 119 unique compressed image entries totaling 48,466,465 bytes (about 46 MiB). Geometry and GPU memory are additional, so these figures are not whole-game memory.
- Forced WebGL loss/restoration preserved player position and an unrelated pause token without navigation. A deliberately failed first recovery was retried successfully through the visible, tappable Try again button.
- HTMLImageElement decoding was exercised using a Safari 16 user-agent override in Chromium. This checks the fallback code path; it is not an actual Safari test.

A separate saved-unlock carousel regression (`tests/fleet-saved-memory.cjs`) also passed: a previously unloaded GUP selected from saved progress immediately joins the tracked fleet, and cancelling another prepared vehicle preserves the active GUP while allowing the cancelled model to be GPU-released.

The existing complete fleet browser workflow passed, desktop high quality reached PLAY with no GL error, and the production mobile smoke test passed. In-game full-fleet and vehicle screenshots were inspected locally. No model detail reduction, environment reset, audio-system replacement or unlock reset was introduced.

Physical iPhone Safari remains untested. The fix removes the measured retention/spike mechanism; confirmation of the user's exact phone symptom still requires trying the deployed version on that phone. See `browser-results.json` for the captured stress-test data.
