import {LetterVisuals} from './LetterVisuals.js';
import {wordHuntConfig} from '../config/wordHuntConfig.js';
import {heightAt} from '../environment/terrainMath.js';
import {crossesPickup} from '../turbo/TurboBoost.js';
import {WordHuntProgress} from './WordHuntProgress.js';
import {WordHuntDisplay} from '../ui/WordHuntDisplay.js';
// Conservative full-height clearance around registered obstacles, including bobbing.
export function safeLetterPoint(point,surfaces,config=wordHuntConfig){
 const nearby=[];
 for(let ring=0;ring<30;ring++)for(let n=0;n<(ring?16:1);n++){
  const angle=n*Math.PI/8,x=point.x+Math.cos(angle)*ring*8,z=point.z+Math.sin(angle)*ring*8,y=Math.max(point.y,heightAt(x,z)+8+config.floatAmplitude);
  if(Math.abs(x)>760||Math.abs(z)>760||y>39)continue;
  surfaces.grid.query(x,z,8,nearby);
  if(nearby.every(s=>Math.hypot(x-s.x,z-s.z)>Math.max(s.rx,s.rz)+8||Math.abs(y-s.y)>s.ry+8))return {x,y,z};
 }
 throw Error(`No reachable Word Hunt location for ${point.id}`);
}
export class WordHunt{
 constructor(scene,surfaces,storage,config=wordHuntConfig){this.scene=scene;this.config=config;this.progress=new WordHuntProgress(config,storage);this.display=new WordHuntDisplay(config);this.time=0;this.visuals=new LetterVisuals(config.visuals);
  this.records=config.letters.map((letter,i)=>{const point=safeLetterPoint(letter,surfaces,config),root=this.visuals.create(letter.letter,i);
   root.position.copy(point);root.rotation.y=i*2.4;root.visible=!this.progress.ids.has(letter.id);if(root.visible)scene.add(root);else this.visuals.release(root);return {id:letter.id,point,root,phase:i*2.4};});
 }
 update(dt,sub){this.time+=dt;const c=this.config;for(const r of this.records){if(this.progress.ids.has(r.id))continue;const v=c.visuals;r.root.position.y=r.point.y+(v.floating.enabled?Math.sin(this.time*Math.PI*2/v.floating.duration+r.phase)*v.floating.amplitude:0);if(v.rotation.enabled)r.root.rotation.y=(r.root.rotation.y+dt*Math.PI*2/v.rotation.duration)%(Math.PI*2);this.visuals.animate(r.root,this.time,r.phase);
   if(crossesPickup(sub.previousPosition,sub.position,r.root.position,c.collectionRadius)&&this.progress.collect(r.id)){this.visuals.release(r.root);this.display.show(this.progress,r.id);}
  }sub.turbo.setInfinite(this.progress.infiniteTurbo);
 }
 reset(){this.progress.reset();for(let i=0;i<this.records.length;i++){const r=this.records[i];if(r.root.userData.letterVisual.disposed){r.root=this.visuals.create(this.config.letters[i].letter,i);r.root.position.copy(r.point);r.root.rotation.y=r.phase;this.scene.add(r.root);}r.root.visible=true;}this.display.reset();}
}
