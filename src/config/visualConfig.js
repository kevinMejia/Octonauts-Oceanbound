// Art direction for a single ~240 m opening biome. Global terrain/materials
// use the same visual language; only the authored composition is concentrated.
export const visualConfig={
 showcase:{x:180,z:205,radius:120,blendStart:82,seed:44712},
 sand:{tileMetres:2.4,normalStrength:.4},
 lighting:{sunIntensity:3.5,hemisphereIntensity:.9,reflections:true},
 mobileGlass:{mode:'original',opacity:.28,facingOpacity:.65}, // Opt-in ?glass=mobile comparison; no automatic mobile downgrade.
 marine:{batchJellyfishTentacles:true},
};
export function batchJellyfishTentacles(host=globalThis){const requested=new URLSearchParams(host.location?.search??'').get('tentacles');return requested==='original'?false:requested==='batched'?true:visualConfig.marine.batchJellyfishTentacles;}
