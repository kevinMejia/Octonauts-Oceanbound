# Modeling references

Inspected October 22, 2026. Reference images are linked, not redistributed.

- https://www.ebay.com/itm/165995966194 — original 2010 Fisher Price GUP-B, side/front three-quarter view. Flattened orange fuselage; tall clear bubble; burnt-orange swept pectoral fins, tall aft dorsal and vertical tail. White eye patches with dark pupils. Hull seam and rivets. Blue/white Octonaut badge.
- https://www.ebay.com/itm/385510231071 — newer Moose Toys version, front view. Used only to cross-check bow width, paired eyes and fin arrangement; character deliberately omitted.
- https://www.pngegg.com/en/png-wjbtm — animated-series illustration search reference.
- https://octonauts.fandom.com/wiki/Gup-B — search extract corroborates orange, single-seat, shark design; page inaccessible.

Limitations: no clean orthographic rear/top production drawings obtained. Rear propulsion and cockpit interior are approximate; model is a simplified fan interpretation, not a claim of exact production accuracy. The badge is a small stylized octopus, not a traced logo. Toy-specific wheels, jaw mechanism, rescue rope and character omitted. The screw is independently animated.

Source coordinates: Blender -Y bow, +Z up. GLB +Z bow, +Y up. Propeller exported as a named parent; animate its local Z rotation.

Regenerate from repository root:
`blender -b --python assets/blender/scripts/create-gup-b.py`
`blender -b --python assets/blender/scripts/create-environment.py`

Main source saves before studio additions. Four inspection renders are under docs/. Environment sources contain three variations each of coral, kelp, rocks, shells and grass, batched at runtime with instancing.

## October 22 environment library

`underwater-environment.blend` and `scripts/create-underwater-environment.py` form the current reef source. The user-supplied ocean concept guided the palette, varied coral forms and clustered composition; it is not embedded or redistributed. Authored organic surfaces and reduced LODs are procedural Blender meshes, with no downloaded scenery or textures. Studio and actual gameplay inspection evidence is under `docs/environment-upgrade/`.
