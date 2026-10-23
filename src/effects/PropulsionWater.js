import * as T from 'three';
import {ParticlePool,clamp} from './interactionMath.js';
import {bubbleRate,flowRate,stepBubble} from './waterMath.js';
import {waterConfig as config} from '../config/waterConfig.js';
import {worldConfig} from '../config/worldConfig.js';
import {random} from '../environment/terrainMath.js';
const vertex=`attribute vec4 bubble;attribute vec3 flowDirection;uniform float pointScale;varying vec4 vBubble;varying float vAngle;
#include <fog_pars_vertex>
void main(){vBubble=bubble;vec4 mvPosition=modelViewMatrix*vec4(position,1.);vec4 clip=projectionMatrix*mvPosition;
gl_Position=clip;gl_PointSize=clamp(bubble.x*2.*pointScale/max(.1,-mvPosition.z),1.,64.);
vec4 endpoint=projectionMatrix*(mvPosition+viewMatrix*vec4(flowDirection*.5,0.));vec2 d=endpoint.xy/max(.01,endpoint.w)-clip.xy/max(.01,clip.w);vAngle=atan(d.y,d.x);
#include <fog_vertex>
}`;
const fragment=`varying vec4 vBubble;varying float vAngle;
#include <fog_pars_fragment>
void main(){vec2 p=gl_PointCoord*2.-1.;float alpha;vec3 color;
if(vBubble.w>.5){vec2 axis=vec2(cos(vAngle),-sin(vAngle));vec2 q=vec2(dot(p,axis),dot(p,vec2(-axis.y,axis.x))*8.);alpha=(1.-smoothstep(.1,1.,length(q)))*vBubble.y;color=vec3(.43,.78,.85);}
else{float r=length(p);if(r>.98)discard;float rim=smoothstep(.5,.85,r)*(1.-smoothstep(.85,.98,r));float shine=exp(-dot(p-vec2(-.32,-.35),p-vec2(-.32,-.35))*38.);float arc=exp(-pow((r-.71)*13.,2.))*max(0.,(-p.x-p.y)*.5);alpha=(.025*(1.-r)+rim*.3+shine*.8+arc*.22)*vBubble.y;color=mix(vec3(.38,.77,.87),vec3(.88,.98,1.),clamp(shine+arc,.0,1.));}
if(alpha<.002)discard;gl_FragColor=vec4(color,alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`;
export class PropulsionWater{
 constructor(scene,low=false){this.rng=random(5327);this.bubbles=new ParticlePool(low?config.bubbles.lowParticles:config.bubbles.maxParticles);this.streaks=new ParticlePool(low?config.motion.lowStreaks:config.motion.maxStreaks);const capacity=this.bubbles.items.length+this.streaks.items.length;this.geometry=new T.BufferGeometry();this.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage));this.geometry.setAttribute('bubble',new T.BufferAttribute(new Float32Array(capacity*4),4).setUsage(T.DynamicDrawUsage));this.geometry.setAttribute('flowDirection',new T.BufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage));this.geometry.setDrawRange(0,0);
 this.material=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{pointScale:{value:500},fogColor:{value:scene.fog.color.clone()},fogDensity:{value:scene.fog.density}},fog:true,transparent:true,depthWrite:false});this.points=new T.Points(this.geometry,this.material);this.points.name='Pooled propulsion bubbles and local flow';this.points.frustumCulled=false;this.points.visible=false;scene.add(this.points);this.point=new T.Vector3();this.emission=0;this.flowEmission=0;this.activeBubbles=0;this.activeStreaks=0;
 }
 update(dt,time,sub,vehicle,camera,pixelRatio){const rng=this.rng,turbulence=sub.turbo.active?1.5:1,speed=Math.abs(sub.speed),vx=Math.sin(sub.heading)*sub.speed,vz=Math.cos(sub.heading)*sub.speed;vehicle.updateWorldMatrix(true,false);this.emission+=bubbleRate(sub.speed,sub.turbo.active)*dt;while(this.emission>=1){this.emission--;const p=this.bubbles.spawn();if(!p)continue;this.point.set((rng()-.5)*.3*turbulence,-.32+(rng()-.5)*.2,-2.55).applyMatrix4(vehicle.matrixWorld);Object.assign(p,{x:this.point.x,y:this.point.y,z:this.point.z,vx:-vx*.12+(rng()-.5)*.3*turbulence,vy:.1+rng()*.2,vz:-vz*.12+(rng()-.5)*.3*turbulence,size:config.bubbles.minSize+rng()**1.5*(config.bubbles.maxSize-config.bubbles.minSize),age:0,life:config.bubbles.lifetime*(.75+rng()*.5),seed:rng()*100});}
 if(this.streaks.items.length){this.flowEmission+=flowRate(speed)*dt;while(this.flowEmission>=1){this.flowEmission--;const p=this.streaks.spawn();if(!p)continue;const side=(rng()>.5?1:-1)*(2+rng()*3),fore=3+rng()*10;this.point.set(side,(rng()-.5)*5,fore).applyMatrix4(vehicle.matrixWorld);Object.assign(p,{x:this.point.x,y:this.point.y,z:this.point.z,vx:vx/(speed||1),vy:0,vz:vz/(speed||1),size:.35+rng()*.35,age:0,life:config.motion.lifetime,seed:rng()*100});}}
 let n=0;this.activeBubbles=0;this.activeStreaks=0;const position=this.geometry.attributes.position,shape=this.geometry.attributes.bubble,direction=this.geometry.attributes.flowDirection;
 for(const p of this.bubbles.items){stepBubble(p,dt,time,worldConfig.surface);if(p.life<=0)continue;const distance=Math.hypot(p.x-camera.position.x,p.y-camera.position.y,p.z-camera.position.z);if(distance>config.bubbles.renderDistance){p.life=0;continue;}const age=p.age/p.life,fade=clamp(p.age/.15)*clamp((1-age)/.25)*clamp((worldConfig.surface-.15-p.y)/.65)*(1-clamp((distance-config.bubbles.renderDistance*.65)/(config.bubbles.renderDistance*.35)));position.setXYZ(n,p.x,p.y,p.z);shape.setXYZW(n,p.size*(1-age*.2),fade,p.seed,0);direction.setXYZ(n,0,1,0);n++;this.activeBubbles++;}
 for(const p of this.streaks.items){if(p.life<=0)continue;p.age+=dt;if(p.age>=p.life){p.life=0;continue;}p.x+=Math.sin(time*.5+p.seed)*dt*.03;p.y+=dt*.03;const fade=Math.sin(p.age/p.life*Math.PI)*config.motion.streakIntensity;position.setXYZ(n,p.x,p.y,p.z);shape.setXYZW(n,p.size,fade,p.seed,1);direction.setXYZ(n,p.vx,p.vy,p.vz);n++;this.activeStreaks++;}
 position.needsUpdate=shape.needsUpdate=direction.needsUpdate=true;this.geometry.setDrawRange(0,n);this.points.visible=n>0;this.material.uniforms.pointScale.value=camera.projectionMatrix.elements[5]*innerHeight*pixelRatio/2;
 }
}
