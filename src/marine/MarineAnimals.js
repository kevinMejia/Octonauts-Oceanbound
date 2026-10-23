import * as T from 'three';
import {heightAt} from '../environment/terrainMath.js';
import {createAnimalVisual} from './AnimalVisual.js';

export class MarineAnimals{
 static async create(game){const animals=new MarineAnimals(game);for(const d of game.marineDiscovery.records.values()){
  const visual=await createAnimalVisual(d);const record={definition:d,visual,elapsed:0,floor:-Infinity};
  // Sample the entire small route once, so clearance never causes sudden jumps.
  const nearby=[];for(let i=0;i<64;i++){const a=i*Math.PI/32,x=d.position.x+Math.sin(a)*d.behavior.radius,z=d.position.z+Math.cos(a)*d.behavior.radius*.65;record.floor=Math.max(record.floor,heightAt(x,z));
   for(const surface of game.interactions.surfaces.grid.query(x,z,d.id==='whale-shark'?11:7,nearby))if(surface.solid&&surface.parkedId===undefined)record.floor=Math.max(record.floor,surface.y+(surface.ry??surface.radius??0));
  }animals.records.push(record);
  // Render the actual visual once with the existing renderer, before placing it.
  try{animals.thumbnails.set(d.id,d.thumbnailPath??d.visual?.thumbnailPath??animals.thumbnail(visual.group));}catch(error){console.warn('Marine thumbnail unavailable',d.id,error);}
  game.scene.add(visual.group);
 }animals.update(0,game.sub.position,true);return animals;}
 constructor(game){this.game=game;this.records=[];this.thumbnails=new Map();this.time=0;}
 thumbnail(group){
  const renderer=this.game.renderer,scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,200);
  scene.add(group,new T.HemisphereLight(0xd5faff,0x51677a,2));const key=new T.DirectionalLight(0xffffff,2.5);key.position.set(5,8,10);scene.add(key);
  const box=new T.Box3().setFromObject(group),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),distance=size.length()*1.05;
  camera.position.copy(center).add(new T.Vector3(distance*.8,distance*.4,distance));camera.lookAt(center);
  const target=new T.WebGLRenderTarget(256,256),previous=renderer.getRenderTarget(),alpha=renderer.getClearAlpha(),color=renderer.getClearColor(new T.Color());
  try{renderer.setRenderTarget(target);renderer.setClearColor(0x000000,0);renderer.render(scene,camera);
   const pixels=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(target,0,0,256,256,pixels);
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const context=canvas.getContext('2d'),data=context.createImageData(256,256);
   for(let y=0;y<256;y++)data.data.set(pixels.subarray((255-y)*1024,(256-y)*1024),y*1024);context.putImageData(data,0,0);return canvas.toDataURL('image/png');
  }finally{renderer.setRenderTarget(previous);renderer.setClearColor(color,alpha);target.dispose();scene.remove(group);}
 }
 update(dt,player,force=false){this.time+=dt;
  for(const r of this.records){const g=r.visual.group,d=r.definition,b=d.behavior;r.elapsed+=dt;
   const distance=(g.position.x-player.x)**2+(g.position.z-player.z)**2;g.visible=force||distance<240**2;
   if(!force&&distance>110**2&&r.elapsed<.25)continue;
   const step=r.elapsed;r.elapsed=0;const t=this.time*b.speed,phase=d.id==='octopus'?t+Math.sin(t*2)*.45:t;
   const x=d.position.x+Math.sin(phase)*b.radius,z=d.position.z+Math.cos(phase)*b.radius*.65;
   const y=Math.min(39,Math.max(d.position.y,r.floor+b.clearance+b.vertical)+Math.sin(t*2.1)*b.vertical);
   g.position.set(x,y,z);g.rotation.y=Math.atan2(Math.cos(phase),-.65*Math.sin(phase));g.rotation.z=d.id==='giant-manta-ray'?Math.sin(t)*.12:0;
   r.visual.animate(this.time,step);this.game.marineDiscovery.setPosition(d.id,g.position);
  }
 }
 dispose(){for(const r of this.records){this.game.scene.remove(r.visual.group);r.visual.dispose();}this.records=[];this.thumbnails.clear();}
}
