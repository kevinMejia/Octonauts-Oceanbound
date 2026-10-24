import {pufferfishPose} from './pufferfishMotion.js';
import * as T from 'three';
import {heightAt} from '../environment/terrainMath.js';
import {createAnimalVisual} from './AnimalVisual.js';

// Additive group controller: the original four keep their existing update path.
export async function createAnimalGroup(d,game){
 const group=new T.Group(),shared=new Map(),members=[],points=[];
 for(let i=0;i<d.group.count;i++){
  const visual=await createAnimalVisual(d,{shared,variant:i});
  if(d.visual.source==='glb'){const {prepareVehicleTextures}=await import('../vehicles/VehicleTextures.js');await prepareVehicleTextures(visual,game.renderer);}
  visual.group.scale.multiplyScalar(1+(i%3-1)*.065);group.add(visual.group);
  const columns=Math.min(3,d.group.count),row=Math.floor(i/columns),rows=Math.ceil(d.group.count/columns),inRow=Math.min(columns,d.group.count-row*columns);
  const offset=new T.Vector3((i%columns-(inRow-1)/2)*d.group.spacing, d.id==='jellyfish'?(i%3-1)*1.2:0,(row-(rows-1)/2)*d.group.spacing);
  if(d.id==='hammerhead-shark')offset.z+=(i%2)*5;
  members.push({visual,offset,phase:i*1.17,motion:{}});points.push(new T.Vector3());
 }
 const extent=members.reduce((n,m)=>Math.max(n,Math.hypot(m.offset.x,m.offset.z)),0)+d.behavior.footprint;
 let floor=-Infinity;const nearby=[];
 for(let i=0;i<80;i++){const a=i*Math.PI/40,x=d.position.x+Math.sin(a)*d.behavior.radius,z=d.position.z+Math.cos(a)*d.behavior.radius*.65;
  // Sample both the route and its footprint, including formation spacing.
  for(let k=0;k<9;k++){const angle=k*Math.PI/4,margin=k===8?0:extent;floor=Math.max(floor,heightAt(x+Math.cos(angle)*margin,z+Math.sin(angle)*margin));}
  for(const s of game.interactions.surfaces.grid.query(x,z,extent,nearby))if(s.solid&&s.parkedId===undefined)floor=Math.max(floor,s.y+(s.ry??s.radius??0));
 }
 const centerY=Math.max(d.position.y,floor+d.behavior.clearance+d.behavior.vertical+1.3);
 // All new habitats are authored to leave room below the surface for their models.
 if(centerY+d.behavior.vertical>40.5)throw Error('Marine habitat needs more clearance: '+d.id);
 const visual={group,animate(){},dispose(){for(const m of members)m.visual.dispose();for(const item of shared.values())item.dispose?.();shared.clear();}};
 const record={definition:d,visual,members,points,floor,centerY,elapsed:0};
 game.marineDiscovery.setGroupPositions(d.id,points);return record;
}
export function updateAnimalGroup(r,time,dt,player,force=false){
 const d=r.definition,b=d.behavior,group=r.visual.group,dx=group.position.x-player.x,dz=group.position.z-player.z;r.elapsed+=dt;
 const distance=dx*dx+dz*dz;group.visible=force||distance<240**2;
 if(!force&&distance>110**2&&r.elapsed<.25)return;
 const step=r.elapsed;r.elapsed=0;const phase=time*b.speed,x=d.position.x+Math.sin(phase)*b.radius,z=d.position.z+Math.cos(phase)*b.radius*.65;
 group.position.set(x,r.centerY+Math.sin(phase*2.1)*b.vertical,z);
 const hovering=['hover','drift','peek'].includes(b.style);
 group.rotation.y=hovering?.4+Math.sin(phase)*.3:Math.atan2(Math.cos(phase),-.65*Math.sin(phase));
 group.rotation.z=b.style==='glide'?Math.sin(phase)*.1:0;
 for(let i=0;i<r.members.length;i++){const m=r.members[i],p=m.visual.group,t=time+m.phase;
  if(b.memberMotion==='orbit'){
   const pose=pufferfishPose(time,i,r.members.length,b,m.motion);p.position.set(pose.x,pose.y,pose.z);p.rotation.y=pose.heading;p.rotation.z=pose.bank;
  }else{
   p.position.set(m.offset.x+Math.sin(t*.45)*.2,m.offset.y+Math.sin(t*.7)*.2,m.offset.z+Math.cos(t*.37)*.2);
   p.rotation.y=Math.sin(t*.35)*.06;p.rotation.z=hovering?Math.sin(t*.6)*.035:0;
  }m.visual.animate(t,step);
 }
 group.updateMatrixWorld(true);for(let i=0;i<r.members.length;i++)r.members[i].visual.group.getWorldPosition(r.points[i]);
}
