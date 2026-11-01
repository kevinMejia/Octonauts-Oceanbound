import {random} from '../environment/terrainMath.js';
import {dolphinRescueConfig as defaults} from '../config/dolphinRescueConfig.js';
// Bounds come from the actual loaded free-roam meshes, already in world units.
// Separate RNG leaves the authored litter banks and gameplay seed sequence intact.
export function dolphinSceneryLayout(bounds,quality='low',config=defaults){
 const e=config.environment,c=e.scenery,r=config.route,rng=random(config.seed+91),records=[];
 const place=(kind,x,z,height,radius,solid=false)=>{
  const b=bounds.get(kind);if(!b)return;
  const scale=Math.min(height/Math.max(.01,b.maxY-b.minY),radius/Math.max(.01,b.radius));
  const y=-b.minY*scale-.08,top=y+b.maxY*scale;
  records.push({kind,x,y,z,scale,angle:rng()*Math.PI*2,top,radius:b.radius*scale,solid});
 };
 let chunk=0;
 for(let z=r.startZ-90;z<r.startZ+r.length+70;z+=e.chunkLength,chunk++){
  for(let i=0;i<c.perChunk[quality];i++){
   const kind=c.kinds[i%c.kinds.length],side=i%2?1:-1;
   place(kind,side*(c.edgeMin+rng()*(c.edgeMax-c.edgeMin)),z+rng()*e.chunkLength,1.1+rng()*(c.maxHeight-1.1),1+rng()*1.6);
  }
  // Sparse low rocks project into the outer lane, well below the dolphin envelope.
  if(chunk%c.rockEvery===1)place('rock0',(chunk%2?1:-1)*c.rockX,z+e.chunkLength*.5,c.rockHeight,c.rockRadius,true);
 }
 return records;
}
