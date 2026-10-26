import * as T from 'three';
// Shared ambient response for unlit cloud shaders, including paused transformations.
export const particleLightTint={value:new T.Color(1,1,1)};
export function updateParticleLighting(night,tint){const n=Math.max(0,Math.min(1,night));particleLightTint.value.setRGB(1-n*(1-tint[0]),1-n*(1-tint[1]),1-n*(1-tint[2]));}
