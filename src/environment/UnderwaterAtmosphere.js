import {SkyEnvironment} from './SkyEnvironment.js';
import {oceanSkyConfig} from '../config/skyConfig.js';
import {updateParticleLighting} from './particleLighting.js';
import {dayNightConfig as dayConfig} from '../config/dayNightConfig.js';
import {airBlend} from '../effects/waterMath.js';
import {SunRays} from './SunRays.js';
import {visualConfig} from '../config/visualConfig.js';
import {waterReflections} from './waterReflections.js';
import * as T from 'three';
import {waterConfig as config} from '../config/waterConfig.js';
import {AmbientWater} from './AmbientWater.js';
import {PropulsionWater} from '../effects/PropulsionWater.js';
import {causticTexture,causticTime,causticDaylight} from './waterCaustics.js';
import {worldConfig} from '../config/worldConfig.js';
import {environmentConfig} from '../config/environmentConfig.js';
const gain=(night,minimum)=>1-night*(1-minimum);
export function atmosphere(scene,profile=environmentConfig.profiles.high,renderer,cycle){
 const skyEnvironment=new SkyEnvironment(scene),skyVisibility={opacity:0,visible:false},skyCycle=cycle??{timeOfDay:.45,daylight:1};let skyPrepared=false;
 const reflection=renderer?waterReflections(scene,renderer):null;
 const low=profile===environmentConfig.profiles.low,baseFog=new T.Color(profile.fogColor??config.atmosphere.fogColor),depthTint=new T.Color(profile.depthTint??config.atmosphere.depthTint);scene.background=baseFog.clone();scene.fog=new T.FogExp2(baseFog.clone(),config.atmosphere.fogDensity);
 const hemi=new T.HemisphereLight(0xb1e8ec,0x64685a,(profile.hemisphereIntensity??visualConfig.lighting.hemisphereIntensity));scene.add(hemi);const sky=new T.Color(config.surface.skyColor);
 const night=dayConfig.night,nightFog=new T.Color(night.fog),nightSky=new T.Color(night.sky),nightSun=new T.Color(night.sunColor),warmSun=new T.Color(dayConfig.twilight.sunColor),daySun=new T.Color(profile.sunColor??0xffedcd),dayHemi=hemi.color.clone(),dayGround=hemi.groundColor.clone(),nightHemi=new T.Color(night.hemisphere),nightGround=new T.Color(night.ground);
 const sun=new T.DirectionalLight(profile.sunColor??0xffedcd,profile.sunIntensity??visualConfig.lighting.sunIntensity);sun.position.set(-42,62,-25);sun.target.position.set(0,0,0);scene.add(sun,sun.target);
 sun.castShadow=profile.shadows??!low;sun.shadow.mapSize.set(profile.shadowMapSize??1024,profile.shadowMapSize??1024);Object.assign(sun.shadow.camera,{left:-50,right:50,top:50,bottom:-50,near:1,far:150});sun.shadow.bias=-.0003;sun.shadow.normalBias=.06;sun.shadow.radius=3;
 // A sky dome suggests the bright surface above and blue absorption at depth.
 const dome=new T.Mesh(new T.SphereGeometry(440,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{time:{value:0},shaftIntensity:{value:config.atmosphere.lightShaftIntensity*(low?.6:1)},cycleTint:{value:new T.Vector3(1,1,1)},airBlend:{value:0},depthBlend:{value:0}},vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vDirection;uniform vec3 cycleTint;uniform float time,shaftIntensity,depthBlend,airBlend;void main(){vec3 d=normalize(vDirection);float up=smoothstep(-.25,.9,d.y);vec3 color=mix(vec3(.015,.18,.30),vec3(.06,.58,.69),up);float sun=pow(max(0.,dot(d,normalize(vec3(-.4,.9,-.25)))),25.);color+=vec3(.32,.48,.43)*sun;if(shaftIntensity>.001){float bands=pow(max(0.,sin(atan(d.x,d.z)*13.+sin(d.y*7.+time*.09)*.2)),18.)*smoothstep(.1,.8,d.y);color+=vec3(.45,.78,.8)*bands*shaftIntensity;} color=mix(color,color*vec3(.9,.97,1.02),depthBlend);color=mix(color,mix(vec3(.32,.63,.9),vec3(.08,.38,.8),smoothstep(0.,.65,d.y)),airBlend);gl_FragColor=vec4(color*cycleTint,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')}));dome.renderOrder=-10;scene.add(dome);
 // Reuse the existing surface draw; no reflection pass or screen-space refraction.
 const c=config.surface,caustic=causticTexture();
 const surface=new T.Mesh(new T.PlaneGeometry(worldConfig.size*1.5,worldConfig.size*1.5,low?64:96,low?64:96),new T.ShaderMaterial({side:T.DoubleSide,transparent:true,forceSinglePass:true,depthWrite:false,uniforms:{time:{value:0},pattern:{value:caustic},waveHeight:{value:c.waveHeight},waveScale:{value:c.waveScale},waveSpeed:{value:c.waveSpeed},air:{value:0},cycleTint:{value:new T.Vector3(1,1,1)}},vertexShader:`varying vec2 vUv;varying vec3 vWorld;uniform float time,waveHeight,waveScale,waveSpeed;void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.);world.y+=waveHeight*(sin(world.x*waveScale+time*waveSpeed)+.5*sin(world.z*waveScale*1.3-time*waveSpeed*.8));vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`varying vec2 vUv;varying vec3 vWorld;uniform vec3 cycleTint;uniform float time,air;uniform sampler2D pattern;void main(){vec2 uv=vWorld.xz*.035;uv+=vec2(sin(uv.y*.6+time*.13),cos(uv.x*.5-time*.1))*.13;float a=texture2D(pattern,uv+vec2(time*.009,-time*.007)).r;float distance=length(vWorld-cameraPosition);float horizon=smoothstep(120.,500.,distance);vec3 color=mix(vec3(.04,.28,.44)+a*.035,vec3(.32,.63,.9),horizon);color=mix(vec3(.3,.8,.9),color,air);gl_FragColor=vec4(color*cycleTint,mix(a*.22,.94,air));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));surface.rotation.x=-Math.PI/2;surface.position.y=worldConfig.surface;surface.name='Shared ocean surface';surface.renderOrder=-1;scene.add(surface);
 if(reflection)scene.environmentIntensity=profile.reflectionIntensity??.25;
 const sunRays=new SunRays(scene,low,profile);
 const ambient=new AmbientWater(scene,low),propulsion=new PropulsionWater(scene,low);const inspect=new URLSearchParams(location.search).has('inspect');let output;
 const airSun=new T.Vector3();let lastTime=0;
 const refresh=(sub,camera)=>{const time=lastTime;
  const position=sub.position,eye=camera.position,air=airBlend(eye.y,eye.x,eye.z,time),wet=1-air,depth=Math.max(0,Math.min(1,(worldConfig.surface-eye.y)/config.atmosphere.depthRange));
  scene.fog.color.copy(baseFog).lerp(depthTint,depth*(profile.depthTintStrength??config.atmosphere.depthTintStrength));scene.fog.color.lerp(sky,air);scene.fog.density=config.atmosphere.fogDensity*(1+depth*.08)*wet+c.airFogDensity*air;scene.background.copy(scene.fog.color);sun.intensity=(profile.sunIntensity??visualConfig.lighting.sunIntensity)*(1-depth*.06)*(1-air*.12);hemi.intensity=(profile.hemisphereIntensity??visualConfig.lighting.hemisphereIntensity)*(1+air*.15);
  dome.position.copy(eye);dome.material.uniforms.airBlend.value=air;surface.position.x=eye.x;surface.position.z=eye.z;surface.material.uniforms.air.value=air;dome.material.uniforms.time.value=time;dome.material.uniforms.depthBlend.value=depth;surface.material.uniforms.time.value=time;sun.position.set(position.x-42,78,position.z+40);sun.target.position.set(position.x,0,position.z);sun.target.updateMatrixWorld();causticTime.value=time;
  sunRays.update(time,position,scene.fog.density);sunRays.material.uniforms.intensity.value=(profile.rayIntensity??(low?config.sunRays.lowIntensity:config.sunRays.intensity))*wet;ambient.material.uniforms.opacity.value=config.ambient.opacity*wet;
  const nightAmount=cycle?.night??0,warmth=cycle?.warmth??0;
  scene.fog.color.lerp(nightFog,nightAmount*wet).lerp(nightSky,nightAmount*air);scene.fog.density*=1+nightAmount*(night.fogDensity-1);scene.background.copy(scene.fog.color);sunRays.material.uniforms.fogDensity.value=scene.fog.density;
  sun.color.copy(daySun).lerp(warmSun,warmth).lerp(nightSun,nightAmount);sun.intensity*=gain(nightAmount,night.sun);
  hemi.color.copy(dayHemi).lerp(nightHemi,nightAmount);hemi.groundColor.copy(dayGround).lerp(nightGround,nightAmount);hemi.intensity*=gain(nightAmount,night.ambient)*(1-warmth*.12);
  updateParticleLighting(nightAmount,night.particleTint);
  scene.environmentIntensity=(profile.reflectionIntensity??.25)*gain(nightAmount,night.reflection);causticDaylight.value=gain(nightAmount,night.caustics);
  sunRays.material.uniforms.intensity.value*=gain(nightAmount,night.rays);dome.material.uniforms.shaftIntensity.value=config.atmosphere.lightShaftIntensity*(low?.6:1)*gain(nightAmount,night.rays);
  const cameraDepth=worldConfig.surface-eye.y;
  skyPrepared=cameraDepth<(skyPrepared?oceanSkyConfig.releaseDepth:oceanSkyConfig.prepareDepth);
  skyVisibility.opacity=air;skyVisibility.visible=skyPrepared&&air>0;skyEnvironment.update(time,skyCycle,camera,skyVisibility);
  // Keep legacy underwater illumination fixed; align the air sun with the sky.
  if(air>0){const direction=skyEnvironment.sunDirection;airSun.copy(sun.target.position).addScaledVector(direction,90);sun.position.lerp(airSun,air*(1-nightAmount));}
  const skyTint=dome.material.uniforms.cycleTint.value,waterTint=surface.material.uniforms.cycleTint.value;
  skyTint.set(gain(nightAmount,night.skyTint[0]),gain(nightAmount,night.skyTint[1]),gain(nightAmount,night.skyTint[2]));waterTint.set(gain(nightAmount,night.waterTint[0]),gain(nightAmount,night.waterTint[1]),gain(nightAmount,night.waterTint[2]));
 };
 return {ambient,propulsion,reflection,sunRays,surface,dome,sun,hemi,sky:skyEnvironment,refresh,update(time,dt,sub,vehicle,camera,pixelRatio){lastTime=time;refresh(sub,camera);
  ambient.update(time,camera,pixelRatio);propulsion.waterVisibility=1-surface.material.uniforms.air.value;propulsion.update(dt,time,sub,vehicle,camera,pixelRatio);
  if(inspect){output??=document.body.appendChild(Object.assign(document.createElement('output'),{id:'waterMetrics',hidden:true}));output.dataset.metrics=JSON.stringify({bubbles:propulsion.activeBubbles,reefBubbles:propulsion.activeReefBubbles,flow:propulsion.activeStreaks,ambient:ambient.count,bubbleBudget:propulsion.bubbles.items.length,flowBudget:propulsion.streaks.items.length,quality:low?'low':'high',speed:sub.speed,boost:sub.turbo.active,depth:worldConfig.surface-sub.position.y});}
 }};
}
