import * as T from 'three';
// Shared uniforms across existing scenery shaders; no object search or physics bodies.
export const vegetationInteraction={position:{value:new T.Vector3(0,-1000,0)},strength:{value:0}};
export function bendVegetation(shader,weight='clamp(position.y*.5,0.,1.)'){Object.assign(shader.uniforms,{uSubPosition:vegetationInteraction.position,uSubStrength:vegetationInteraction.strength});shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform vec3 uSubPosition;uniform float uSubStrength;');shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec3 plantWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;
vec3 away=plantWorld-uSubPosition;float reach=1.-smoothstep(1.,5.,length(away));
transformed.xz+=normalize(away.xz+vec2(.001))*reach*uSubStrength*.5*${weight};
#include <project_vertex>`);}
