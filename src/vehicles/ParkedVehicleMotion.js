import {parkedVehicleConfig as config} from '../config/parkedVehicleConfig.js';
import {worldConfig} from '../config/worldConfig.js';
import {hullFloor,hullFrame,sweepHull} from '../collision/collisionMath.js';
import {TrackedGroundController} from './TrackedGroundController.js';

export function parkedMass(definition,collision=definition.collision){return Math.max(config.minimumMass,collision.radius*collision.halfLength*collision.halfHeight/config.volumeUnit)*(definition.type==='ground'?config.groundMassMultiplier:1);}

// Only awake nearby records are integrated. Existing fleet poses and grid proxies
// remain authoritative; no mesh collision, rigid-body engine or saved positions.
export class ParkedVehicleMotion{
 constructor(fleet){this.fleet=fleet;this.moving=new Set();this.time=0;this.pose={};this.frame={};this.playerFrame={};this.hit={};this.proxy={};}
 stop(record){const state=record.pushState;if(state){state.vx=state.vz=state.spin=0;}this.moving.delete(record);}
 push(contact,sub){
  if(!config.enabled||contact.surface!=='parked-gup'||!Number.isFinite(contact.impact)||contact.impact<config.minImpact)return false;
  const r=this.fleet.records.get(contact.parkedId),normal=Math.hypot(contact.nx,contact.nz);
  if(!r?.vehicle||!r.parked||r.evicted||!this.fleet.unlocks.isUnlocked(r.id)||!Number.isFinite(normal)||normal<.2)return false;
  if(Math.hypot(r.pose.x-sub.position.x,r.pose.z-sub.position.z)>config.range)return false;
  const state=r.pushState??= {vx:0,vz:0,spin:0,lastHit:-Infinity,body:{position:{},floorContact:{},collisionProxy:{...r.parkDefinition.collision}},aligner:r.definition.type==='ground'?new TrackedGroundController(r.definition.ground,this.fleet.placement.ground):null};
  if(this.time-state.lastHit<config.hitCooldown)return false;state.lastHit=this.time;state.body.collisionProxy.terrainClearance=r.groundClearance;
  const source=parkedMass(sub.definition??{},sub.collisionProxy),target=parkedMass(r.definition,r.parkDefinition.collision),impulse=contact.impact*normal*config.impulseScale*source/(source+target),dx=-contact.nx/normal*impulse,dz=-contact.nz/normal*impulse;
  state.vx+=dx;state.vz+=dz;const speed=Math.hypot(state.vx,state.vz);if(speed>config.maxSpeed){state.vx*=config.maxSpeed/speed;state.vz*=config.maxSpeed/speed;}
  const rx=(contact.x??r.pose.x)-r.pose.x,rz=(contact.z??r.pose.z)-r.pose.z,c=r.parkDefinition.collision;
  state.spin=Math.max(-config.maxSpin,Math.min(config.maxSpin,state.spin+(rz*dx-rx*dz)*config.turnImpulse/(c.radius*c.radius+c.halfLength*c.halfLength)));
  this.moving.add(r);return true;
 }
 update(dt,sub){
  if(!(dt>0)||!Number.isFinite(dt))return;dt=Math.min(dt,config.maxFrame);this.time+=dt;
  if(!this.moving.size)return;hullFrame(sub,this.playerFrame);
  for(const r of this.moving){
   if(!config.enabled||!r.parked||r.evicted||!this.fleet.unlocks.isUnlocked(r.id)||Math.hypot(r.pose.x-sub.position.x,r.pose.z-sub.position.z)>config.range){this.stop(r);continue;}
   const state=r.pushState,count=Math.ceil(dt/config.step),step=dt/count,decay=Math.exp(-config.drag*step),turnDecay=Math.exp(-config.angularDrag*step);
   for(let i=0;i<count;i++){
    const dx=state.vx*(1-decay)/config.drag,dz=state.vz*(1-decay)/config.drag,turn=state.spin*(1-turnDecay)/config.angularDrag;
    state.vx*=decay;state.vz*=decay;state.spin*=turnDecay;
    const p=r.pose,x=p.x,z=p.z,heading=p.heading;
    if(this.tryPose(r,x+dx,z+dz,heading+turn,sub))continue;
    state.spin=0;
    if(this.tryPose(r,x+dx,z+dz,heading,sub))continue;
    if(dx&&this.tryPose(r,x+dx,z,heading,sub)){state.vz=0;continue;}
    if(dz&&this.tryPose(r,x,z+dz,heading,sub)){state.vx=0;continue;}
    state.vx=state.vz=0;
   }
   if(Math.hypot(state.vx,state.vz)<config.stopSpeed&&Math.abs(state.spin)<config.stopSpin)this.stop(r);
  }
 }
 tryPose(r,x,z,heading,sub){
  const edge=worldConfig.size/2-12;if(Math.abs(x)>edge||Math.abs(z)>edge)return false;
  const state=r.pushState,body=state.body,p=this.pose;Object.assign(body.position,{x,y:0,z});body.heading=heading;body.pitch=body.bank=0;
  if(state.aligner)state.aligner.align(body);const y=(state.aligner?body.position.y:hullFloor(body,x,z,this.fleet.placement.ground))+r.heightLift;
  if(y>worldConfig.surface-body.collisionProxy.surfaceClearance||Math.abs(y-r.pose.y)>config.heightSlack+Math.hypot(x-r.pose.x,z-r.pose.z)*Math.tan(config.maxSlope))return false;
  Object.assign(p,{x,y,z,heading,pitch:body.pitch,bank:body.bank});
  if(!this.fleet.placement.clear(p,r.parkDefinition,r.id,null)||!this.clearsPlayer(r,p,sub))return false;
  this.fleet.setPose(r,p);return true;
 }
 clearsPlayer(r,pose,sub){
  const c=r.parkDefinition.collision,a=sub.collisionProxy;if(Math.hypot(pose.x-sub.position.x,pose.z-sub.position.z)>Math.max(c.radius,c.halfLength)+Math.max(a.radius,a.halfLength)+1)return true;
  hullFrame(pose,this.frame);const f=this.frame,depth=Math.min(c.radius,c.halfLength),length=c.halfLength-depth,ad=Math.min(a.radius,a.halfLength),al=a.halfLength-ad,proxy=this.proxy;
  Object.assign(proxy,{rx:c.radius,ry:c.halfHeight,rz:depth,angle:pose.heading,co:Math.cos(pose.heading),si:Math.sin(pose.heading)});
  for(let i=-1;i<=1;i++){
   if(!length&&i!==0)continue;const centre=c.centerY??0;proxy.x=pose.x+f.zx*length*i+f.yx*centre;proxy.y=pose.y+f.zy*length*i+f.yy*centre;proxy.z=pose.z+f.zz*length*i+f.yz*centre;
   for(let j=-1;j<=1;j++){if(!al&&j!==0)continue;if(sweepHull(sub.position,0,0,0,proxy,this.playerFrame,a.radius,a.halfHeight,al*j,this.hit,a.centerY??0,ad)&&this.hit.depth>config.overlapTolerance)return false;}
  }return true;
 }
}
