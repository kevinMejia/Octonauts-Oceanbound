import * as T from 'three';
import {waterConfig as config} from '../config/waterConfig.js';
import {AmbientWater} from './AmbientWater.js';
import {PropulsionWater} from '../effects/PropulsionWater.js';
import {causticTexture,causticTime} from './waterCaustics.js';
import {worldConfig} from '../config/worldConfig.js';
import {environmentConfig} from '../config/environmentConfig.js';
export function atmosphere(scene,profile=environmentConfig.profiles.high){
 const low=profile===environmentConfig.profiles.low,baseFog=new T.Color(config.atmosphere.fogColor),depthTint=new T.Color(config.atmosphere.depthTint);scene.background=baseFog.clone();scene.fog=new T.FogExp2(baseFog.clone(),config.atmosphere.fogDensity);
 scene.add(new T.HemisphereLight(0xb1e8ec,0x465b55,.85));
 const sun=new T.DirectionalLight(0xfff0d0,3.2);sun.position.set(-42,62,-25);sun.target.position.set(0,0,0);scene.add(sun,sun.target);
 sun.castShadow=profile===environmentConfig.profiles.high;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-50,right:50,top:50,bottom:-50,near:1,far:150});sun.shadow.bias=-.0003;sun.shadow.normalBias=.06;sun.shadow.radius=3;
 // A sky dome suggests the bright surface above and blue absorption at depth.
 const dome=new T.Mesh(new T.SphereGeometry(440,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{time:{value:0},shaftIntensity:{value:low?0:config.atmosphere.lightShaftIntensity},depthBlend:{value:0}},vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vDirection;uniform float time,shaftIntensity,depthBlend;void main(){vec3 d=normalize(vDirection);float up=smoothstep(-.25,.9,d.y);vec3 color=mix(vec3(.015,.18,.30),vec3(.06,.58,.69),up);float sun=pow(max(0.,dot(d,normalize(vec3(-.4,.9,-.25)))),25.);color+=vec3(.32,.48,.43)*sun;float bands=pow(max(0.,sin(atan(d.x,d.z)*13.+sin(d.y*7.+time*.09)*.2)),18.)*smoothstep(.1,.8,d.y);color+=vec3(.45,.78,.8)*bands*shaftIntensity; color=mix(color,color*vec3(.9,.97,1.02),depthBlend);gl_FragColor=vec4(color,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')}));dome.renderOrder=-10;scene.add(dome);
 const caustic=causticTexture();
 const surface=new T.Mesh(new T.PlaneGeometry(worldConfig.size,worldConfig.size),new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:{time:{value:0},pattern:{value:caustic}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;uniform sampler2D pattern;void main(){vec2 uv=vUv*55.;uv+=vec2(sin(uv.y*.6+time*.13),cos(uv.x*.5-time*.1))*.13;float a=texture2D(pattern,uv+vec2(time*.009,-time*.007)).r;gl_FragColor=vec4(vec3(.3,.8,.9),a*.22);}` }));surface.rotation.x=-Math.PI/2;surface.position.y=worldConfig.surface+.2;scene.add(surface);
 const ambient=new AmbientWater(scene,low),propulsion=new PropulsionWater(scene,low);const inspect=new URLSearchParams(location.search).has('inspect');let output;
 return {ambient,propulsion,update(time,dt,sub,vehicle,camera,pixelRatio){
  const position=sub.position,depth=Math.max(0,Math.min(1,(worldConfig.surface-position.y)/config.atmosphere.depthRange));
  scene.fog.color.copy(baseFog).lerp(depthTint,depth*config.atmosphere.depthTintStrength);scene.fog.density=config.atmosphere.fogDensity*(1+depth*.08);scene.background.copy(scene.fog.color);sun.intensity=3.2*(1-depth*.06);
  dome.position.set(position.x,12,position.z);dome.material.uniforms.time.value=time;dome.material.uniforms.depthBlend.value=depth;surface.material.uniforms.time.value=time;sun.position.set(position.x-42,62,position.z-25);sun.target.position.set(position.x,0,position.z);sun.target.updateMatrixWorld();causticTime.value=time;
  ambient.update(time,camera,pixelRatio);propulsion.update(dt,time,sub,vehicle,camera,pixelRatio);
  if(inspect){output??=document.body.appendChild(Object.assign(document.createElement('output'),{id:'waterMetrics',hidden:true}));output.dataset.metrics=JSON.stringify({bubbles:propulsion.activeBubbles,flow:propulsion.activeStreaks,ambient:ambient.count,bubbleBudget:propulsion.bubbles.items.length,flowBudget:propulsion.streaks.items.length,quality:low?'low':'high',speed:sub.speed,boost:sub.turbo.active,depth:worldConfig.surface-position.y});}
 }};
}
