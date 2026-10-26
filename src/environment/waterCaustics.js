import * as T from 'three';
import {waterConfig as config} from '../config/waterConfig.js';
import {worldConfig} from '../config/worldConfig.js';
let texture;
export function causticTexture(){if(!texture){texture=new T.TextureLoader().load(new URL('../../assets/textures/caustics.png',import.meta.url).href);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.NoColorSpace;}return texture;}
export const causticTime={value:0};
export const causticDaylight={value:1};
export function applyWaterCaustics(material,strength=1,low=false){if(!config.caustics.enabled)return;const previous=material.onBeforeCompile,key=material.customProgramCacheKey();material.customProgramCacheKey=()=>key+'|water-caustics-2|'+low;
 material.onBeforeCompile=shader=>{previous.call(material,shader);Object.assign(shader.uniforms,{uWaterTime:causticTime,uWaterDaylight:causticDaylight,uWaterCausticMap:{value:causticTexture()},uWaterStrength:{value:config.caustics.intensity*strength},uWaterScale:{value:config.caustics.scale},uWaterAnimation:{value:config.caustics.animationSpeed},uWaterSurface:{value:worldConfig.surface},uWaterDepthFalloff:{value:config.caustics.depthFalloff}});
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWaterSurfacePosition;varying float vWaterFacing;').replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vec4 waterWorld=vec4(transformed,1.);vec3 waterNormal=normal;
 #ifdef USE_INSTANCING
 waterWorld=instanceMatrix*waterWorld;waterNormal=mat3(instanceMatrix)*waterNormal;
 #endif
 vWaterSurfacePosition=(modelMatrix*waterWorld).xyz;vWaterFacing=.2+.8*max(0.,normalize(mat3(modelMatrix)*waterNormal).y);`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 vWaterSurfacePosition;varying float vWaterFacing;uniform float uWaterDaylight,uWaterTime,uWaterStrength,uWaterScale,uWaterAnimation,uWaterSurface,uWaterDepthFalloff;uniform sampler2D uWaterCausticMap;`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`vec2 waterXZ=vWaterSurfacePosition.xz;float wt=uWaterTime*uWaterAnimation;
 float ca=texture2D(uWaterCausticMap,waterXZ*uWaterScale+vec2(sin(waterXZ.y*.22+wt*.18),cos(waterXZ.x*.19-wt*.13))*.12+vec2(wt*.007,-wt*.004)).r;
 ${low?'':`float cb=texture2D(uWaterCausticMap,waterXZ*uWaterScale*1.16+vec2(cos(waterXZ.y*.17-wt*.14),sin(waterXZ.x*.24+wt*.12))*.11+vec2(-wt*.005,wt*.006)).r;ca=ca*.65+cb*.35;`}
 float waterDepth=exp(-max(0.,uWaterSurface-vWaterSurfacePosition.y)*uWaterDepthFalloff);
 outgoingLight+=diffuseColor.rgb*vec3(.91,1.,.84)*ca*uWaterStrength*uWaterDaylight*waterDepth*vWaterFacing;
 #include <opaque_fragment>`);
 };
}
