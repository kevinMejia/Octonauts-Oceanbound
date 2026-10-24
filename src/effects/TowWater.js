import * as T from 'three';
import {ParticlePool,clamp} from './interactionMath.js';
import {waterParticleVertexShader,waterParticleFragmentShader} from './PropulsionWater.js';
import {stepBubble} from './waterMath.js';
import {worldConfig} from '../config/worldConfig.js';
import {towVisualMotion,towWaterRate} from '../rescue/towVisualMath.js';
import {random} from '../environment/terrainMath.js';
// Reuses the water screen-texture shaders, with a small fixed passenger-only pool.
export class TowWater{
 constructor(scene,config,low=false){
  this.config=config;this.low=low;this.pool=new ParticlePool(low?config.lowParticles:config.maxParticles);this.random=random(7319);this.speed=0;this.emission=0;this.serial=0;this.last=new T.Vector3();this.lastValid=false;this.velocity={};
  this.geometry=new T.BufferGeometry();const n=this.pool.items.length;this.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3).setUsage(T.DynamicDrawUsage));this.geometry.setAttribute('bubble',new T.BufferAttribute(new Float32Array(n*4),4).setUsage(T.DynamicDrawUsage));this.geometry.setAttribute('flowDirection',new T.BufferAttribute(new Float32Array(n*3),3).setUsage(T.DynamicDrawUsage));this.geometry.setDrawRange(0,0);
  this.material=new T.ShaderMaterial({vertexShader:waterParticleVertexShader,fragmentShader:waterParticleFragmentShader,uniforms:{pointScale:{value:500},fogColor:{value:scene.fog?.color.clone()??new T.Color('#08789f')},fogDensity:{value:scene.fog?.density??0}},transparent:true,depthWrite:false,fog:!!scene.fog});this.points=new T.Points(this.geometry,this.material);this.points.name='Rescue passenger water trail';this.points.frustumCulled=false;this.points.visible=false;scene.add(this.points);
 }
 update(dt,motion,radius,camera,pixelRatio,time){
  const c=this.config,p=motion.position,v=towVisualMotion(p,motion.previous,dt,this.velocity,c.maxJump),speed=v.speed;
  if(this.lastValid&&this.last.distanceTo(p)>c.maxJump)this.clear();this.last.copy(p);this.lastValid=true;this.speed=speed;
  if(!c.enabled||camera.position.distanceTo(p)>c.renderDistance){this.clear();this.speed=speed;return;}
  const rate=towWaterRate(speed,c,this.low);this.emission=rate?this.emission+rate*dt:0;
  while(this.emission>=1){this.emission--;const particle=this.pool.spawn();if(!particle)continue;const rng=this.random,side=(rng()-.5)*radius*1.2,back=radius*.3+rng()*.4,kind=this.serial++%3===0?1:0;
   Object.assign(particle,{x:p.x-v.x*back+v.z*side,y:p.y+(rng()-.25)*motion.height*.35,z:p.z-v.z*back-v.x*side,vx:-v.x*speed*.08,vy:.15+rng()*.2,vz:-v.z*speed*.08,dx:v.x,dy:v.y,dz:v.z,age:0,life:c.lifetime*(.7+rng()*.6),size:kind?.35+rng()*.25:.08+rng()*.1,seed:rng()*100,kind,vent:false,celebration:false});
  }
  const position=this.geometry.attributes.position,shape=this.geometry.attributes.bubble,direction=this.geometry.attributes.flowDirection;let count=0;
  for(const particle of this.pool.items){if(particle.life<=0)continue;if(particle.kind){particle.age+=dt;if(particle.age>=particle.life){particle.life=0;continue;}particle.x+=particle.vx*dt;particle.y+=(particle.vy*.3)*dt;particle.z+=particle.vz*dt;}else stepBubble(particle,dt,time,worldConfig.surface);
   if(particle.life<=0)continue;const range=Math.hypot(particle.x-camera.position.x,particle.y-camera.position.y,particle.z-camera.position.z);if(range>c.renderDistance){particle.life=0;continue;}
   const alpha=clamp(particle.age/.12)*clamp((particle.life-particle.age)/.25)*clamp((c.renderDistance-range)/10)*c.opacity;position.setXYZ(count,particle.x,particle.y,particle.z);shape.setXYZW(count,particle.size,alpha,particle.seed,particle.kind);direction.setXYZ(count,particle.dx,particle.dy,particle.dz);count++;
  }
  position.needsUpdate=shape.needsUpdate=direction.needsUpdate=true;this.geometry.setDrawRange(0,count);this.points.visible=count>0;this.material.uniforms.pointScale.value=camera.projectionMatrix.elements[5]*innerHeight*pixelRatio/2;
 }
 clear(){for(const particle of this.pool.items)particle.life=0;this.emission=0;this.speed=0;this.lastValid=false;this.points.visible=false;this.geometry.setDrawRange(0,0);}
 dispose(){this.clear();this.points.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
