# Abyssal Garden source

https://github.com/Noniv/abyssal-garden
Pinned commit: c628d18c708ce12849085f3e4ec4a0136e5efd5b
MIT, Copyright (c) 2026 Maksymilian Dendura. See LICENSE.

procedural.js: upstream source/src/math.js and source/src/world.js concatenated verbatim, preceded by fixed generation quality constants and followed by export adapters. kelpColumn copies the original column generator into a standalone wrapper. The unused original full-world/WebGPU storage path is retained for source fidelity, but is not executed.
terrain-shader.js: extracted upstream density shader and primitive data used by the offline bake tool.

See docs/abyssal-arena/README.md for rendering and resolution differences.
