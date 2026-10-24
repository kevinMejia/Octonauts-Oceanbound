import {AnimalMovement} from './AnimalMovement.js';
import {movementForAnimal} from '../config/animalMovementConfig.js';
import {groupConfigFor} from '../config/animalGroupConfig.js';
import {createGroupVariation,looseMemberPose,neighborSteering} from './groupVariation.js';
import * as T from 'three';
import {heightAt} from '../environment/terrainMath.js';
import {createAnimalVisual} from './AnimalVisual.js';

// Keep shared visuals and discovery points; vary member motion within this controller.
export async function createAnimalGroup(d,game){
 const group=new T.Group(),shared=new Map(),members=[],points=[],groupConfig=groupConfigFor(d),variation=createGroupVariation(d.id,d.group.count,groupConfig);
 for(let i=0;i<d.group.count;i++){
  const visual=await createAnimalVisual(d,{shared,variant:i});
  if(d.visual.source==='glb'){const {prepareVehicleTextures}=await import('../vehicles/VehicleTextures.js');await prepareVehicleTextures(visual,game.renderer);}
  visual.group.scale.multiplyScalar(1+(i%3-1)*.065);group.add(visual.group);
  const v=variation[i],offset=new T.Vector3(v.offset.x,v.offset.y,v.offset.z);
  members.push({visual,offset,variation:v,phase:v.phase,motion:{},heading:v.heading,steering:{}});points.push(new T.Vector3());
 }
 const extent=members.reduce((n,m)=>Math.max(n,Math.hypot(m.offset.x,m.offset.z)),0)+d.behavior.footprint+groupConfig.driftRadius;
 let floor=-Infinity;const nearby=[];
 for(let i=0;i<80;i++){const a=i*Math.PI/40,x=d.position.x+Math.sin(a)*d.behavior.radius,z=d.position.z+Math.cos(a)*d.behavior.radius*.65;
  // Sample both the route and its footprint, including formation spacing.
  for(let k=0;k<9;k++){const angle=k*Math.PI/4,margin=k===8?0:extent;floor=Math.max(floor,heightAt(x+Math.cos(angle)*margin,z+Math.sin(angle)*margin));}
  for(const s of game.interactions.surfaces.grid.query(x,z,extent,nearby))if(s.solid&&s.parkedId===undefined)floor=Math.max(floor,s.y+(s.ry??s.radius??0));
 }
 const centerY=Math.max(d.position.y,floor+d.behavior.clearance+d.behavior.vertical+Math.max(1.3,groupConfig.spawnHeightVariation+.3));
 // All new habitats are authored to leave room below the surface for their models.
 if(centerY+d.behavior.vertical>40.5)throw Error('Marine habitat needs more clearance: '+d.id);
 const visual={group,animate(){},dispose(){for(const m of members)m.visual.dispose();for(const item of shared.values())item.dispose?.();shared.clear();}};
 const record={definition:d,visual,members,points,floor,centerY,elapsed:0,groupConfig,environment:{grid:game.interactions.surfaces.grid,ground:heightAt},scratch:new T.Vector3()};
 if(groupConfig.independent){
  const base=movementForAnimal(d);if(!base)throw Error('Independent group needs movement settings: '+d.id);
  for(let i=0;i<members.length;i++){
   const m=members[i],v=m.variation,waypoints=base.waypoints.map(w=>[w[0]*v.radius,w[1]*v.radius]);if(v.direction<0)waypoints.reverse();
   const config={...base,center:{...base.center,y:Math.max(centerY+v.offset.y,base.minY)},footprint:d.behavior.footprint,waypoints,cruisingSpeed:base.cruisingSpeed*v.speed,maxSpeed:base.maxSpeed*v.speed,minSpeed:base.minSpeed*v.speed,acceleration:base.acceleration*v.acceleration,turningSpeed:base.turningSpeed*v.turnSpeed,pauseSeconds:base.pauseSeconds*v.pause,pauseInterval:base.pauseInterval*v.pause};
   m.environment={...record.environment,steering:m.steering};
   const swimmer=m.swimmer=new AnimalMovement(config);swimmer.time=v.phase*5;swimmer.cooldown=v.phase; // independent reaction clocks, no simultaneous first escape
   let placed=false;
   for(let attempt=0;attempt<128&&!placed;attempt++){
    const phase=((v.routePhase+attempt*.037)%1)*waypoints.length,index=Math.floor(phase),f=phase-index,a=waypoints[index],b=waypoints[(index+1)%waypoints.length];
    const p=swimmer.position;p.x=base.center.x+a[0]+(b[0]-a[0])*f;p.z=base.center.z+a[1]+(b[1]-a[1])*f;p.y=config.center.y;
    if(members.slice(0,i).some(other=>Math.hypot(p.x-other.swimmer.position.x,p.z-other.swimmer.position.z)<groupConfig.spawnMinSeparation))continue;
    if(!safePosition(record,p,p,config.footprint,config.bodyHeight,config.clearance))continue;
    swimmer.waypoint=(index+1)%waypoints.length;swimmer.heading=Math.atan2(b[0]-a[0],b[1]-a[1])+v.heading;placed=true;
   }
   if(!placed)throw Error('No safe group spawn: '+d.id);
  }
  record.independent=true;record.movement=members[0].swimmer;
 }
 game.marineDiscovery.setGroupPositions(d.id,points);return record;
}
export function updateAnimalGroup(r,time,dt,player,force=false,motion=null){
 const d=r.definition,b=d.behavior,group=r.visual.group,dx=group.position.x-player.x,dz=group.position.z-player.z;r.elapsed+=dt;
 const distance=dx*dx+dz*dz;group.visible=force||distance<240**2;
 if(!force&&distance>110**2&&r.elapsed<.25)return;
 const step=r.elapsed;r.elapsed=0;if(r.independent){updateIndependentGroup(r,time,step,player);return;}const phase=time*b.speed*r.groupConfig.routeSpeedMultiplier,x=d.position.x+Math.sin(phase)*b.radius,z=d.position.z+Math.cos(phase)*b.radius*.65;
 group.position.set(x,r.centerY+Math.sin(phase*2.1)*b.vertical,z);
 const hovering=['hover','drift','peek'].includes(b.style);
 group.rotation.y=hovering?.4+Math.sin(phase)*.3:Math.atan2(Math.cos(phase),-.65*Math.sin(phase));
 group.rotation.z=b.style==='glide'?Math.sin(phase)*.1:0;
 if(motion){group.position.copy(motion.position);group.rotation.set(0,motion.heading,motion.bank);}
 group.updateMatrixWorld(true);
 for(let i=0;i<r.members.length;i++){const m=r.members[i],p=m.visual.group,t=time+m.phase;
  if(r.members.length>1){
   const pose=looseMemberPose(time,m.variation,r.groupConfig,m.motion),old=m.previous??={x:pose.x,y:pose.y,z:pose.z};
   // Keep local movement gradual, including heading changes after a pause.
   const blend=1-Math.exp(-m.variation.acceleration*2*step);
   p.position.set(old.x+(pose.x-old.x)*blend,old.y+(pose.y-old.y)*blend,old.z+(pose.z-old.z)*blend);
   Object.assign(old,p.position);
   const heading=(r.groupConfig.schooling||r.groupConfig.leader)?Math.sin(t*.23)*.1:pose.heading;
   m.heading+=Math.atan2(Math.sin(heading-m.heading),Math.cos(heading-m.heading))*Math.min(1,step*m.variation.turnSpeed);
   p.rotation.y=m.heading;p.rotation.z=hovering?Math.sin(t*.6)*.035:Math.sin(t*.4)*.06;
  }else{
   p.position.set(m.offset.x+Math.sin(t*.45)*.2,m.offset.y+Math.sin(t*.7)*.2,m.offset.z+Math.cos(t*.37)*.2);
   p.rotation.y=Math.sin(t*.35)*.06;p.rotation.z=hovering?Math.sin(t*.6)*.035:0;
  }
  if(r.members.length>1){
   const candidate=group.localToWorld(r.scratch.copy(p.position)),previous=m.worldPrevious??=candidate.clone();
   if(!safePosition(r,previous,candidate,b.footprint,Math.max(1,d.scale),b.clearance)){p.position.copy(group.worldToLocal(r.scratch.copy(previous)));}
   else previous.copy(candidate);
  }
  m.visual.animate(time*m.variation.animationRate+m.phase,step*m.variation.animationRate);
 }
 group.updateMatrixWorld(true);for(let i=0;i<r.members.length;i++)r.members[i].visual.group.getWorldPosition(r.points[i]);
}

