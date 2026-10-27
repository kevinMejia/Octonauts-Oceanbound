import {reefOverpassConfig as c} from '../config/reefOverpassConfig.js';
import {heightAt} from './terrainMath.js';
import {worldConfig} from '../config/worldConfig.js';
import {octopodConfig,insideOctopodClearing} from '../config/octopodConfig.js';
import {wordHuntConfig} from '../config/wordHuntConfig.js';
import {crewConfig} from '../config/crewConfig.js';
import {vehicles} from '../config/vehicleConfig.js';
import {fleetAnchor} from '../vehicles/fleetPlacement.js';
import {marineAnimals} from '../marine/AnimalRegistry.js';
import {pickupLayout} from '../turbo/pickupLayout.js';
import {turboBoostConfig} from '../config/turboConfig.js';
// Leave endpoints and direct objective-to-base corridors undisturbed.
export function overpassExclusions(){return [...wordHuntConfig.letters,...crewConfig.characters.map(v=>({...v.discovery.position,padding:v.discovery.maxPlacementRadius})),...vehicles.flatMap(v=>[fleetAnchor(v,true),fleetAnchor(v,false)]).filter(Boolean),...marineAnimals.map(v=>({...v.position,padding:(v.behavior.radius??0)+(v.group?.count??1)*(v.group?.spacing??0)})),...pickupLayout(turboBoostConfig.pickupCount),octopodConfig.spawn];}
function segmentDistance(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);}
export function reefOverpassLayout(surfaces,ground=heightAt){
 const exclusions=overpassExclusions(),near=[];
 for(let z=c.searchStart;z<=c.searchEnd;z+=c.searchStep)for(let x=c.searchStart;x<=c.searchEnd;x+=c.searchStep){
  if(Math.max(Math.abs(x),Math.abs(z))+c.approach>worldConfig.size/2-worldConfig.boundaryMargin||insideOctopodClearing(x,z,c.approach))continue;
  if(exclusions.some(p=>segmentDistance(x,z,p,octopodConfig.position)<c.approach+(p.padding??12)))continue;
  if(surfaces.grid.query(x,z,c.approach,near).some(p=>p.solid&&Math.abs(p.x-x)<c.footprint+(p.radius??0)&&Math.abs(p.z-z)<18+(p.radius??0)||p.solid&&Math.abs(p.x-x)<12+(p.radius??0)&&Math.abs(p.z-z)<c.approach+(p.radius??0)))continue;
  const heights=[];let safe=true;
  for(let dz=-c.approach;dz<=c.approach;dz+=5)for(let dx=-c.footprint;dx<=c.footprint;dx+=5){const y=ground(x+dx,z+dz);heights.push(y);if(Math.hypot(ground(x+dx+1,z+dz)-y,ground(x+dx,z+dz+1)-y)>c.maxSlope)safe=false;}
  if(!safe||Math.max(...heights)-Math.min(...heights)>c.maxRelief)continue;
  const y=Math.max(...heights),rocks=[];
  // Overlapping, staggered strata form two tapered supports and a lifted crown.
  for(const side of [-1,1])for(let i=0;i<3;i++)rocks.push({x:x+side*(25-i*1.1),y:y+3+i*6,z:z+Math.sin(i*1.8+side)*1.6,rx:10-i*.7,ry:8.5,rz:10-i*.5,angle:side*.1});
  for(let i=-3;i<=3;i++)rocks.push({x:x+i*7,y:y+24+3*(1-(i/3)**2),z:z+Math.sin(i)*1.3,rx:12,ry:3.5+(i%2)*.25,rz:8.8,angle:i*.08});
  // Broad low skirts bury the support edges in the unchanged seabed.
  for(const side of [-1,1])rocks.push({x:x+side*26,y:ground(x+side*26,z)-.8,z,rx:11,ry:2.2,rz:12,angle:0});
  return {x,y,z,rocks:rocks.map(r=>({...r,radius:Math.max(r.rx,r.rz),surface:'rock',solid:true,overpass:true,color:[.43,.47,.5]}))};
 }
 return null; // Never force a formation into an unsafe world layout.
}
