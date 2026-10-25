import * as T from 'three';
import {ParticlePool,clamp} from './interactionMath.js';
import {bubbleRate,flowRate,stepBubble} from './waterMath.js';
import {waterConfig as config} from '../config/waterConfig.js';
import {worldConfig} from '../config/worldConfig.js';
import {random} from '../environment/terrainMath.js';
export const waterParticleVertexShader=`attribute vec4 bubble;attribute vec3 flowDirection;uniform float pointScale;varying vec4 vBubble;varying float vAngle;
#include <fog_pars_vertex>
void main(){vBubble=bubble;vec4 mvPosition=modelViewMatrix*vec4(position,1.);vec4 clip=projectionMatrix*mvPosition;
gl_Position=clip;gl_PointSize=clamp(bubble.x*2.*pointScale/max(.1,-mvPosition.z),1.,bubble.w>.5?48.:40.);
vec4 endpoint=projectionMatrix*(mvPosition+viewMatrix*vec4(flowDirection*.5,0.));vec2 d=endpoint.xy/max(.01,endpoint.w)-clip.xy/max(.01,clip.w);vAngle=atan(d.y,d.x);
#include <fog_vertex>
}`;
export const waterParticleFragmentShader=`varying vec4 vBubble;varying float vAngle;
#include <fog_pars_fragment>
void main(){vec2 p=gl_PointCoord*2.-1.;float alpha;vec3 color;
if(vBubble.w>.5){vec2 axis=vec2(cos(vAngle),-sin(vAngle));vec2 q=vec2(dot(p,axis),dot(p,vec2(-axis.y,axis.x))*8.);alpha=(1.-smoothstep(.1,1.,length(q)))*vBubble.y;color=vec3(.43,.78,.85);}
else{float r=length(p);if(r>.98)discard;float rim=smoothstep(.5,.85,r)*(1.-smoothstep(.85,.98,r));float shine=exp(-dot(p-vec2(-.32,-.35),p-vec2(-.32,-.35))*38.);float arc=exp(-pow((r-.71)*13.,2.))*max(0.,(-p.x-p.y)*.5);alpha=(.025*(1.-r)+rim*.72+shine*1.05+arc*.36)*vBubble.y;color=mix(vec3(.6,.86,.94),vec3(.88,.98,1.),clamp(shine+arc,.0,1.));}
if(alpha<.002)discard;gl_FragColor=vec4(color,alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`;
export class PropulsionWater{
 constructor(scene,low=false){this.rng=random(5327);this.bubbles=new ParticlePool(low?config.bubbles.lowParticles:config.bubbles.maxParticles);this.streaks=new ParticlePool(low?config.motion.lowStreaks:config.motion.maxStreaks);const capacity=this.bubbles.items.length+this.streaks.items.length;this.geometry=new T.BufferGeometry();this.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage));this.geometry.setAttribute('bubble',new T.BufferAttribute(new Float32Array(capacity*4),4).setUsage(T.DynamicDrawUsage));this.geometry.setAttribute('flowDirection',new T.BufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage));this.geometry.setDrawRange(0,0);this.geometry.boundingSphere=new T.Sphere(new T.Vector3(),config.bubbles.renderDistance);
 this.material=new T.ShaderMaterial({vertexShader:waterParticleVertexShader,fragmentShader:waterParticleFragmentShader,uniforms:{pointScale:{value:500},fogColor:{value:scene.fog.color.clone()},fogDensity:{value:scene.fog.density}},fog:true,transparent:true,depthWrite:false});this.points=new T.Points(this.geometry,this.material);this.points.name='Pooled propulsion bubbles and local flow';this.points.frustumCulled=false;this.points.visible=false;scene.add(this.points);this.point=new T.Vector3();this.emission=0;this.flowEmission=0;this.activeBubbles=0;this.activeStreaks=0;this.activeReefBubbles=0;this.vents=[];this.nearVents=[];this.nextVentCheck=-1;this.low=low;
 }
 setVents(surfaces,decor){const rng=random(62211),points=[...config.vents.positions];for(const r of decor.layout.records){if(!r.kind.startsWith('rock')||(!r.module&&r.scale<.7)||rng()>.55)continue;if(points.some(v=>Math.hypot(v.x-r.x,v.z-r.z)<15))continue;points.push({x:r.x+2,z:r.z+1});}this.vents=config.vents.enabled?points.map((v,i)=>({...v,phase:i*1.7,y:surfaces.ground(v.x,v.z,worldConfig.surface)+.2,emission:0})).filter(v=>v.y<worldConfig.surface-3):[];}

 discoveryBurst(x,y,z){this.celebrationLeft=1.8;for(let i=0;i<(this.low?16:24);i++){const p=this.bubbles.spawn()??this.bubbles.items[i],a=this.rng()*Math.PI*2,r=this.rng()*1.6;Object.assign(p,{x:x+Math.cos(a)*r,y:y+(this.rng()-.5)*1.5,z:z+Math.sin(a)*r,vx:Math.cos(a)*.6,vy:.8+this.rng()*.5,vz:Math.sin(a)*.6,size:.12+this.rng()*.2,vent:false,celebration:true,age:0,life:1.8,seed:this.rng()*100});}}
 update(dt,time,sub,vehicle,camera,pixelRatio,celebrationOnly=false){this.celebrationLeft=Math.max(0,(this.celebrationLeft??0)-dt);const rng=this.rng,turbulence=sub.turbo.active?1.5:1,speed=Math.abs(sub.speed),vx=Math.sin(sub.heading)*sub.speed,vz=Math.cos(sub.heading)*sub.speed;if(!celebrationOnly){vehicle.updateWorldMatrix(true,false);this.emission+=bubbleRate(sub.speed,sub.turbo.active)*(sub.groundController?.config.bubbleIntensity??1)*dt;while(this.emission>=1){this.emission--;const p=this.bubbles.spawn();if(!p)continue;this.point.set((sub.exhaust?.[0]??0)+(rng()-.5)*.3*turbulence,(sub.exhaust?.[1]??-.32)+(rng()-.5)*.2,sub.exhaust?.[2]??-2.55).applyMatrix4(vehicle.matrixWorld);Object.assign(p,{x:this.point.x,y:this.point.y,z:this.point.z,vx:-vx*.12+(rng()-.5)*.3*turbulence,vy:.1+rng()*.2,vz:-vz*.12+(rng()-.5)*.3*turbulence,size:config.bubbles.minSize+rng()**1.5*(config.bubbles.maxSize-config.bubbles.minSize),vent:false,celebration:false,age:0,life:config.bubbles.lifetime*(.75+rng()*.5),seed:rng()*100});}
 if(time>=this.nextVentCheck){this.nextVentCheck=time+.5;this.nearVents=this.vents.filter(v=>Math.hypot(v.x-camera.position.x,v.z-camera.position.z)<config.vents.range).sort((a,b)=>(a.x-camera.position.x)**2+(a.z-camera.position.z)**2-((b.x-camera.position.x)**2+(b.z-camera.position.z)**2)).slice(0,this.low?5:8);}
 for(const v of this.nearVents){v.emission+=config.vents.emissionRate*(.3+.7*Math.max(0,Math.sin(time*config.vents.pulseSpeed+v.phase)))*dt;while(v.emission>=1){v.emission--;const p=this.bubbles.spawn();if(!p)continue;Object.assign(p,{x:v.x+(rng()-.5)*.25,y:v.y,z:v.z+(rng()-.5)*.25,vx:(rng()-.5)*.12,vy:.4,vz:(rng()-.5)*.12,size:.12+rng()*.18,vent:true,celebration:false,age:0,life:config.bubbles.lifetime*(1+rng()*.3),seed:rng()*100});}}
 if(this.streaks.items.length){this.flowEmission+=flowRate(speed)*dt;while(this.flowEmission>=1){this.flowEmission--;const p=this.streaks.spawn();if(!p)continue;const side=(rng()>.5?1:-1)*(2+rng()*3),fore=3+rng()*10;this.point.set(side,(rng()-.5)*5,fore).applyMatrix4(vehicle.matrixWorld);Object.assign(p,{x:this.point.x,y:this.point.y,z:this.point.z,vx:vx/(speed||1),vy:0,vz:vz/(speed||1),size:.35+rng()*.35,age:0,life:config.motion.lifetime,seed:rng()*100});}}
 }
 this.geometry.boundingSphere.center.copy(vehicle.position);let n=0;this.activeBubbles=0;this.activeStreaks=0;this.activeReefBubbles=0;const position=this.geometry.attributes.position,shape=this.geometry.attributes.bubble,direction=this.geometry.attributes.flowDirection;
 for(const p of this.bubbles.items){if(!celebrationOnly||p.celebration)stepBubble(p,dt,time,worldConfig.surface);if(p.life<=0)continue;const distance=Math.hypot(p.x-camera.position.x,p.y-camera.position.y,p.z-camera.position.z);if(distance>config.bubbles.renderDistance){p.life=0;continue;}const age=p.age/p.life,fade=clamp((distance-1)/2)*clamp(p.age/.15)*clamp((1-age)/.25)*clamp((worldConfig.surface-.15-p.y)/.65)*(1-clamp((distance-config.bubbles.renderDistance*.65)/(config.bubbles.renderDistance*.35)));position.setXYZ(n,p.x,p.y,p.z);shape.setXYZW(n,p.size*(p.celebration?1+age*.5:1-age*.2),fade,p.seed,0);direction.setXYZ(n,0,1,0);n++;this.activeBubbles++;if(p.vent)this.activeReefBubbles++;}
 for(const p of this.streaks.items){if(p.life<=0)continue;if(!celebrationOnly){p.age+=dt;if(p.age>=p.life){p.life=0;continue;}p.x+=Math.sin(time*.5+p.seed)*dt*.03;p.y+=dt*.03;}const fade=Math.sin(p.age/p.life*Math.PI)*config.motion.streakIntensity;position.setXYZ(n,p.x,p.y,p.z);shape.setXYZW(n,p.size,fade,p.seed,1);direction.setXYZ(n,p.vx,p.vy,p.vz);n++;this.activeStreaks++;}
 position.needsUpdate=shape.needsUpdate=direction.needsUpdate=true;this.geometry.setDrawRange(0,n);this.points.visible=n>0;this.material.uniforms.pointScale.value=camera.projectionMatrix.elements[5]*innerHeight*pixelRatio/2;
 }
}
