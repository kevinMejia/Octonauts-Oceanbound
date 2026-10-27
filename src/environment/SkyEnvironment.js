import * as T from 'three';
import {skyConfig} from '../config/skyConfig.js';
const vertexShader=`varying vec3 vDirection;
void main(){vDirection=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`;
const fragmentShader=`
varying vec3 vDirection;
uniform vec3 dayZenith,dayHorizon,nightZenith,nightHorizon,twilight,sunColor,moonColor,sunDirection;
uniform float daylight,warmth,time,opacity,brightness,cloudSpeed,cloudCoverage,sunRadius,moonRadius;
uniform float showSun,showMoon,showStars,showClouds;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
 vec3 d=normalize(vDirection);float elevation=max(0.,d.y),up=smoothstep(0.,.85,elevation);
 vec3 horizon=mix(nightHorizon,dayHorizon,daylight),zenith=mix(nightZenith,dayZenith,daylight);
 float facing=pow(max(0.,dot(d,normalize(vec3(sunDirection.x,0.,sunDirection.z)))),3.);
 horizon=mix(horizon,twilight,warmth*(.3+.7*facing));vec3 color=mix(horizon,zenith,up);
 float sunDistance=length(d-sunDirection),moonDistance=length(d+sunDirection);
 float sunDisc=1.-smoothstep(sunRadius*.88,sunRadius,sunDistance);
 float moonDisc=1.-smoothstep(moonRadius*.88,moonRadius,moonDistance);
 color+=sunColor*(sunDisc*2.+.22*exp(-sunDistance*12.))*showSun*daylight;
 float maria=.88+.12*noise(d*180.);color+=moonColor*moonDisc*maria*showMoon*(1.-daylight)*1.3;
 // 3D directional cells avoid a polar seam; rare cells contain one soft star.
 vec3 cell=d*180.,id=floor(cell);float seed=hash(id);
 float star=1.-smoothstep(.045,.14,length(fract(cell)-.5));
 star*=step(.972,seed)*(.5+.5*seed)*(.88+.12*sin(time*.7+seed*80.));
 color+=vec3(.78,.87,1.)*star*showStars*pow(1.-daylight,2.)*smoothstep(0.,.15,d.y);
 // Two bounded noise scales on a direction shell: no horizon singularity or raymarch.
 vec3 p=d*7.+vec3(time*cloudSpeed,0.,time*cloudSpeed*.37);
 float cloud=noise(p)*.72+noise(p*2.13+8.)*.28;
 cloud=smoothstep(1.-cloudCoverage,1.-cloudCoverage+.22,cloud)*smoothstep(.01,.2,d.y)*showClouds;
 vec3 cloudColor=mix(vec3(.12,.18,.3),vec3(.94,.98,1.),daylight);
 cloudColor=mix(cloudColor,twilight,warmth*.35);color=mix(color,cloudColor,cloud*.86);
 gl_FragColor=vec4(color*brightness,opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
// Caller supplies its existing normalized midnight=0 clock and elapsed visual time.
// No clock, water dependency, lighting ownership, textures, or animation loop here.
export class SkyEnvironment{
 constructor(scene,options={}){
  this.config={...skyConfig,...options};const c=this.config,u=this.uniforms={};
  for(const key of ['dayZenith','dayHorizon','nightZenith','nightHorizon','twilight','sunColor','moonColor'])u[key]={value:new T.Color(c[key])};
  for(const key of ['brightness','cloudSpeed','cloudCoverage','sunRadius','moonRadius'])u[key]={value:c[key]};
  for(const key of ['Sun','Moon','Stars','Clouds'])u['show'+key]={value:c[key.toLowerCase()]?1:0};
  Object.assign(u,{sunDirection:{value:new T.Vector3()},daylight:{value:1},warmth:{value:0},time:{value:0},opacity:{value:1}});
  this.sunDirection=u.sunDirection.value;this.phase=null;
  this.mesh=new T.Mesh(new T.SphereGeometry(1,16,8),new T.ShaderMaterial({uniforms:u,vertexShader,fragmentShader,side:T.BackSide,transparent:true,depthWrite:false,depthTest:true}));
  this.mesh.name='Reusable sky';this.mesh.frustumCulled=false;this.mesh.renderOrder=-9;scene.add(this.mesh);
 }
 update(time,cycle,camera,visibility){
  const opacity=visibility?.opacity??1,visible=visibility?.visible??true;
  const u=this.uniforms,mode=cycle.settings?.timeOfDay,target=mode==='day'?.5:mode==='night'?0:cycle.timeOfDay;
  const dt=this.lastTime===undefined?0:Math.max(0,time-this.lastTime);this.lastTime=time;
  if(this.phase===null)this.phase=target;
  else{const delta=((target-this.phase+.5)%1+1)%1-.5;this.phase+=delta*(1-Math.exp(-dt*1.4));}
  const angle=(this.phase-.25)*Math.PI*2;
  this.sunDirection.set(-Math.cos(angle),Math.sin(angle),-.35*Math.sin(angle)).normalize();
  this.mesh.position.copy(camera.position);this.mesh.visible=this.config.enabled&&visible;
  u.time.value=time;u.daylight.value=cycle.daylight;u.warmth.value=4*cycle.daylight*(1-cycle.daylight);u.opacity.value=opacity;
 }
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
