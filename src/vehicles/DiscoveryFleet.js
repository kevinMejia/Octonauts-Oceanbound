import {fleetAnchor,FleetPlacement} from './fleetPlacement.js';
import {hullFrame,sweepHull} from '../collision/collisionMath.js';

// Each cache entry is either piloted or parked: the same group, never a clone.
export class DiscoveryFleet{
 constructor({registry,fleet,unlocks,surfaces,scene,onDiscover,blocked=()=>false,release=()=>{},prepare=async()=>{}}){
  Object.assign(this,{registry,fleet,unlocks,surfaces,scene,onDiscover,blocked,release,prepare});this.records=new Map();this.near=[];this.frame={};this.hit={};this.activeDiscovery=null;this.placement=new FleetPlacement(surfaces.grid);this.loading=false;
  for(const definition of registry){
   if(!definition.parking&&!definition.discovery?.enabled)continue;
   const scale=definition.parking?.modelScale??definition.discovery?.modelScale??1,collision=definition.discovery?.collision??definition.collision,parkDefinition={...definition,collision:Object.fromEntries(Object.entries(collision).map(([key,value])=>[key,typeof value==='number'?value*scale:value]))};
   const record={definition,parkDefinition,scale,id:definition.id,vehicle:null,pending:false,lastAttempt:-Infinity,proxies:[],parked:false};this.records.set(record.id,record);
   this.positionRecord(record,false);
  }
  this.unsubscribe=unlocks.subscribe(()=>this.sync());
 }
 async initialize(){for(const r of this.records.values())if(this.fleet.cache.has(r.id))await this.ensure(r);this.sync();}
 poseFor(record){return fleetAnchor(record.definition,this.unlocks.isUnlocked(record.id));}
 positionRecord(record,moveModel=true){
  const d=record.definition,anchor=this.poseFor(record);if(!anchor)return;anchor.groundClearance*=record.scale;
  const pose=this.placement.find(anchor,record.parkDefinition,{parking:true,ignoreId:record.id,returningId:'*',maxRadius:32});
  if(!pose&&record.pose)return;if(!pose)throw new Error('No clear parking position for '+d.name);
  record.pose=pose;
  const c=record.parkDefinition.collision,depth=Math.min(c.radius,c.halfLength),l=Math.max(0,c.halfLength-depth);
  hullFrame(pose,this.frame);const f=this.frame,center=c.centerY??0;
  for(let i=-1;i<=1;i++){
   let p=record.proxies[i+1];
   const x=pose.x+f.zx*l*i+f.yx*center,y=pose.y+f.zy*l*i+f.yy*center,z=pose.z+f.zz*l*i+f.yz*center;
   if(!p){p={x,y,z,rx:c.radius,ry:c.halfHeight,rz:depth,angle:pose.heading,parkedId:d.id,surface:'parked-gup',solid:false,triggerEnabled:false,loadCandidate:i===0};record.proxies.push(p);this.surfaces.add(p);}
   else{p.x=x;p.y=y;p.z=z;p.angle=pose.heading;p.co=Math.cos(p.angle);p.si=Math.sin(p.angle);this.surfaces.grid.move(p);}
  }
  if(moveModel&&record.vehicle&&record.parked)this.park(record);
 }
 setSolid(p,enabled){if(p.solid!==enabled){p.solid=enabled;this.surfaces.solidCount+=enabled?1:-1;}}
 park(record){const group=record.vehicle.group,p=record.pose;group.position.set(p.x,p.y,p.z);group.rotation.set(p.pitch??0,p.heading,p.bank??0,'YXZ');group.scale.copy(record.baseScale).multiplyScalar(record.scale);group.visible=(record.distanceVisible??true)&&!record.evicted;this.scene.add(group);}
 sync(activeId=this.fleet.activeId){
  for(const r of this.records.values()){
   r.parked=r.id!==activeId;
   const desired=this.poseFor(r);if(desired&&r.anchorUnlocked!==this.unlocks.isUnlocked(r.id)){this.positionRecord(r,false);r.anchorUnlocked=this.unlocks.isUnlocked(r.id);}
   if(r.vehicle){if(r.parked)this.park(r);else {r.vehicle.group.scale.copy(r.baseScale);r.vehicle.group.visible=true;r.evicted=false;}}
   for(const p of r.proxies){this.setSolid(p,!!r.vehicle&&r.parked);p.triggerEnabled=!!r.vehicle&&r.parked&&!this.unlocks.isUnlocked(r.id)&&r.definition.discovery?.enabled===true;p.loadCandidate=!r.vehicle&&p===r.proxies[1];}
  }
 }
 async ensure(record){
  if(record.vehicle||record.pending)return;record.pending=true;record.lastAttempt=performance.now();
  try{const vehicle=await this.fleet.get(record.id);await this.prepare(vehicle);if(!record.vehicle){record.vehicle=vehicle;record.baseScale=vehicle.group.scale.clone();}this.sync();}
  catch(error){console.warn('Parked GUP unavailable:',record.id,error);}
  finally{record.pending=false;}
 }
 update(sub){
  const now=performance.now();if(!this.visibilityAt||now-this.visibilityAt>500){this.visibilityAt=now;for(const r of this.records.values())if(r.vehicle){
   const visible=!r.parked||Math.hypot(sub.position.x-r.pose.x,sub.position.z-r.pose.z)<160;r.distanceVisible=visible;
   if(!visible){r.vehicle.group.visible=false;if(!r.evicted){this.release(r.vehicle);r.evicted=true;}}
   else if(r.evicted){this.restoreVisible(r);}else r.vehicle.group.visible=true;
  }}
  if(this.blocked()||this.activeDiscovery)return false;
  if(!this.loading&&now>=(this.loadCheckAt??0)){this.loadCheckAt=now+500;this.surfaces.grid.query(sub.position.x,sub.position.z,95,this.near,'fleet-load');
   for(const p of this.near){const r=this.records.get(p.parkedId);if(r&&!r.pending&&now-r.lastAttempt>5000){this.loading=true;this.ensure(r).finally(()=>{this.loading=false;});break;}}
  }
  this.surfaces.grid.query(sub.position.x,sub.position.z,Math.max(sub.collisionProxy.halfLength,sub.collisionProxy.radius)+1+Math.hypot(sub.position.x-sub.previousPosition.x,sub.position.z-sub.previousPosition.z),this.near,'discovery');
  hullFrame(sub,this.frame);const dx=sub.position.x-sub.previousPosition.x,dy=sub.position.y-sub.previousPosition.y,dz=sub.position.z-sub.previousPosition.z,c=sub.collisionProxy,depth=Math.min(c.radius,c.halfLength),l=Math.max(0,c.halfLength-depth);
  for(const p of this.near){const r=this.records.get(p.parkedId);if(!r||this.unlocks.isUnlocked(r.id))continue;const padding=r.definition.discovery.triggerPadding??.3;
   for(let i=-1;i<=1;i++)if(sweepHull(sub.previousPosition,dx,dy,dz,p,this.frame,c.radius+padding,c.halfHeight+padding,l*i,this.hit,c.centerY??0,depth+padding)){
    const location={...r.pose};this.activeDiscovery=r.id;this.unlocks.unlock(r.id);this.onDiscover(r.definition,location);return true;
   }
  }return false;
 }
 prepared(vehicle){
  const record=this.records.get(vehicle.definition.id);if(!record)return;
  if(!record.vehicle){record.vehicle=vehicle;record.baseScale=vehicle.group.scale.clone();record.distanceVisible=false;}
  record.evicted=false;this.sync();
 }
 restoreVisible(record){
  if(record.restoring)return;record.restoring=true;
  this.prepare(record.vehicle).then(()=>{record.evicted=false;record.vehicle.group.visible=record.distanceVisible||!record.parked;}).catch(error=>console.warn('Parked GUP graphics unavailable:',record.id,error)).finally(()=>{record.restoring=false;});
 }
 safeSwitch(id,sub){
  const definition=this.registry.find(v=>v.id===id),origin={...sub.position,heading:sub.heading};
  const pose=this.placement.find(origin,definition,{ignoreId:id,returningId:this.fleet.activeId});
  if(!pose)throw new Error('No clear nearby water. Move away from the reef and try again.');return pose;
 }
 switched(id){this.sync(id);}
 finishDiscovery(){this.activeDiscovery=null;}
 snapshot(){return {active:this.fleet.activeId,unlocked:[...this.unlocks.ids],parked:[...this.records.values()].map(r=>({id:r.id,loaded:!!r.vehicle,parked:r.parked,position:r.pose,trigger:r.proxies.some(p=>p.triggerEnabled)}))};}
}
