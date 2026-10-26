import {particleLightTint} from '../environment/particleLighting.js';
import * as T from 'three';
import {ParticlePool,clamp,stepParticle} from './interactionMath.js';
import {stepBubble} from './waterMath.js';
import {waterParticleFragmentShader} from './PropulsionWater.js';
import {sedimentVertexShader,sedimentFragmentShader} from './EnvironmentalInteractions.js';
import {uploadActivePrefix} from '../environment/bufferUpdates.js';
import {heightAt,random} from '../environment/terrainMath.js';
import {worldConfig} from '../config/worldConfig.js';
import {hullFloor} from '../collision/collisionMath.js';
import {vehicleTransformationConfig as config} from '../config/vehicleTransformationConfig.js';

const bubbleFragment=waterParticleFragmentShader.replace('varying vec4 vBubble;','varying vec2 vUv;varying vec4 vBubble;').replace('gl_PointCoord','vUv');
const bubbleVertex=`attribute vec4 bubble;varying vec2 vUv;varying vec4 vBubble;varying float vAngle;
#include <fog_pars_vertex>
void main(){vUv=vec2(uv.x,1.-uv.y);vBubble=bubble;vAngle=0.;vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);mvPosition.xy+=position.xy*bubble.x*2.;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;

export class VehicleTransformation{
 constructor(game){this.game=game;this.active=false;this.elapsed=0;this.rng=random(81291);this.dummy=new T.Object3D();this.cameraDirection=new T.Vector3();this.cameraRight=new T.Vector3();this.cameraUp=new T.Vector3();this.sortClouds=(a,b)=>game.camera.position.distanceToSquared(b)-game.camera.position.distanceToSquared(a);}
 async prepare(next){
  const g=this.game,c=next.definition.collision,old=g.sub.collisionProxy,pose=g.discovery.safeSwitch(next.definition.id,g.sub);
  // Use the normal safe-switch pose; the effect never chooses a different spawn.
  this.origin={x:g.sub.position.x,y:g.sub.position.y+(old.centerY??0),z:g.sub.position.z};this.destination={x:pose.x,y:pose.y+(c.centerY??0),z:pose.z};
  this.radius=Math.max(old.radius,old.halfLength,old.halfHeight,c.radius,c.halfLength,c.halfHeight)*config.padding;
  this.floor=heightAt(this.origin.x,this.origin.z);this.sand=g.sub.position.y-hullFloor(g.sub)<=config.nearFloor;
  if(!this.group)this.create();
  await g.renderer.compileAsync(this.group,g.camera,g.scene);
 }
 create(){
  const g=this.game,low=g.quality==='low';this.bubbles=new ParticlePool(low?config.lowBubbles:config.bubbles);this.clouds=new ParticlePool(low?config.lowClouds:config.clouds);this.group=new T.Group();this.group.name='Pooled vehicle transformation';
  const fog={fogColor:{value:g.scene.fog.color.clone()},fogDensity:{value:g.scene.fog.density}},bubbleGeometry=new T.PlaneGeometry(1,1);bubbleGeometry.setAttribute('bubble',new T.InstancedBufferAttribute(new Float32Array(this.bubbles.items.length*4),4).setUsage(T.DynamicDrawUsage));
  this.bubbleMesh=new T.InstancedMesh(bubbleGeometry,new T.ShaderMaterial({vertexShader:bubbleVertex,fragmentShader:bubbleFragment,uniforms:fog,fog:true,transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true}),this.bubbles.items.length);
  const geometry=new T.PlaneGeometry(1,1);for(const [name,size] of [['cloud',4],['shade',4],['details',2]])geometry.setAttribute(name,new T.InstancedBufferAttribute(new Float32Array(this.clouds.items.length*size),size).setUsage(T.DynamicDrawUsage));
  this.cloudMesh=new T.InstancedMesh(geometry,new T.ShaderMaterial({vertexShader:sedimentVertexShader,fragmentShader:sedimentFragmentShader,uniforms:{...fog,particleLightTint,time:{value:0}},fog:true,transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true}),this.clouds.items.length);
  this.cloudMesh.name='Transformation vapor and seabed sediment';this.bubbleMesh.name='Transformation bubble shells';
  for(const mesh of [this.cloudMesh,this.bubbleMesh]){mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.group.add(mesh);}this.cloudMesh.renderOrder=1;this.bubbleMesh.renderOrder=2;g.scene.add(this.group);
 }
 cover(){
  if(this.active)throw Error('Vehicle transformation already active');const g=this.game;this.active=true;this.elapsed=0;this.covered=false;this.revealing=false;this.started=false;this.release=g.pause.acquire('vehicle-transformation');g.input.clear();
  this.finished=new Promise(resolve=>this.resolveFinished=resolve);this.coverPromise=new Promise(resolve=>this.resolveCover=resolve);return this.coverPromise;
 }
 seed(){
  const rng=this.rng,r=this.radius,from=this.origin,to=this.destination,front=Math.min(r*1.5,this.game.camera.position.distanceTo(from)*.6),dir=this.cameraDirection.copy(this.game.camera.position).sub(from).normalize();
  const right=this.cameraRight.set(1,0,0).applyQuaternion(this.game.camera.quaternion),up=this.cameraUp.set(0,1,0).applyQuaternion(this.game.camera.quaternion);
  for(let i=0;i<this.bubbles.items.length;i++){
   const p=this.bubbles.spawn(),a=rng()*Math.PI*2,d=r*Math.pow(rng(),1.7),center=i%3===0?to:from,depth=front+(rng()-.5)*r*.2;
   Object.assign(p,{x:center.x+dir.x*depth+right.x*Math.cos(a)*d+up.x*Math.sin(a)*d,y:center.y+dir.y*depth+right.y*Math.cos(a)*d+up.y*Math.sin(a)*d,z:center.z+dir.z*depth+right.z*Math.cos(a)*d+up.z*Math.sin(a)*d,vx:Math.cos(a)*config.expansion,vy:config.rise*(.5+rng()),vz:Math.sin(a)*config.expansion,size:r*(.12+rng()**1.4*.3),age:0,life:config.duration,seed:rng()*100});
  }
  for(let i=0;i<this.clouds.items.length;i++){
   const p=this.clouds.spawn(),sand=this.sand&&i%3===0,center=i%2===0?from:to,a=rng()*Math.PI*2,d=rng()*r*(sand?.65:.3);
   // Core vapor is on the camera side of each hull, so the actual swap is covered.
   Object.assign(p,{x:center.x+Math.cos(a)*d+(sand?0:dir.x*front),y:sand?heightAt(center.x+Math.cos(a)*d,center.z+Math.sin(a)*d)+r*.16:center.y+(rng()-.5)*r*.6+dir.y*front,z:center.z+Math.sin(a)*d+(sand?0:dir.z*front),vx:Math.cos(a)*(sand?2:1.3),vy:sand?.35:config.rise*.5,vz:Math.sin(a)*(sand?2:1.3),size:r*(sand?.65:.85),age:0,life:config.duration,seed:rng()*40,angle:rng()*6.28,spin:(rng()-.5)*.5,settled:false,floor:sand?heightAt(center.x+Math.cos(a)*d,center.z+Math.sin(a)*d):-1000,sand,r:sand?.42:.36,g:sand?.32:.69,b:sand?.17:.79});
  }this.started=true;
 }
 reveal(){this.revealing=true;}
 update(dt){
  if(!this.active)return;const g=this.game;
  // Let the existing close animation finish, and respect any other open menu.
  if(document.querySelector('dialog[open]'))return;
  if(!this.started)this.seed();
  if(!this.covered||this.revealing)this.elapsed=Math.min(config.duration,this.elapsed+dt);
  if(this.elapsed>=config.coverSeconds-1e-9&&!this.covered){this.covered=true;this.resolveCover(true);this.resolveCover=null;}
  if(this.elapsed>=config.duration){this.cancel(true);return;}
  const time=this.elapsed,fade=clamp(time/.18)*clamp((config.duration-time)/.75);
  for(const p of this.bubbles.items){stepBubble(p,dt,time,worldConfig.surface);if(p.life>0){p.x+=Math.sin(p.seed+time*5)*config.swirl*dt;p.z+=Math.cos(p.seed+time*5)*config.swirl*dt;}}
  for(const p of this.clouds.items){if(p.sand){stepParticle(p,dt,time,heightAt,true);if(time>.65)p.vy-=dt*.9;}else{p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}}
  this.render(fade,time);g.chase.transitioning=true;g.chase.update(dt,g.sub,g.input);g.rescueNavigation?.update(0,g.rescue?.active,g.sub,g.rescue?.centre);g.needsPausedRender=true;
 }
 render(fade,time){
  let n=0;const bubble=this.bubbleMesh.geometry.attributes.bubble;
  for(const p of this.bubbles.items){if(p.life<=0)continue;this.dummy.position.set(p.x,p.y,p.z);this.dummy.updateMatrix();this.bubbleMesh.setMatrixAt(n,this.dummy.matrix);bubble.setXYZW(n,p.size*(.7+time*.65),fade,p.seed,0);n++;}this.bubbleMesh.count=n;this.bubbleMesh.visible=n>0;uploadActivePrefix(this.bubbleMesh.instanceMatrix,n);uploadActivePrefix(bubble,n);
  this.clouds.items.sort(this.sortClouds);const geo=this.cloudMesh.geometry;let i=0;
  for(const p of this.clouds.items){if(p.life<=0)continue;this.dummy.position.set(p.x,p.y,p.z);this.dummy.updateMatrix();this.cloudMesh.setMatrixAt(i,this.dummy.matrix);geo.attributes.cloud.setXYZW(i,p.size*1.8*(1+time*.8),p.angle,0,0);geo.attributes.shade.setXYZW(i,p.r,p.g,p.b,fade*(p.sand?.85:config.coreOpacity*clamp((config.coreEnd-time)/config.coreFade)**3));geo.attributes.details.setXY(i,p.seed,p.sand?p.floor:-1000);i++;}this.cloudMesh.count=i;this.cloudMesh.visible=i>0;uploadActivePrefix(this.cloudMesh.instanceMatrix,i);for(const name of ['cloud','shade','details'])uploadActivePrefix(geo.attributes[name],i);this.cloudMesh.material.uniforms.time.value=time;
 }
 cancel(success=false){
  if(!this.active)return;this.active=false;for(const pool of [this.bubbles,this.clouds])for(const p of pool.items)p.life=0;for(const mesh of [this.bubbleMesh,this.cloudMesh]){mesh.count=0;mesh.visible=false;}this.game.chase.transitioning=false;this.game.input.clear();this.release?.();this.release=null;this.resolveCover?.(false);this.resolveCover=null;this.resolveFinished?.(success);this.resolveFinished=null;this.game.needsPausedRender=true;
 }
 dispose(){this.cancel();if(!this.group)return;for(const mesh of [this.bubbleMesh,this.cloudMesh]){mesh.geometry.dispose();mesh.material.dispose();}this.group.removeFromParent();this.group=null;}
}
