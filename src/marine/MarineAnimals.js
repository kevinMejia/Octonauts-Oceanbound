import {discoveryThumbnail} from '../ui/DiscoveryThumbnail.js';
import {AnimalMovement} from './AnimalMovement.js';
import {movementForAnimal} from '../config/animalMovementConfig.js';
import {createAnimalGroup,updateAnimalGroup} from './AnimalGroups.js';
import * as T from 'three';
import {heightAt} from '../environment/terrainMath.js';
import {createAnimalVisual} from './AnimalVisual.js';

export class MarineAnimals{
 static async create(game){const animals=new MarineAnimals(game);for(const d of game.marineDiscovery.records.values()){
  if(d.group){const record=await createAnimalGroup(d,game);animals.records.push(record);
   const specimen=record.members[0].visual.group;try{animals.thumbnails.set(d.id,d.thumbnailPath??d.visual?.thumbnailPath??animals.thumbnail(specimen,true));}finally{record.visual.group.add(specimen);}
   game.scene.add(record.visual.group);continue;
  }
  const visual=await createAnimalVisual(d);const record={definition:d,visual,elapsed:0,floor:-Infinity};
  // Sample the entire small route once, so clearance never causes sudden jumps.
  const nearby=[];for(let i=0;i<64;i++){const a=i*Math.PI/32,x=d.position.x+Math.sin(a)*d.behavior.radius,z=d.position.z+Math.cos(a)*d.behavior.radius*.65;record.floor=Math.max(record.floor,heightAt(x,z));
   for(const surface of game.interactions.surfaces.grid.query(x,z,d.id==='whale-shark'?11:7,nearby))if(surface.solid&&surface.parkedId===undefined)record.floor=Math.max(record.floor,surface.y+(surface.ry??surface.radius??0));
  }animals.records.push(record);
  // Render the actual visual once with the existing renderer, before placing it.
  try{animals.thumbnails.set(d.id,d.thumbnailPath??d.visual?.thumbnailPath??animals.thumbnail(visual.group));}catch(error){console.warn('Marine thumbnail unavailable',d.id,error);}
  game.scene.add(visual.group);
 }
 for(const r of animals.records){if(r.independent)continue;const config=movementForAnimal(r.definition);if(config){
  config.center.y=Math.min(config.maxY,Math.max(config.center.y,(r.centerY??r.floor+r.definition.behavior.clearance)));
  r.movement=new AnimalMovement(config);
 }}animals.update(0,game.sub.position,true);return animals;}
 constructor(game){this.game=game;this.records=[];this.thumbnails=new Map();this.time=0;}
 thumbnail(group,fit=false,view){return discoveryThumbnail(this.game.renderer,group,view);}
 update(dt,player,force=false){this.time+=dt;
  for(const r of this.records){if(r.independent){updateAnimalGroup(r,this.time,dt,player,force);continue;}if(r.movement){
   const g=r.visual.group,distance=Math.hypot(g.position.x-player.x,g.position.z-player.z);r.elapsed+=dt;g.visible=force||distance<240;
   if(!force&&distance>110&&r.elapsed<.25)continue;
   const step=r.elapsed;r.elapsed=0;const motion=r.movement,c=motion.config;
   motion.update(step,player,{grid:this.game.interactions.surfaces.grid,ground:(x,z)=>{let floor=heightAt(x,z);for(let i=0;i<8;i++){const a=i*Math.PI/4;floor=Math.max(floor,heightAt(x+Math.sin(a)*c.footprint,z+Math.cos(a)*c.footprint));}return floor;}});
   if(r.members)updateAnimalGroup(r,this.time,step,player,true,motion);
   else{g.position.copy(motion.position);g.rotation.set(0,motion.heading,motion.bank);r.visual.animate(this.time,step);this.game.marineDiscovery.setPosition(r.definition.id,g.position);}
   g.visible=force||distance<240;continue;
  }if(r.members){updateAnimalGroup(r,this.time,dt,player,force);continue;}const g=r.visual.group,d=r.definition,b=d.behavior;r.elapsed+=dt;
   const distance=(g.position.x-player.x)**2+(g.position.z-player.z)**2;g.visible=force||distance<240**2;
   if(!force&&distance>110**2&&r.elapsed<.25)continue;
   const step=r.elapsed;r.elapsed=0;const t=this.time*b.speed,phase=d.id==='octopus'?t+Math.sin(t*2)*.08:t;
   const x=d.position.x+Math.sin(phase)*b.radius,z=d.position.z+Math.cos(phase)*b.radius*.65;
   const y=Math.min(39,Math.max(d.position.y,r.floor+b.clearance+b.vertical)+Math.sin(t*2.1)*b.vertical);
   g.position.set(x,y,z);g.rotation.y=Math.atan2(Math.cos(phase),-.65*Math.sin(phase));g.rotation.z=d.id==='giant-manta-ray'?Math.sin(t)*.12:0;g.rotation.x=d.id==='octopus'?Math.sin(this.time*1.6)*.065:0;
   r.visual.animate(this.time,step);this.game.marineDiscovery.setPosition(d.id,g.position);
  }
 }
 dispose(){for(const r of this.records){this.game.scene.remove(r.visual.group);r.visual.dispose();}this.records=[];this.thumbnails.clear();}
}
