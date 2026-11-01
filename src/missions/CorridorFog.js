import * as T from 'three';
const cached=new WeakMap();
export function corridorFogScale(x,c){const t=Math.max(0,Math.min(1,(Math.abs(x-c.centreX)-c.clearHalfWidth)/(c.edgeHalfWidth-c.clearHalfWidth)));return c.densityScale+(1-c.densityScale)*t*t*(3-2*t);}
// Reuse native distance fog; only its density inside the sandy route is lighter.
// Stable per-material uniforms also work when Three reuses a cached program.
export class CorridorFog{
 constructor(profile){this.profile=profile;this.records=[];this.seen=new Set();}
 apply(root){root.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material]){
  if(!material||material.fog===false||material.isShaderMaterial||this.seen.has(material))continue;this.seen.add(material);
  let r=cached.get(material);
  if(!r||material.onBeforeCompile!==r.before||material.customProgramCacheKey!==r.key){
   r={material,before:material.onBeforeCompile,key:material.customProgramCacheKey,cacheKey:material.customProgramCacheKey(),uniform:{value:new T.Vector4()}};
   r.compile=(shader,renderer)=>{
    r.before.call(material,shader,renderer);shader.uniforms.uCorridorFog=r.uniform;
    shader.vertexShader=shader.vertexShader.replace('#include <fog_pars_vertex>','#include <fog_pars_vertex>\n#ifdef USE_FOG\nvarying float vCorridorFogX;\n#endif').replace('#include <fog_vertex>',`#include <fog_vertex>
     #ifdef USE_FOG
      vec4 corridorFogPosition=vec4(transformed,1.);
      #ifdef USE_INSTANCING
       corridorFogPosition=instanceMatrix*corridorFogPosition;
      #endif
      vCorridorFogX=(modelMatrix*corridorFogPosition).x;
     #endif`);
    const fragment=T.ShaderChunk.fog_fragment.replace('fogDensity * fogDensity','fogDensity * fogDensity * corridorFogScale * corridorFogScale').replace('fogNear, fogFar, vFogDepth','fogNear, fogFar, vFogDepth * corridorFogScale');
    shader.fragmentShader=shader.fragmentShader.replace('#include <fog_pars_fragment>','#include <fog_pars_fragment>\n#ifdef USE_FOG\nvarying float vCorridorFogX;uniform vec4 uCorridorFog;\n#endif').replace('#include <fog_fragment>',`#ifdef USE_FOG
     float corridorFogScale=mix(uCorridorFog.w,1.,smoothstep(uCorridorFog.y,uCorridorFog.z,abs(vCorridorFogX-uCorridorFog.x)));
     #endif
     ${fragment}`);
   };
   r.programKey=()=>r.cacheKey+'|dolphin-corridor-fog-1';cached.set(material,r);
  }
  const c=this.profile;r.uniform.value.set(c.centreX,c.clearHalfWidth,c.edgeHalfWidth,c.densityScale);material.onBeforeCompile=r.compile;material.customProgramCacheKey=r.programKey;material.needsUpdate=true;this.records.push(r);
 }});}
 setDensityScale(value){for(const r of this.records)r.uniform.value.w=value;}
 dispose(){for(const r of this.records){const m=r.material;if(m.onBeforeCompile===r.compile)m.onBeforeCompile=r.before;if(m.customProgramCacheKey===r.programKey)m.customProgramCacheKey=r.key;m.needsUpdate=true;}this.records.length=0;this.seen.clear();}
}