// Same solid proxies as the existing swimmer. Conservative horizontal sweep plus vertical bounds.
function safePosition(r,from,to,radius,height,clearance){
 if(to.y<heightAt(to.x,to.z)+clearance||to.y>42-height)return false;
 const near=r.near??=[];
 for(const s of r.environment.grid.query(to.x,to.z,radius+Math.hypot(to.x-from.x,to.z-from.z),near)){
  if(!s.solid||Math.min(from.y,to.y)>s.y+(s.ry??s.radius)+height||Math.max(from.y,to.y)<s.y-(s.ry??s.radius)-height)continue;
  const dx=to.x-from.x,dz=to.z-from.z,n=dx*dx+dz*dz,t=n?Math.max(0,Math.min(1,((s.x-from.x)*dx+(s.z-from.z)*dz)/n)):0;
  if(Math.hypot(from.x+dx*t-s.x,from.z+dz*t-s.z)<Math.max(s.rx??s.radius,s.rz??s.radius)+radius)return false;
 }return true;
}
function updateIndependentGroup(r,time,dt,player){
 const c=r.groupConfig,members=r.members,positions=r.positions??=members.map(m=>({...m.swimmer.position}));let left=dt;
 while(left>1e-8){const step=Math.min(.05,left);left-=step;
  for(let i=0;i<members.length;i++)Object.assign(positions[i],members[i].swimmer.position);
  for(let i=0;i<members.length;i++){
   const m=members[i],motion=m.swimmer,p=motion.position,steering=neighborSteering(i,positions,c,m.steering);
   if(c.leader&&i){steering.x+=(positions[0].x-p.x)*.15;steering.z+=(positions[0].z-p.z)*.15;}
   if(c.schooling)for(const other of members){steering.x+=Math.sin(other.swimmer.heading)*2;steering.z+=Math.cos(other.swimmer.heading)*2;}
   motion.update(step,player,m.environment);
   // Avoid a pair swapping sides in one step. Steering supplies the smooth detour.
   if(members.some((other,j)=>j!==i&&Math.hypot(p.x-other.swimmer.position.x,p.z-other.swimmer.position.z)<c.spawnMinSeparation)){
    Object.assign(p,positions[i]);motion.speed=Math.max(0,motion.speed-motion.config.deceleration*step);
   }
  }
 }
 const group=r.visual.group;group.position.set(r.definition.position.x,r.centerY,r.definition.position.z);group.rotation.set(0,0,0);
 for(const m of members){const motion=m.swimmer,p=m.visual.group;p.position.set(motion.position.x-group.position.x,motion.position.y-group.position.y,motion.position.z-group.position.z);p.rotation.set(0,motion.heading,motion.bank);m.visual.animate(time*m.variation.animationRate+m.phase,dt*m.variation.animationRate);}
 group.updateMatrixWorld(true);for(let i=0;i<members.length;i++)members[i].visual.group.getWorldPosition(r.points[i]);
}
